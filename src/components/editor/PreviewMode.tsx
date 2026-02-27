"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
} from "lucide-react";
import { Project } from "@/lib/types";
import { buildPreviewHTML } from "@/lib/preview-html";

interface Props {
  project: Project;
  theme: "light" | "dark";
}

const VIEWPORTS = [
  { id: "desktop" as const, label: "Desktop", width: 1440, icon: Monitor },
  { id: "tablet" as const, label: "Tablet", width: 768, icon: Tablet },
  { id: "mobile" as const, label: "Mobile", width: 390, icon: Smartphone },
];

export default function PreviewMode({ project, theme }: Props) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [currentSlug, setCurrentSlug] = useState("/");
  const [history, setHistory] = useState<string[]>(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const isDark = theme === "dark";
  const activeViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  // Derive page list for URL bar
  const pageList = useMemo(() => {
    return project.pages.map((p, i) => ({
      name: p.name || `Page ${i + 1}`,
      slug: p.slug || (i === 0 ? "/" : `/${p.name?.toLowerCase().replace(/\s+/g, "-") || `page-${i + 1}`}`),
    }));
  }, [project.pages]);

  // Build & load the preview HTML into the iframe
  const loadPreview = useCallback(
    (navigateToSlug?: string) => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      const html = buildPreviewHTML(project);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const slug = navigateToSlug ?? currentSlug;
      const fullUrl = `${url}#${slug}`;

      if (iframeRef.current) {
        iframeRef.current.src = fullUrl;
      }
    },
    [project, currentSlug]
  );

  // Rebuild preview whenever project changes
  useEffect(() => {
    loadPreview(currentSlug);
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "bs-preview-navigate") {
        const slug = e.data.slug || "/";
        setCurrentSlug(slug);
        setHistory((prev) => {
          const trimmed = prev.slice(0, historyIndex + 1);
          return [...trimmed, slug];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const newIndex = historyIndex - 1;
    const slug = history[newIndex];
    setHistoryIndex(newIndex);
    setCurrentSlug(slug);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "bs-preview-goto", slug },
      "*"
    );
  }, [canGoBack, historyIndex, history]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const newIndex = historyIndex + 1;
    const slug = history[newIndex];
    setHistoryIndex(newIndex);
    setCurrentSlug(slug);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "bs-preview-goto", slug },
      "*"
    );
  }, [canGoForward, historyIndex, history]);

  const refresh = useCallback(() => {
    loadPreview(currentSlug);
  }, [loadPreview, currentSlug]);

  const navigateTo = useCallback(
    (slug: string) => {
      setCurrentSlug(slug);
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, slug];
      });
      setHistoryIndex((prev) => prev + 1);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "bs-preview-goto", slug },
        "*"
      );
    },
    [historyIndex]
  );

  // Color tokens
  const barBg = isDark ? "rgba(24,24,24,0.98)" : "rgba(250,250,250,0.98)";
  const barBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const textMuted = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const textActive = isDark ? "#fff" : "#111";
  const pillBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const activePillBg = isDark ? "rgba(255,255,255,0.12)" : "#fff";
  const canvasBg = isDark ? "#111" : "#e0dfdd";
  const urlBarBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const urlBarBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const btnDisabled = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const btnEnabled = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";

  const hasPages = project.pages.length > 0;

  if (!hasPages) {
    return (
      <div
        className="h-full flex items-center justify-center text-[13px]"
        style={{ color: textMuted }}
      >
        Kein Projekt zum Vorschauen vorhanden. Generiere zuerst eine Seite.
      </div>
    );
  }

  const displayUrl = `${project.name.toLowerCase().replace(/\s+/g, "-")}.app${currentSlug === "/" ? "" : currentSlug}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Browser Chrome */}
      <div
        className="shrink-0 flex flex-col"
        style={{
          background: barBg,
          borderBottom: `1px solid ${barBorder}`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Top row: viewport switcher */}
        <div className="flex items-center justify-center gap-2 px-4" style={{ height: 36 }}>
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: pillBg }}
          >
            {VIEWPORTS.map((v) => {
              const active = viewport === v.id;
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setViewport(v.id)}
                  className="relative flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    color: active ? textActive : textMuted,
                    background: active ? activePillBg : "transparent",
                    boxShadow: active && !isDark ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{v.label}</span>
                  <span className="text-[10px] opacity-40 hidden md:inline">{v.width}px</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom row: browser navigation bar */}
        <div
          className="flex items-center gap-1.5 px-3 pb-2"
          style={{ height: 36 }}
        >
          {/* Back / Forward / Refresh */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={goBack}
              disabled={!canGoBack}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: canGoBack ? btnEnabled : btnDisabled }}
              title="Zurück"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: canGoForward ? btnEnabled : btnDisabled }}
              title="Vorwärts"
            >
              <ArrowRight size={14} />
            </button>
            <button
              onClick={refresh}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: btnEnabled }}
              title="Neu laden"
            >
              <RotateCw size={12} />
            </button>
          </div>

          {/* URL bar */}
          <div
            className="flex-1 flex items-center gap-2 h-8 rounded-lg px-3 text-[12px]"
            style={{
              background: urlBarBg,
              border: `1px solid ${urlBarBorder}`,
              color: textActive,
              minWidth: 0,
            }}
          >
            <Lock size={10} style={{ color: textMuted, flexShrink: 0 }} />
            <span className="truncate" style={{ color: textMuted, userSelect: "all" }}>
              {displayUrl}
            </span>
          </div>

          {/* Page quick-nav */}
          {pageList.length > 1 && (
            <div className="flex items-center gap-0.5 ml-1">
              {pageList.map((p) => (
                <button
                  key={p.slug}
                  onClick={() => navigateTo(p.slug)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                  style={{
                    background:
                      currentSlug === p.slug ? activePillBg : "transparent",
                    color: currentSlug === p.slug ? textActive : textMuted,
                    boxShadow:
                      currentSlug === p.slug && !isDark
                        ? "0 1px 3px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Iframe preview area */}
      <div className="flex-1 overflow-hidden" style={{ background: canvasBg }}>
        <div
          className="mx-auto h-full transition-all duration-300 ease-out"
          style={{
            width: viewport === "desktop" ? "100%" : activeViewport.width,
            maxWidth: "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0"
            style={{
              background: "#fff",
              borderRadius: viewport !== "desktop" ? "12px 12px 0 0" : 0,
              boxShadow:
                viewport !== "desktop"
                  ? "0 0 40px rgba(0,0,0,0.12)"
                  : "none",
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
