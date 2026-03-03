"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Maximize2, Minimize2, Loader2, Sparkles } from "lucide-react";

// ── Types ──

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export type ChatSize = "bubble" | "compact" | "expanded" | "fullscreen";

interface GlassChatProps {
  onSend?: (message: string) => void;
  isStreaming?: boolean;
  streamingText?: string;
  messages?: ChatMessage[];
  placeholder?: string;
  mode?: string;
}

// ── Helpers ──

function genId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Simple markdown-like rendering
function renderContent(text: string) {
  // Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = (lang ? lines.slice(1) : lines).join("\n");
      return (
        <pre
          key={i}
          style={{
            background: "var(--d3-glass)",
            borderRadius: 12,
            padding: "14px 16px",
            margin: "8px 0",
            overflowX: "auto",
            fontSize: "0.75rem",
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6,
          }}
        >
          {lang && (
            <span
              style={{
                fontSize: "0.625rem",
                color: "var(--d3-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "block",
                marginBottom: 8,
              }}
            >
              {lang}
            </span>
          )}
          <code>{code}</code>
        </pre>
      );
    }
    // Inline formatting
    return (
      <span key={i} style={{ whiteSpace: "pre-wrap" }}>
        {part.split(/(\*\*.*?\*\*)/g).map((seg, j) =>
          seg.startsWith("**") && seg.endsWith("**") ? (
            <strong key={j} style={{ color: "var(--d3-text)", fontWeight: 600 }}>
              {seg.slice(2, -2)}
            </strong>
          ) : (
            seg
          )
        )}
      </span>
    );
  });
}

// ── Component ──

export default function GlassChat({
  onSend,
  isStreaming = false,
  streamingText = "",
  messages: externalMessages,
  placeholder = "Was möchtest du bauen?",
  mode = "plan",
}: GlassChatProps) {
  const [size, setSize] = useState<ChatSize>("bubble");
  const [input, setInput] = useState("");
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = externalMessages ?? internalMessages;
  const isOpen = size !== "bubble";

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    if (!externalMessages) {
      setInternalMessages((prev) => [
        ...prev,
        { id: genId(), role: "user", content: trimmed, timestamp: Date.now() },
      ]);
    }

    onSend?.(trimmed);
    setInput("");

    // Auto-expand on first message
    if (size === "compact") {
      setSize("expanded");
    }
  }, [input, isStreaming, onSend, externalMessages, size]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape") {
        setSize("bubble");
      }
    },
    [handleSend]
  );

  const toggleSize = useCallback(() => {
    setSize((prev) => {
      if (prev === "bubble") return "compact";
      if (prev === "compact") return "expanded";
      if (prev === "expanded") return "fullscreen";
      return "compact";
    });
  }, []);

  const close = useCallback(() => setSize("bubble"), []);

  // ── Bubble (collapsed state) ──
  if (size === "bubble") {
    return (
      <motion.button
        className="chat-bubble chat-bubble-collapsed glass-heavy"
        onClick={() => setSize("compact")}
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid var(--d3-glass-heavy-border)",
        }}
        aria-label="Chat öffnen"
      >
        {isStreaming ? (
          <Loader2 size={20} style={{ color: "var(--d3-text-secondary)" }} className="animate-spin" />
        ) : (
          <Sparkles size={20} style={{ color: "var(--d3-text-secondary)" }} />
        )}
      </motion.button>
    );
  }

  // ── Dimensions by size ──
  const dimensions = {
    compact: { width: 420, height: 280, bottom: 24, radius: 20 },
    expanded: { width: 560, height: 480, bottom: 24, radius: 24 },
    fullscreen: { width: "calc(100vw - 48px)" as string | number, height: "calc(100vh - 48px)" as string | number, bottom: 24, radius: 28 },
  };

  const dim = dimensions[size as keyof typeof dimensions] || dimensions.compact;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={size}
        className="glass-heavy"
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          bottom: dim.bottom,
          left: "50%",
          transform: "translateX(-50%)",
          width: dim.width,
          height: dim.height,
          borderRadius: dim.radius,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--d3-border-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={14} style={{ color: "var(--d3-text-tertiary)" }} />
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 500,
                color: "var(--d3-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              D³ AI · {mode}
            </span>
            {isStreaming && (
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--d3-text-secondary)",
                }}
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={toggleSize}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--d3-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {size === "fullscreen" ? (
                <Minimize2 size={13} style={{ color: "var(--d3-text-tertiary)" }} />
              ) : (
                <Maximize2 size={13} style={{ color: "var(--d3-text-tertiary)" }} />
              )}
            </button>
            <button
              onClick={close}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--d3-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={13} style={{ color: "var(--d3-text-tertiary)" }} />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {messages.length === 0 && !streamingText && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: 0.3,
              }}
            >
              <MessageCircle size={24} />
              <span style={{ fontSize: "0.75rem" }}>Beschreib deine Vision</span>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background:
                    msg.role === "user"
                      ? "var(--d3-surface-active)"
                      : "var(--d3-surface)",
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                  color: msg.role === "user" ? "var(--d3-text)" : "var(--d3-text-secondary)",
                }}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {/* Streaming */}
          {streamingText && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div
                style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "var(--d3-surface)",
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                  color: "var(--d3-text-secondary)",
                }}
              >
                {renderContent(streamingText)}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ color: "var(--d3-text-tertiary)" }}
                >
                  ▊
                </motion.span>
              </div>
            </div>
          )}
        </div>

        {/* ── Input ── */}
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--d3-border-subtle)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "var(--d3-glass)",
              borderRadius: 14,
              padding: "8px 12px",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              border: "1px solid transparent",
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = "var(--d3-surface-hover)";
              e.currentTarget.style.borderColor = "var(--d3-glass-heavy-border)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = "var(--d3-glass)";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--d3-text)",
                fontSize: "0.8125rem",
                lineHeight: 1.5,
                resize: "none",
                maxHeight: size === "fullscreen" ? 200 : 100,
                fontFamily: "inherit",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, size === "fullscreen" ? 200 : 100) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              style={{
                background: input.trim() && !isStreaming ? "var(--d3-border-medium)" : "transparent",
                border: "none",
                borderRadius: 10,
                padding: 6,
                cursor: input.trim() && !isStreaming ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              {isStreaming ? (
                <Loader2 size={16} style={{ color: "var(--d3-text-tertiary)" }} className="animate-spin" />
              ) : (
                <Send
                  size={16}
                  style={{
                    color: input.trim() ? "var(--d3-text-secondary)" : "var(--d3-text-ghost)",
                  }}
                />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
