"use client";

import { useMemo } from "react";

// Simple token types for syntax highlighting
type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "tag"
  | "attr"
  | "punctuation"
  | "function"
  | "type"
  | "plain";

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORD_SET = new Set([
  "import", "export", "from", "default", "const", "let", "var",
  "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "new", "delete",
  "typeof", "instanceof", "in", "of", "class", "extends",
  "super", "this", "try", "catch", "finally", "throw",
  "async", "await", "yield", "true", "false", "null", "undefined",
  "void", "static", "get", "set", "type", "interface", "enum",
  "as", "is", "keyof", "readonly", "declare", "module",
  "namespace", "implements", "abstract", "private", "protected",
  "public", "override",
]);

const JSX_KEYWORD_SET = new Set([
  "className", "onClick", "onChange", "onSubmit", "onKeyDown",
  "onMouseDown", "onMouseUp", "onMouseMove", "onFocus", "onBlur",
  "href", "src", "alt", "title", "style", "key", "ref", "id",
  "disabled", "placeholder", "value", "type", "name", "target",
  "rel", "children", "dangerouslySetInnerHTML",
]);

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: "#c792ea",
  string: "#c3e88d",
  comment: "#546e7a",
  number: "#f78c6c",
  tag: "#f07178",
  attr: "#ffcb6b",
  punctuation: "#89ddff",
  function: "#82aaff",
  type: "#ffcb6b",
  plain: "#d6deeb",
};

