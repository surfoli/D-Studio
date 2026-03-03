"use client";

// ── Unified AI Hook ──
// One AI engine for the entire app. All modes (Plan, Design, Build, GlassChat)
// share the same messages, streaming state, model, and conversation thread.
// The GlassChat bubble is literally the same chat as the Build mode right panel.

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/lib/vibe-code";
import { genMessageId, buildVibeCodeSystemPrompt } from "@/lib/vibe-code";
import { designBriefToPrompt } from "@/lib/design-brief";
import type { DesignBrief } from "@/lib/design-brief";

export type AIChatMode = "plan" | "design" | "build";

export interface UseAIOptions {
  model: string;
  userLevel: string;
  getDesignBrief?: () => DesignBrief | null;
}

export interface UseAIReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  send: (message: string, modeOverride?: AIChatMode) => Promise<void>;
  abort: () => void;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export function useAI({ model, userLevel, getDesignBrief }: UseAIOptions): UseAIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  // Keep a stable ref to avoid stale closures in send()
  const modelRef = useRef(model);
  modelRef.current = model;
  const userLevelRef = useRef(userLevel);
  userLevelRef.current = userLevel;
  const getBriefRef = useRef(getDesignBrief);
  getBriefRef.current = getDesignBrief;

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingText("");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const send = useCallback(async (message: string, modeOverride: AIChatMode = "build") => {
    const userMsg: ChatMessage = {
      id: genMessageId(),
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    // Capture current messages + add new user message
    let currentMessages: ChatMessage[] = [];
    setMessages((prev) => {
      currentMessages = prev;
      return [...prev, userMsg];
    });

    setIsStreaming(true);
    setStreamingText("");

    const brief = getBriefRef.current?.();
    const briefContext =
      brief && brief.sections.length > 0 ? "\n\n" + designBriefToPrompt(brief) : "";

    const systemPrompt =
      buildVibeCodeSystemPrompt(
        "de",
        ["developer", "designer"],
        userLevelRef.current as "beginner" | "learning" | "pro" | "custom",
        undefined,
        modeOverride === "plan" ? "plan" : "code"
      ) + briefContext;

    const apiMessages = [...currentMessages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/vibe-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: modelRef.current,
          language: "de",
          roles: ["developer", "designer"],
          userLevel: userLevelRef.current,
          chatMode: modeOverride === "plan" ? "plan" : "code",
          systemPrompt,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`API Error ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as { type: string; text?: string };
            if (event.type === "delta" && event.text) {
              accumulated += event.text;
              setStreamingText(accumulated);
            }
            if (event.type === "done" && accumulated) {
              setMessages((prev) => [
                ...prev,
                {
                  id: genMessageId(),
                  role: "assistant",
                  content: accumulated,
                  timestamp: Date.now(),
                },
              ]);
              setStreamingText("");
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: genMessageId(),
            role: "assistant",
            content: `Fehler: ${(err as Error).message}`,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      abortRef.current = null;
    }
  }, []);

  return { messages, isStreaming, streamingText, send, abort, clearMessages, setMessages };
}
