import { NextRequest } from "next/server";
import { buildAgenticSystemPrompt, type VibeCodeFile, type ChatLanguage, type ChatRoleId, type UserLevelId } from "@/lib/vibe-code";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sandboxManager } from "@/lib/sandbox/e2b-manager";
import { loadEnv } from "@/lib/load-env";
loadEnv();

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_AGENT_TURNS = 25;

// Token budget — conservative estimates
const MAX_INPUT_TOKENS = 150_000;
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ── Tool definitions for Anthropic API ──

const TOOLS = [
  {
    name: "read_file",
    description: "Read the full contents of a file. Returns the file content as text. Use this BEFORE editing to understand the current state.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string" as const, description: "File path relative to project root, e.g. 'app/page.tsx'" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create a new file or completely overwrite an existing file. You MUST provide the COMPLETE file content — partial content will corrupt the file. Use edit_file instead for small changes to existing files.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string" as const, description: "File path relative to project root" },
        content: { type: "string" as const, description: "The COMPLETE file content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description: "Edit a file by finding and replacing an exact string. The old_string must appear EXACTLY ONCE in the file (including whitespace and indentation). If it matches 0 or 2+ times, the edit fails. Use read_file first to get the exact current content. For large changes, prefer write_file with complete content.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string" as const, description: "File path relative to project root" },
        old_string: { type: "string" as const, description: "Exact string to find — must match uniquely (include enough context lines)" },
        new_string: { type: "string" as const, description: "Replacement string" },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "run_command",
    description: "Run a shell command in the project's E2B sandbox. The sandbox has Node.js, npm, and standard Unix tools. Use for: installing packages (npm install), type checking (npx tsc --noEmit), building (npm run build), or any other verification. Output is streamed live to the user.",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string" as const, description: "Shell command to execute, e.g. 'npm run build' or 'npx tsc --noEmit'" },
      },
      required: ["command"],
    },
  },
  {
    name: "search_files",
    description: "Search for a text pattern (string or regex) across all project files. Returns matching lines with file paths and line numbers. Useful to find where something is defined or used.",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string" as const, description: "Search string or regex pattern" },
        file_glob: { type: "string" as const, description: "Optional glob to filter files, e.g. '*.tsx' or '*.css'" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory. Non-recursive by default. Use to explore the project structure.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string" as const, description: "Directory path relative to project root (default: '.')" },
        recursive: { type: "boolean" as const, description: "If true, list all files recursively including subdirectories" },
      },
      required: [],
    },
  },
  {
    name: "start_sandbox",
    description: "Start or restart the E2B sandbox with all current project files. This writes all files to the sandbox, runs 'npm install', and starts the dev server. Use this BEFORE run_command if the sandbox is not running. Returns the preview URL on success.",
    input_schema: {
      type: "object" as const,
      properties: {
        install: { type: "boolean" as const, description: "Whether to run npm install (default: true)" },
        start_dev: { type: "boolean" as const, description: "Whether to start the dev server (default: true)" },
      },
      required: [],
    },
  },
];

// ── Types ──

interface FileState {
  path: string;
  content: string;
  language: string;
}

interface ImageBlock {
  data: string;
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
}

interface RequestMessage {
  role: "user" | "assistant";
  content: string;
  images?: ImageBlock[];
}

interface RequestBody {
  messages: RequestMessage[];
  currentFiles?: VibeCodeFile[];
  projectId?: string;
  model?: string;
  language?: string;
  roles?: string[];
  userLevel?: string;
}

interface AnthropicContentBlock {
  type: "text" | "tool_use";
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  text?: string;
}

interface AnthropicMessage {
  id: string;
  role: "assistant";
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | null;
}

// ── SSE helper ──

function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Context compression ──
// Compress old assistant messages to save tokens: replace tool_use content blocks
// with short summaries. Keep only last 2 turns uncompressed.

