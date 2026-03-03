/**
 * D3 Studio — Preview Bridge Script
 *
 * This script is injected into the E2B sandbox preview (public/__d3_inspect__.js).
 * It intercepts clicks on DOM elements, reads their computed styles,
 * and sends the data back to D3 Studio via window.parent.postMessage().
 *
 * The parent (VibeCodingMode) listens for these messages and renders
 * the InspectPanel with live editing controls.
 */

/** The JS source that gets written into the sandbox's public/ folder. */
export const PREVIEW_BRIDGE_SCRIPT = `
(function() {
  if (window.__d3InspectActive) return;
  window.__d3InspectActive = true;

  let selectedEl = null;
  let hoverEl = null;
  let overlayBox = null;
  let selectBox = null;
  let inspectEnabled = false;

  // ── Overlay elements ──
  function createOverlay(id, color) {
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:2147483646',
      'border:2px solid ' + color,
      'background:' + color.replace(')', ',0.08)').replace('rgb', 'rgba'),
      'transition:all 0.15s ease',
      'display:none',
      'border-radius:2px',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function positionOverlay(overlay, el) {
    if (!el) { overlay.style.display = 'none'; return; }
    var rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  // ── Read computed styles ──
  function getElementData(el) {
    if (!el) return null;
    var cs = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();

    // Build a simple CSS selector path
    var path = buildSelectorPath(el);

    // Get text content (only direct text, not children)
    var directText = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3) {
        directText += el.childNodes[i].textContent;
      }
    }
    directText = directText.trim();

    // Collect Tailwind/CSS classes
    var classes = el.className;
    if (typeof classes !== 'string') classes = '';

    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: classes,
      directText: directText || null,
      innerHTML: el.innerHTML.length < 500 ? el.innerHTML : null,
      selectorPath: path,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      styles: {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textAlign: cs.textAlign,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        margin: cs.margin,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        borderRadius: cs.borderRadius,
        border: cs.border,
        width: cs.width,
        height: cs.height,
        display: cs.display,
        flexDirection: cs.flexDirection,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        gap: cs.gap,
        opacity: cs.opacity,
        boxShadow: cs.boxShadow,
      },
    };
  }

  function buildSelectorPath(el) {
    var parts = [];
    var current = el;
    while (current && current !== document.body && parts.length < 5) {
      var tag = current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(tag + '#' + current.id);
        break;
      }
      var cls = (current.className || '').toString().trim().split(/\\s+/).slice(0, 2).join('.');
      if (cls) tag += '.' + cls;
      // Add nth-child if needed
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
        if (siblings.length > 1) {
          var idx = siblings.indexOf(current) + 1;
          tag += ':nth-child(' + idx + ')';
        }
      }
      parts.unshift(tag);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  // ── Ignore our own overlay elements and scripts ──
  function shouldIgnore(el) {
    if (!el || el === document.body || el === document.documentElement) return true;
    if (el.id === '__d3_hover_overlay' || el.id === '__d3_select_overlay') return true;
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return true;
    return false;
  }

  // ── Listen for enable/disable from parent ──
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== 'd3studio') return;

    if (e.data.type === 'inspect-enable') {
      inspectEnabled = true;
      document.body.style.cursor = 'crosshair';
      if (!overlayBox) overlayBox = createOverlay('__d3_hover_overlay', 'rgb(59,130,246)');
      if (!selectBox) selectBox = createOverlay('__d3_select_overlay', 'rgb(245,158,11)');
    }

    if (e.data.type === 'inspect-disable') {
      inspectEnabled = false;
      document.body.style.cursor = '';
      if (overlayBox) overlayBox.style.display = 'none';
      if (selectBox) selectBox.style.display = 'none';
      selectedEl = null;
      hoverEl = null;
    }

    if (e.data.type === 'inspect-highlight') {
      // Highlight a specific selector from parent
      var target = document.querySelector(e.data.selector);
      if (target && selectBox) {
        selectedEl = target;
        positionOverlay(selectBox, target);
      }
    }

    if (e.data.type === 'inspect-update-text') {
      // Parent wants to update text of selected element
      if (selectedEl && e.data.text !== undefined) {
        // Find first text node and update
        for (var i = 0; i < selectedEl.childNodes.length; i++) {
          if (selectedEl.childNodes[i].nodeType === 3 && selectedEl.childNodes[i].textContent.trim()) {
            selectedEl.childNodes[i].textContent = e.data.text;
            break;
          }
        }
      }
    }

    if (e.data.type === 'inspect-update-style') {
      // Parent wants to live-preview a style change
      if (selectedEl && e.data.property && e.data.value !== undefined) {
        selectedEl.style[e.data.property] = e.data.value;
        positionOverlay(selectBox, selectedEl);
      }
    }
  });

  // ── Hover ──
  document.addEventListener('mousemove', function(e) {
    if (!inspectEnabled) return;
    var target = document.elementFromPoint(e.clientX, e.clientY);
    if (shouldIgnore(target)) return;
    if (target === hoverEl) return;
    hoverEl = target;
    positionOverlay(overlayBox, target);
  }, true);

  // ── Click ──
  document.addEventListener('click', function(e) {
    if (!inspectEnabled) return;
    var target = document.elementFromPoint(e.clientX, e.clientY);
    if (shouldIgnore(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    selectedEl = target;
    positionOverlay(selectBox, target);

    var data = getElementData(target);
    if (data) {
      window.parent.postMessage({
        source: 'd3inspect',
        type: 'element-selected',
        element: data,
      }, '*');
    }
  }, true);

  // ── Resize handler — update overlays ──
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (hoverEl && overlayBox) positionOverlay(overlayBox, hoverEl);
      if (selectedEl && selectBox) positionOverlay(selectBox, selectedEl);
    }, 100);
  });

  // ── Scroll handler ──
  window.addEventListener('scroll', function() {
    if (hoverEl && overlayBox) positionOverlay(overlayBox, hoverEl);
    if (selectedEl && selectBox) positionOverlay(selectBox, selectedEl);
  }, true);

  // ── Notify parent that bridge is loaded ──
  window.parent.postMessage({
    source: 'd3inspect',
    type: 'bridge-ready',
  }, '*');
})();
`;

