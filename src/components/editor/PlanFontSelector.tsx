"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Palette, GripVertical, ChevronUp } from "lucide-react";

const FONT_CATALOG = [
  "Inter", "Roboto", "Poppins", "Montserrat", "DM Sans", "Space Grotesk",
  "Plus Jakarta Sans", "Outfit", "Sora", "Manrope", "Lato", "Raleway",
  "Playfair Display", "Merriweather", "Open Sans", "Nunito",
];

interface PlanFontSelectorProps {
  label: string;
  currentFont: string;
  onFontChange: (font: string) => void;
  config: { color: string };
  isDark?: boolean;
  hideFrame?: boolean; // Neue Option für unsichtbare Rahmen
}

export function PlanFontSelector({ label, currentFont, onFontChange, config, isDark = false, hideFrame = false }: PlanFontSelectorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showFontNamePicker, setShowFontNamePicker] = useState(false);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fontNameRef = useRef<HTMLDivElement>(null);
  
  const currentIndex = FONT_CATALOG.indexOf(currentFont);
  const validIndex = currentIndex === -1 ? 0 : currentIndex;

  // State für die Breite der Buchstaben-Darstellung
  const [previewWidth, setPreviewWidth] = useState<number>(0);

  useEffect(() => {
    // Breite der Buchstaben-Darstellung messen
    const updatePreviewWidth = () => {
      if (previewRef.current) {
        setPreviewWidth(previewRef.current.offsetWidth);
      }
    };

    updatePreviewWidth();
    window.addEventListener('resize', updatePreviewWidth);
    
    return () => {
      window.removeEventListener('resize', updatePreviewWidth);
    };
  }, [currentFont]);

  // Font descriptions and foundry info
  const fontInfo: Record<string, { description: string; foundry: string; year?: string }> = {
    "Inter": { description: "Optimized for user interfaces", foundry: "Figma Design Team", year: "2022" },
    "Roboto": { description: "Modern, geometric sans-serif", foundry: "Christian Robertson", year: "2011" },
    "Poppins": { description: "Geometric sans-serif with circles", foundry: "Indian Type Foundry", year: "2014" },
    "Montserrat": { description: "Inspired by old posters of Buenos Aires", foundry: "Julieta Ulanovsky", year: "2011" },
    "DM Sans": { description: "Low-contrast geometric sans-serif", foundry: "Colophon Foundry", year: "2019" },
    "Space Grotesk": { description: "Space-age grotesque sans-serif", foundry: "Florian Karsten", year: "2022" },
    "Plus Jakarta Sans": { description: "Modern sans-serif for Jakarta", foundry: "MP Typefoundry", year: "2020" },
    "Outfit": { description: "Geometric sans-serif inspired by Outlier", foundry: "Harbor Type Co", year: "2021" },
    "Sora": { description: "Elegant sans-serif with personality", foundry: "Dalton Maag", year: "2019" },
    "Manrope": { description: "Modern geometric sans-serif", foundry: "Cyril Mikhailenko", year: "2016" },
    "Lato": { description: "Serif-like sans-serif", foundry: "Łukasz Dziedzic", year: "2010" },
    "Raleway": { description: "Elegant sans-serif with style", foundry: "Matt McInerney", year: "2010" },
    "Playfair Display": { description: "High-contrast transitional serif", foundry: "Claus Eggers Sørensen", year: "2011" },
    "Merriweather": { description: "Serif designed for screen reading", foundry: "Eben Sorkin", year: "2013" },
    "Open Sans": { description: "Humanist sans-serif", foundry: "Steve Matteson", year: "2011" },
    "Nunito": { description: "Well-balanced sans-serif", foundry: "Vernon Adams", year: "2012" },
  };

  const currentFontInfo = fontInfo[currentFont] || { description: "Contemporary typeface", foundry: "Unknown Designer" };

  const handleSliderChange = (clientY: number) => {
    if (!previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    const fontIndex = Math.round(percentage * (FONT_CATALOG.length - 1));
    
    onFontChange(FONT_CATALOG[fontIndex]);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsPreviewHovered(false); // Hover-Effekt entfernen beim Klick
    handleSliderChange(e.clientY);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      setShowPicker(!showPicker);
    }
  };

  const handleFontNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFontNamePicker(!showFontNamePicker);
  };

  const handleFontSelect = (fontValue: string) => {
    onFontChange(fontValue);
    setShowPicker(false);
    setShowFontNamePicker(false);
  };

  const handleFontNameSelect = (fontValue: string) => {
    onFontChange(fontValue);
    setShowFontNamePicker(false);
  };

  const handleFontNameMouseLeave = () => {
    setIsHovered(false);
    setShowFontNamePicker(false);
  };

  const handlePreviewMouseEnter = () => {
    setIsPreviewHovered(true);
  };

  const handlePreviewMouseLeave = () => {
    setIsPreviewHovered(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Scrollen deaktivieren
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSliderChange(e.clientY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="py-8" style={{ 
      background: hideFrame ? (isDark ? "#000000" : "#ffffff") : "transparent",
      margin: hideFrame ? "-2rem" : "0",
      padding: hideFrame ? "2rem" : "2rem 0"
    }}>
      {/* Header */}
      <div className="mb-12">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: config.color }}>
          Typography
        </span>
      </div>

      {/* Two-column layout: Info + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Font Info */}
        <div className="space-y-6">
          <div>
            <div 
              ref={fontNameRef}
              className="relative inline-block"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={handleFontNameMouseLeave}
            >
              <h2 
                className={`text-4xl font-light mb-2 transition-all ${
                  isHovered ? 'cursor-pointer opacity-80' : 'cursor-default opacity-100'
                }`}
                style={{ 
                  fontFamily: `'${currentFont}', sans-serif`, 
                  color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)",
                  textDecorationLine: isHovered ? 'underline' : 'none',
                  textDecorationColor: config.color,
                  textDecorationThickness: '1px',
                  textDecorationStyle: 'solid' as const,
                  textUnderlineOffset: '4px'
                }}
                onClick={handleFontNameClick}
              >
                {currentFont}
              </h2>

              {/* Font name dropdown */}
              <AnimatePresence>
                {showFontNamePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
                    style={{ 
                      
                      width: previewWidth > 0 ? `${previewWidth}px` : "auto"
                    }}
                    onMouseEnter={() => setShowFontNamePicker(true)}
                    onMouseLeave={() => setShowFontNamePicker(false)}
                  >
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {FONT_CATALOG.map((font, index) => (
                        <button
                          key={font}
                          onClick={() => handleFontNameSelect(font)}
                          className={`w-full text-left px-3 py-3 rounded transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                            font === currentFont ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300"
                          }`}
                          style={{ 
                            fontFamily: font,
                            fontSize: '4rem', // Gleich groß wie der Font-Name
                            fontWeight: '300', // font-light
                            lineHeight: '1.1',
                            minHeight: '4.5rem' // Mindesthöhe für 4 Buchstaben
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span>{font}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-400 dark:text-gray-500">{index + 1}</span>
                              {font === currentFont && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentFontInfo.year && <span>{currentFontInfo.year} • </span>}
              {currentFontInfo.foundry}
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-base leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)" }}>
              {currentFontInfo.description}
            </p>
            
            <div className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
              Designed by {currentFontInfo.foundry}, this typeface brings contemporary elegance to digital interfaces with careful attention to readability and character.
            </div>
          </div>
        </div>

        {/* Right: Font Preview with interaction */}
        <div className="space-y-8">
          <div 
            ref={previewRef}
            className={`relative ${isPreviewHovered && !isDragging ? 'cursor-ns-resize' : 'cursor-default'} select-none`}
            onMouseEnter={handlePreviewMouseEnter}
            onMouseLeave={handlePreviewMouseLeave}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{ 
              fontFamily: `'${currentFont}', sans-serif`,
              cursor: isDragging ? 'none' : (isPreviewHovered && !isDragging ? 'ns-resize' : 'default')
            }}
          >
            <div className="text-6xl font-light leading-none mb-4" style={{ color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)" }}>
              abcd
            </div>
            <div className="text-3xl font-light leading-tight mb-4" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
              abcdefghijklmnopqrstuvwxyz
            </div>
            <div className="text-2xl font-light leading-tight mb-4" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
              ABCDEFGHIJKLMNOPORSTUVWXYZ
            </div>
            <div className="text-xl font-light leading-tight" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
              0123456789
            </div>

            {/* Hover hint / Counter */}
            {isPreviewHovered && !isDragging && (
              <div className="absolute top-0 right-0 text-xs text-gray-400 dark:text-gray-500">
                Click and drag to change
              </div>
            )}
            {isDragging && (
              <div className="absolute top-0 right-0 text-xs text-gray-400 dark:text-gray-500">
                Font {currentIndex + 1} of {FONT_CATALOG.length}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