function compressConversation(
  messages: Array<{ role: string; content: unknown }>,
  systemTokens: number,
): Array<{ role: string; content: unknown }> {
  const budget = MAX_INPUT_TOKENS - systemTokens;

  // Estimate current token usage
  let totalTokens = 0;
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      totalTokens += estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block && typeof block === "object") {
          if ("text" in block && typeof block.text === "string") {
            totalTokens += estimateTokens(block.text);
          } else if ("input" in block && block.input) {
            // tool_use block — estimate based on JSON size
            totalTokens += estimateTokens(JSON.stringify(block.input));
          } else if ("content" in block && typeof block.content === "string") {
            // tool_result block
            totalTokens += estimateTokens(block.content);
          }
        }
      }
    }
  }

  if (totalTokens <= budget) return messages;

  // Compress: keep last 4 messages (2 turns) intact, compress older ones
  const keepIntact = 4;
  const compressed = messages.map((msg, idx) => {
    if (idx >= messages.length - keepIntact) return msg; // keep recent

    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      // Compress assistant messages: summarize tool_use blocks, truncate text
      const compressedBlocks = (msg.content as AnthropicContentBlock[]).map(block => {
        if (block.type === "tool_use") {
          const input = block.input ?? {};
          const path = input.path as string | undefined;
          const summary = path ? `${block.name}: ${path}` : block.name ?? "tool";
          return { type: "text" as const, text: `[Tool: ${summary}]` };
        }
        if (block.type === "text" && block.text && block.text.length > 200) {
          return { type: "text" as const, text: block.text.slice(0, 200) + "…" };
        }
        return block;
      });
      return { ...msg, content: compressedBlocks };
    }

    if (msg.role === "user" && Array.isArray(msg.content)) {
      // Compress tool_result blocks: truncate long results
      const compressedResults = (msg.content as Array<Record<string, unknown>>).map(block => {
        if (block.type === "tool_result" && typeof block.content === "string") {
          const content = block.content as string;
          if (content.length > 500) {
            return { ...block, content: content.slice(0, 300) + "\n...(compressed)" };
          }
        }
        return block;
      });
      return { ...msg, content: compressedResults };
    }

    return msg;
  });

  // If still over budget, drop oldest messages
  let newTotal = 0;
  for (const msg of compressed) {
    if (typeof msg.content === "string") newTotal += estimateTokens(msg.content);
    else newTotal += estimateTokens(JSON.stringify(msg.content));
  }

  if (newTotal > budget && compressed.length > 2) {
    // Drop oldest pairs until we fit
    while (compressed.length > 2 && newTotal > budget) {
      const removed = compressed.shift()!;
      const removedTokens = typeof removed.content === "string"
        ? estimateTokens(removed.content)
        : estimateTokens(JSON.stringify(removed.content));
      newTotal -= removedTokens;
      // Keep pairs: if we removed a user msg, also remove next assistant
      if (removed.role === "user" && compressed.length > 0 && compressed[0].role === "assistant") {
        const also = compressed.shift()!;
        newTotal -= typeof also.content === "string"
          ? estimateTokens(also.content)
          : estimateTokens(JSON.stringify(also.content));
      }
    }
  }

  return compressed;
}