function tokenize(code: string, language?: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Single-line comment
    if (code[i] === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const commentEnd = end === -1 ? code.length : end;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // Multi-line comment
    if (code[i] === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const commentEnd = end === -1 ? code.length : end + 2;
      tokens.push({ type: "comment", value: code.slice(i, commentEnd) });
      i = commentEnd;
      continue;
    }

    // Template literal
    if (code[i] === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== "`") {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Strings
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || !/[a-zA-Z_$]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[0-9.xXa-fA-F_eE+-]/.test(code[j])) j++;
      tokens.push({ type: "number", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // JSX tags: <Component or </div>
    if (code[i] === "<" && /[A-Za-z/]/.test(code[i + 1] || "")) {
      const isClosing = code[i + 1] === "/";
      const start = isClosing ? i + 2 : i + 1;
      let j = start;
      while (j < code.length && /[A-Za-z0-9._-]/.test(code[j])) j++;
      const tagName = code.slice(start, j);
      if (tagName) {
        tokens.push({ type: "punctuation", value: code.slice(i, start) });
        tokens.push({ type: "tag", value: tagName });
        i = j;
        continue;
      }
    }

    // Words (identifiers, keywords)
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);

      if (KEYWORD_SET.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (JSX_KEYWORD_SET.has(word)) {
        tokens.push({ type: "attr", value: word });
      } else if (code[j] === "(" || code[j] === "<") {
        tokens.push({ type: "function", value: word });
      } else if (word[0] === word[0].toUpperCase() && /[a-z]/.test(word)) {
        tokens.push({ type: "type", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = j;
      continue;
    }

    // Punctuation
    if (/[{}()\[\];:.,=<>!&|?+\-*/%~^@#]/.test(code[i])) {
      // Grab consecutive punctuation
      let j = i + 1;
      while (j < code.length && /[=<>!&|?+\-*/%~^]/.test(code[j]) && j - i < 3) j++;
      tokens.push({ type: "punctuation", value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Whitespace / anything else
    tokens.push({ type: "plain", value: code[i] });
    i++;
  }

  return tokens;
}

/**
 * Renders a code block with syntax highlighting.
 */
export function CodeBlock({
  code,
  language,
  filename,
  onClickFilename,
}: {
  code: string;
  language?: string;
  filename?: string;
  onClickFilename?: () => void;
}) {
  const tokens = useMemo(() => tokenize(code, language), [code, language]);

  return (
    <div
      className="rounded-lg overflow-hidden my-1.5"
      style={{
        background: "var(--vibe-surface, #1e1e2e)",
        border: "1px solid var(--vibe-border-light, rgba(255,255,255,0.06))",
      }}
    >
      {/* Header with language/filename */}
      {(language || filename) && (
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            background: "var(--vibe-hover, rgba(255,255,255,0.03))",
            borderBottom: "1px solid var(--vibe-border-light, rgba(255,255,255,0.06))",
          }}
        >
          {filename ? (
            <button
              onClick={onClickFilename}
              className="text-[10px] font-mono text-blue-300/80 hover:text-blue-300 transition-colors"
            >
              {filename}
            </button>
          ) : (
            <span className="text-[10px] font-mono text-white/30">
              {language}
            </span>
          )}
        </div>
      )}
      <pre className="px-3 py-2 overflow-x-auto text-[11px] leading-[18px] font-mono">
        {tokens.map((token, idx) => (
          <span key={idx} style={{ color: TOKEN_COLORS[token.type] }}>
            {token.value}
          </span>
        ))}
      </pre>
    </div>
  );
}

/**
 * Parse and render chat message content with code blocks highlighted.
 * Handles ```lang ... ``` fenced code blocks and inline `code`.
 */
// Check if inline code looks like a file path
function isFilePath(s: string): boolean {
  return /^[\w@./-]+\.\w{1,6}$/.test(s) && s.includes("/");
}

const ROLE_COLORS: Record<string, string> = {
  "Dev": "#3B82F6",
  "Designer": "#EC4899",
  "Security": "#EF4444",
  "Marketing": "#22C55E",
  "Gruender": "#F97316",
  "Alles-Verstehen": "#EAB308",
  "Anwalt": "#6B7280",
  "UX": "#06B6D4",
  "Content": "#A855F7",
};

export function ChatContent({
  text,
  color,
  onFileClick,
}: {
  text: string;
  color: string;
  onFileClick?: (path: string) => void;
}) {
  const parts = useMemo(() => {
    const result: Array<
      | { type: "text"; value: string }
      | { type: "code"; language: string; value: string }
      | { type: "inline"; value: string }
    > = [];

    // Split by fenced code blocks
    const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = fenceRegex.exec(text)) !== null) {
      // Text before the code block
      if (match.index > lastIndex) {
        result.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      result.push({
        type: "code",
        language: match[1] || "typescript",
        value: match[2].replace(/\n$/, ""),
      });
      lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < text.length) {
      result.push({ type: "text", value: text.slice(lastIndex) });
    }

    return result;
  }, [text]);

  return (
    <div className="text-[12px] leading-relaxed">
      {parts.map((part, idx) => {
        if (part.type === "code") {
          return (
            <CodeBlock
              key={idx}
              code={part.value}
              language={part.language}
            />
          );
        }

        // Text — handle role prefixes, inline code with backticks, bold with **, and newlines
        const inlineParts = part.value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return (
          <span key={idx} style={{ color }} className="whitespace-pre-wrap break-words">
            {inlineParts.map((segment, si) => {
              // Rollen-Review separator
              if (segment.trim() === "--- Rollen-Review ---") {
                return (
                  <div
                    key={si}
                    className="flex items-center gap-2 my-2 py-1"
                    style={{ borderTop: "1px solid var(--vibe-border, rgba(255,255,255,0.08))" }}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--vibe-text-faint, rgba(255,255,255,0.25))" }}>
                      Rollen-Review
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--vibe-border-light, rgba(255,255,255,0.06))" }} />
                  </div>
                );
              }
              // Bold text
              if (segment.startsWith("**") && segment.endsWith("**")) {
                const boldText = segment.slice(2, -2);
                // Check for role prefix in bold (e.g. **Als Dev:** or **Dev:**)
                const roleMatch = boldText.match(/^(?:Als\s+)?([\w-]+):?$/);
                if (roleMatch) {
                  const roleName = roleMatch[1];
                  const roleColor = ROLE_COLORS[roleName];
                  if (roleColor) {
                    return (
                      <span
                        key={si}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold my-0.5"
                        style={{
                          background: `${roleColor}15`,
                          color: roleColor,
                          border: `1px solid ${roleColor}30`,
                        }}
                      >
                        {boldText}
                      </span>
                    );
                  }
                }
                return (
                  <strong key={si} className="font-semibold" style={{ color: "var(--vibe-text, rgba(255,255,255,0.95))" }}>
                    {boldText}
                  </strong>
                );
              }
              // Role prefix without bold: "Dev: ...", "Als Dev: ...", "Designer: ..."
              const plainRoleMatch = segment.match(/^(?:Als\s+)?([\w-]+)(:)/);
              if (plainRoleMatch) {
                const roleName = plainRoleMatch[1];
                const roleColor = ROLE_COLORS[roleName];
                if (roleColor) {
                  const rest = segment.slice(plainRoleMatch[0].length);
                  return (
                    <span key={si}>
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold my-0.5"
                        style={{
                          background: `${roleColor}15`,
                          color: roleColor,
                          border: `1px solid ${roleColor}30`,
                        }}
                      >
                        {plainRoleMatch[0].replace(/:$/, "")}
                      </span>
                      {rest}
                    </span>
                  );
                }
              }
              // Inline code
              if (segment.startsWith("`") && segment.endsWith("`")) {
                const inner = segment.slice(1, -1);
                const filePathLike = isFilePath(inner);
                if (filePathLike && onFileClick) {
                  return (
                    <button
                      key={si}
                      onClick={() => onFileClick(inner)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors hover:bg-emerald-500/20"
                      style={{
                        background: "rgba(52,211,153,0.1)",
                        color: "#6ee7b7",
                        border: "1px solid rgba(52,211,153,0.2)",
                      }}
                    >
                      {inner}
                    </button>
                  );
                }
                return (
                  <code
                    key={si}
                    className="px-1 py-0.5 rounded text-[11px] font-mono"
                    style={{
                      background: "var(--vibe-hover, rgba(255,255,255,0.08))",
                      color: "var(--vibe-text, #e2e8f0)",
                    }}
                  >
                    {inner}
                  </code>
                );
              }
              return <span key={si}>{segment}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
}
