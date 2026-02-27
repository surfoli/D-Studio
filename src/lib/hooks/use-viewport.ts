import { useState, useCallback, useEffect } from "react";

export function useViewportWidths() {
  const [baseDpr] = useState(() =>
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );

  const readCssWidth = useCallback(() => {
    if (typeof window === "undefined") return 1280;
    return window.visualViewport?.width ?? window.innerWidth;
  }, []);

  const readStableWidth = useCallback(() => {
    if (typeof window === "undefined") return 1280;
    const width = window.visualViewport?.width ?? window.innerWidth;
    const dpr = window.devicePixelRatio || 1;
    const zoomFactor = baseDpr ? dpr / baseDpr : 1;
    return width * zoomFactor;
  }, [baseDpr]);

  const [cssWidth, setCssWidth] = useState(readCssWidth);
  const [stableWidth, setStableWidth] = useState(readStableWidth);

  useEffect(() => {
    const handleResize = () => {
      setCssWidth(readCssWidth());
      setStableWidth(readStableWidth());
    };

    window.addEventListener("resize", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    }

    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      }
    };
  }, [readCssWidth, readStableWidth]);

  return { cssWidth, stableWidth };
}