// ── Tool execution ──

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  files: Map<string, FileState>,
  projectId: string | undefined,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<{ result: string; isError: boolean; fileChanged?: { path: string; content: string } }> {
  try {
    switch (toolName) {
      case "read_file": {
        const path = input.path as string;
        const file = files.get(path);
        if (file) {
          return { result: file.content, isError: false };
        }
        return { result: `Error: File not found: ${path}\nAvailable files: ${Array.from(files.keys()).slice(0, 20).join(", ")}`, isError: true };
      }

      case "write_file": {
        const path = input.path as string;
        const content = input.content as string;
        const lang = detectLanguageFromPath(path);
        files.set(path, { path, content, language: lang });

        // Sync to sandbox if available
        if (projectId) {
          try {
            await sandboxManager.writeFiles(projectId, { [path]: content });
          } catch {
            // Sandbox may not be running — file is still saved in-memory
          }
        }

        return {
          result: `File written: ${path} (${content.length} chars, ${content.split("\n").length} lines)`,
          isError: false,
          fileChanged: { path, content },
        };
      }

      case "edit_file": {
        const path = input.path as string;
        const oldStr = input.old_string as string;
        const newStr = input.new_string as string;
        const file = files.get(path);
        if (!file) {
          return { result: `Error: File not found: ${path}. Use read_file first or list_files to check available files.`, isError: true };
        }
        if (!file.content.includes(oldStr)) {
          // Help Claude debug: show nearby content
          const lines = file.content.split("\n");
          const preview = lines.slice(0, Math.min(20, lines.length)).join("\n");
          return {
            result: `Error: old_string not found in ${path}. The file might have changed. First 20 lines:\n${preview}`,
            isError: true,
          };
        }
        const occurrences = file.content.split(oldStr).length - 1;
        if (occurrences > 1) {
          return { result: `Error: old_string matches ${occurrences} times in ${path}. Include more surrounding context to make it unique.`, isError: true };
        }
        const newContent = file.content.replace(oldStr, newStr);
        file.content = newContent;

        // Sync to sandbox
        if (projectId) {
          try {
            await sandboxManager.writeFiles(projectId, { [path]: newContent });
          } catch { /* sandbox may not be running */ }
        }

        return {
          result: `File edited: ${path} (${oldStr.split("\n").length} lines replaced with ${newStr.split("\n").length} lines)`,
          isError: false,
          fileChanged: { path, content: newContent },
        };
      }

      case "run_command": {
        const command = input.command as string;
        if (!projectId) {
          return { result: "Error: No projectId — cannot run commands without a project context. Use start_sandbox first.", isError: true };
        }

        // Check if sandbox is alive; if not, auto-boot with current files
        const sandboxStatus = await sandboxManager.isRunning(projectId);
        if (!sandboxStatus.running) {
          controller.enqueue(encoder.encode(sse({
            type: "command_output",
            line: "Sandbox nicht aktiv — starte automatisch...",
          })));
          try {
            // Write all in-memory files to sandbox
            const fileMap: Record<string, string> = {};
            for (const [p, f] of files) fileMap[p] = f.content;
            if (Object.keys(fileMap).length > 0) {
              await sandboxManager.writeFiles(projectId, fileMap);
            }
            controller.enqueue(encoder.encode(sse({
              type: "command_output",
              line: "Sandbox bereit.",
            })));
          } catch (bootErr) {
            return {
              result: `Sandbox konnte nicht gestartet werden: ${bootErr instanceof Error ? bootErr.message : String(bootErr)}`,
              isError: true,
            };
          }
        }

        try {
          let output = "";
          let lineCount = 0;

          const result = await sandboxManager.exec(projectId, command, (line) => {
            output += line + "\n";
            lineCount++;
            if (lineCount % 3 === 0 || line.includes("error") || line.includes("Error") || line.includes("warning")) {
              controller.enqueue(encoder.encode(sse({
                type: "command_output",
                line,
              })));
            }
          }, 60_000);

          const exitCode = result?.exitCode ?? 0;
          const combined = output || (result?.output ?? "").trim();
          const truncated = combined.length > 8000 ? combined.slice(-8000) + "\n...(truncated)" : combined;
          return {
            result: `Exit code: ${exitCode}\n${truncated}`,
            isError: exitCode !== 0,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // If sandbox died mid-command, give a helpful error
          if (msg.includes("Sandbox") || msg.includes("sandbox") || msg.includes("ECONNREFUSED")) {
            return {
              result: `Sandbox ist nicht mehr erreichbar. Verwende start_sandbox um die Sandbox neu zu starten und dann den Befehl erneut auszuführen.\nFehler: ${msg}`,
              isError: true,
            };
          }
          return {
            result: `Command error: ${msg}`,
            isError: true,
          };
        }
      }

      case "search_files": {
        const pattern = input.pattern as string;
        const glob = input.file_glob as string | undefined;
        const results: string[] = [];
        for (const [filePath, file] of files) {
          if (glob && !matchGlob(filePath, glob)) continue;
          const lines = file.content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(pattern) || safeRegexTest(pattern, lines[i])) {
              results.push(`${filePath}:${i + 1}: ${lines[i].trim()}`);
              if (results.length >= 50) break;
            }
          }
          if (results.length >= 50) break;
        }
        return {
          result: results.length > 0
            ? `Found ${results.length} matches:\n${results.join("\n")}`
            : `No matches found for "${pattern}" in ${files.size} files`,
          isError: false,
        };
      }

      case "list_files": {
        const dirPath = (input.path as string) || ".";
        const recursive = input.recursive as boolean;
        const paths = Array.from(files.keys())
          .filter(p => {
            if (dirPath === "." || dirPath === "./") return true;
            const normalized = dirPath.replace(/\/$/, "");
            if (!p.startsWith(normalized + "/")) return false;
            if (!recursive) {
              const rest = p.slice(normalized.length + 1);
              return !rest.includes("/");
            }
            return true;
          })
          .sort();
        return {
          result: paths.length > 0
            ? `${paths.length} files${dirPath !== "." ? ` in ${dirPath}` : ""}:\n${paths.join("\n")}`
            : `No files found in "${dirPath}"`,
          isError: false,
        };
      }

      case "start_sandbox": {
        if (!projectId) {
          return { result: "Error: No projectId — cannot start sandbox without a project context.", isError: true };
        }

        const doInstall = input.install !== false; // default true
        const doStartDev = input.start_dev !== false; // default true

        try {
          // 1. Create or reclaim sandbox
          controller.enqueue(encoder.encode(sse({
            type: "command_output",
            line: "Sandbox wird erstellt...",
          })));
          await sandboxManager.getOrCreate(projectId);

          // 2. Write all in-memory project files
          const fileMap: Record<string, string> = {};
          for (const [p, f] of files) fileMap[p] = f.content;

          if (Object.keys(fileMap).length > 0) {
            controller.enqueue(encoder.encode(sse({
              type: "command_output",
              line: `Schreibe ${Object.keys(fileMap).length} Dateien in die Sandbox...`,
            })));
            await sandboxManager.writeFiles(projectId, fileMap);
          }

          // 3. npm install
          if (doInstall) {
            controller.enqueue(encoder.encode(sse({
              type: "command_output",
              line: "npm install läuft...",
            })));
            await sandboxManager.install(projectId, (line) => {
              controller.enqueue(encoder.encode(sse({
                type: "command_output",
                line,
              })));
            });
          }

          // 4. Start dev server
          if (doStartDev) {
            controller.enqueue(encoder.encode(sse({
              type: "command_output",
              line: "Dev Server wird gestartet...",
            })));
            const { url } = await sandboxManager.startDevServer(projectId, (line) => {
              controller.enqueue(encoder.encode(sse({
                type: "command_output",
                line,
              })));
            });

            // Notify frontend of sandbox start + preview URL
            controller.enqueue(encoder.encode(sse({
              type: "sandbox_started",
              url,
            })));

            return {
              result: `Sandbox gestartet! Dev Server läuft.\nPreview URL: ${url}\nAlle ${Object.keys(fileMap).length} Dateien wurden synchronisiert.`,
              isError: false,
            };
          }

          return {
            result: `Sandbox bereit. ${Object.keys(fileMap).length} Dateien synchronisiert.${doInstall ? " npm install abgeschlossen." : ""}`,
            isError: false,
          };
        } catch (err) {
          return {
            result: `Sandbox-Start fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`,
            isError: true,
          };
        }
      }

      default:
        return { result: `Unknown tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return {
      result: `Tool execution error: ${err instanceof Error ? err.message : String(err)}`,
      isError: true,
    };
  }
}

function detectLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
    json: "json", css: "css", html: "html", md: "markdown", mjs: "javascript",
    mts: "typescript", py: "python", rs: "rust", go: "go", yaml: "yaml", yml: "yaml",
    toml: "toml", sql: "sql", sh: "shell", bash: "shell", zsh: "shell",
  };
  return map[ext] || "plaintext";
}

function matchGlob(path: string, glob: string): boolean {
  const pattern = glob.replace(/\./g, "\\.").replace(/\*/g, ".*");
  try {
    return new RegExp(pattern).test(path);
  } catch {
    return path.includes(glob.replace(/\*/g, ""));
  }
}

function safeRegexTest(pattern: string, text: string): boolean {
  try {
    return new RegExp(pattern).test(text);
  } catch {
    return false;
  }
}

// ── Streaming Anthropic response parser ──

async function callAnthropicStreaming(
  apiKey: string,
  model: string,
  system: string,
  messages: Array<{ role: string; content: unknown }>,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
): Promise<AnthropicMessage> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
    },
    body: JSON.stringify({
      model,
      max_tokens: 32768,
      temperature: 0.3,
      stream: true,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
      tools: TOOLS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const body = response.body;
  if (!body) throw new Error("No stream body from Anthropic");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Accumulate the full message
  const contentBlocks: AnthropicContentBlock[] = [];
  let currentBlockIndex = -1;
  let currentBlockType: "text" | "tool_use" | null = null;
  let currentToolId = "";
  let currentToolName = "";
  let textAccum = "";
  let jsonAccum = "";
  let stopReason: "end_turn" | "tool_use" | "max_tokens" | null = null;
  let messageId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const event = JSON.parse(jsonStr);

        switch (event.type) {
          case "message_start":
            messageId = event.message?.id ?? "";
            break;

          case "content_block_start":
            currentBlockIndex = event.index ?? contentBlocks.length;
            if (event.content_block?.type === "tool_use") {
              currentBlockType = "tool_use";
              currentToolId = event.content_block.id ?? "";
              currentToolName = event.content_block.name ?? "";
              jsonAccum = "";
              // Send tool_call start event (name only, input streams later)
              controller.enqueue(encoder.encode(sse({
                type: "tool_call",
                toolCallId: currentToolId,
                name: currentToolName,
                status: "started",
              })));
            } else {
              currentBlockType = "text";
              textAccum = "";
            }
            break;

          case "content_block_delta":
            if (event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
              textAccum += event.delta.text;
              controller.enqueue(encoder.encode(sse({
                type: "text_delta",
                text: event.delta.text,
              })));
            } else if (event.delta?.type === "input_json_delta" && typeof event.delta.partial_json === "string") {
              jsonAccum += event.delta.partial_json;
            }
            break;

          case "content_block_stop":
            if (currentBlockType === "text") {
              contentBlocks[currentBlockIndex] = { type: "text", text: textAccum };
            } else if (currentBlockType === "tool_use") {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = JSON.parse(jsonAccum);
              } catch { /* malformed JSON — pass empty */ }
              contentBlocks[currentBlockIndex] = {
                type: "tool_use",
                id: currentToolId,
                name: currentToolName,
                input: parsedInput,
              };
              // Send tool_call with full input
              controller.enqueue(encoder.encode(sse({
                type: "tool_call",
                toolCallId: currentToolId,
                name: currentToolName,
                input: parsedInput,
                status: "pending",
              })));
            }
            currentBlockType = null;
            break;

          case "message_delta":
            if (event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason;
            }
            break;
        }
      } catch { /* skip malformed SSE lines */ }
    }
  }

  return {
    id: messageId,
    role: "assistant",
    content: contentBlocks,
    stop_reason: stopReason,
  };
}

// ── Main route handler ──

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, RATE_LIMITS.EXPENSIVE);
  if (limited) return limited;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY missing." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { messages, currentFiles, projectId, model, language, roles, userLevel } = body;
  if (!messages || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "No messages provided." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build file state map
  const files = new Map<string, FileState>();
  if (currentFiles) {
    for (const f of currentFiles) {
      files.set(f.path, { path: f.path, content: f.content, language: f.language });
    }
  }

  const fileTree = Array.from(files.keys());
  const activeRoles = (roles && roles.length > 0 ? roles : ["developer", "designer"]) as ChatRoleId[];
  const level = (userLevel || "beginner") as UserLevelId;

  const systemPrompt = buildAgenticSystemPrompt(
    (language as ChatLanguage) || "de",
    activeRoles,
    level,
    fileTree,
  );

  const selectedModel = model?.trim() || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const systemTokens = estimateTokens(systemPrompt) + estimateTokens(JSON.stringify(TOOLS));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Build initial conversation messages (with image support for first user message)
        const conversationMessages: Array<{ role: string; content: unknown }> = messages.map((m) => {
          // Support images in user messages
          if (m.images && m.images.length > 0 && m.role === "user") {
            const contentBlocks: Array<Record<string, unknown>> = [];
            for (const img of m.images) {
              contentBlocks.push({
                type: "image",
                source: { type: "base64", media_type: img.mediaType, data: img.data },
              });
            }
            if (m.content) contentBlocks.push({ type: "text", text: m.content });
            return { role: m.role, content: contentBlocks };
          }
          return { role: m.role, content: m.content };
        });

        // Agentic loop
        for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
          // Notify frontend of new turn
          controller.enqueue(encoder.encode(sse({
            type: "turn_start",
            turn: turn + 1,
            maxTurns: MAX_AGENT_TURNS,
          })));

          // Compress conversation if approaching token limit
          const compressed = compressConversation(conversationMessages, systemTokens);

          const assistantMessage = await callAnthropicStreaming(
            apiKey,
            selectedModel,
            systemPrompt,
            compressed,
            controller,
            encoder,
          );

          // Add assistant message to conversation (use original array, not compressed)
          conversationMessages.push({
            role: "assistant",
            content: assistantMessage.content,
          });

          // If no tool use, we're done
          if (assistantMessage.stop_reason !== "tool_use") {
            controller.enqueue(encoder.encode(sse({ type: "done" })));
            break;
          }

          // Send done if max turns reached
          if (turn === MAX_AGENT_TURNS - 1) {
            controller.enqueue(encoder.encode(sse({
              type: "text_delta",
              text: "\n\n⚠️ Maximale Anzahl an Schritten erreicht. Bitte sende eine Folgenachricht um fortzufahren.",
            })));
            controller.enqueue(encoder.encode(sse({ type: "done" })));
            break;
          }

          // Process tool calls
          const toolUseBlocks = assistantMessage.content.filter(
            (b): b is AnthropicContentBlock & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
              b.type === "tool_use" && !!b.id && !!b.name,
          );

          const toolResults: Array<{
            type: "tool_result";
            tool_use_id: string;
            content: string;
            is_error?: boolean;
          }> = [];

          for (const toolBlock of toolUseBlocks) {
            // Send "executing" event BEFORE running the tool — so frontend knows immediately
            controller.enqueue(encoder.encode(sse({
              type: "tool_executing",
              toolCallId: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input ?? {},
            })));

            const { result, isError, fileChanged } = await executeTool(
              toolBlock.name,
              toolBlock.input ?? {},
              files,
              projectId,
              controller,
              encoder,
            );

            // Send result event to frontend (truncated for display)
            controller.enqueue(encoder.encode(sse({
              type: "tool_result",
              toolCallId: toolBlock.id,
              name: toolBlock.name,
              result: result.length > 2000 ? result.slice(0, 2000) + "\n...(truncated)" : result,
              isError,
            })));

            // Send file_changed event if applicable
            if (fileChanged) {
              controller.enqueue(encoder.encode(sse({
                type: "file_changed",
                path: fileChanged.path,
                content: fileChanged.content,
              })));
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: result,
              ...(isError ? { is_error: true } : {}),
            });
          }

          // Add tool results as user message for next turn
          conversationMessages.push({
            role: "user",
            content: toolResults,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Agentic loop error";
        controller.enqueue(encoder.encode(sse({ type: "error", error: message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
