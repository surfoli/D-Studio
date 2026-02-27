"use client";

import { useEffect, useRef, useState } from "react";
import { Block } from "@/lib/types";

const STARTER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    padding: 48px 32px;
  }
  .container { max-width: 640px; text-align: center; }
  h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  p { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; }
  .btn {
    display: inline-block; padding: 12px 28px; border-radius: 12px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white; font-weight: 600; cursor: pointer; border: none;
    font-size: 1rem; transition: transform 0.2s, opacity 0.2s;
  }
  .btn:hover { transform: scale(1.05); opacity: 0.9; }
</style>
</head>
<body>
  <div class="container">
    <h1>Custom Block ✦</h1>
    <p>Hier kannst du beliebiges HTML, CSS und JavaScript schreiben.
       Klicke im Editor auf diesen Block und bearbeite den Code im Panel.</p>
    <button class="btn" onclick="this.textContent='🎉 It works!'">Click me</button>
  </div>
</body>
</html>`;

interface Props {
  block: Block;
}

export default function CustomBlock({ block }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const html = block.content.html || STARTER_HTML;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "bs-custom-height" && typeof e.data.height === "number") {
        setHeight(Math.max(120, e.data.height));
      }
    };
    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const srcDoc = injectHeightReporter(html);

  return (
    <div className="w-full" style={{ background: "#0f172a" }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        title={`custom-block-${block.id}`}
        className="w-full border-0 block"
        style={{ height, display: "block" }}
        scrolling="no"
      />
    </div>
  );
}

function injectHeightReporter(html: string): string {
  const script = `<script>
(function(){
  function report(){
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    parent.postMessage({type:'bs-custom-height',height:h},\\'*\\');
  }
  window.addEventListener('load', report);
  new ResizeObserver(report).observe(document.body);
})();
<\/script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", script + "</body>");
  }
  return html + script;
}

export { STARTER_HTML };