/**
 * Returns the file map entry to write the bridge script into the sandbox.
 * Call sandboxManager.writeFiles(projectId, { [path]: content })
 */
export function getInspectBridgeFile(): { path: string; content: string } {
  return {
    path: "public/__d3_inspect__.js",
    content: PREVIEW_BRIDGE_SCRIPT,
  };
}

/**
 * Returns the <script> tag to inject into a Next.js layout.tsx or similar.
 * This should be added before </body>.
 */
export const INSPECT_SCRIPT_TAG = '<script src="/__d3_inspect__.js" defer></script>';

/**
 * Given a set of project files, finds the root layout and returns a modified
 * version with the inspect bridge script tag injected. Returns all files
 * that need to be written to the sandbox (bridge JS + modified layout).
 *
 * Returns null if no layout file is found or it already has the script.
 */
export function getInspectBridgeFiles(
  projectFiles: { path: string; content: string }[]
): Record<string, string> {
  const result: Record<string, string> = {};

  // Always include the bridge JS file
  result["public/__d3_inspect__.js"] = PREVIEW_BRIDGE_SCRIPT;

  // Find root layout file (try common Next.js paths)
  const layoutPaths = [
    "src/app/layout.tsx",
    "app/layout.tsx",
    "src/app/layout.jsx",
    "app/layout.jsx",
    "src/app/layout.js",
    "app/layout.js",
  ];

  for (const lp of layoutPaths) {
    const layoutFile = projectFiles.find((f) => f.path === lp);
    if (layoutFile) {
      // Check if already injected
      if (layoutFile.content.includes("__d3_inspect__")) break;

      // Inject before </body> or before closing tag of body
      let modified = layoutFile.content;
      if (modified.includes("</body>")) {
        modified = modified.replace(
          "</body>",
          `${INSPECT_SCRIPT_TAG}\n</body>`
        );
      } else if (modified.includes("{children}")) {
        // App Router layout with {children} — inject after children
        modified = modified.replace(
          "{children}",
          `{children}\n            <script src="/__d3_inspect__.js" defer />`
        );
      }

      if (modified !== layoutFile.content) {
        result[lp] = modified;
      }
      break;
    }
  }

  return result;
}
