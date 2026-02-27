"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Link,
  Image as ImageIcon,
  Trash2,
  Check,
  FolderOpen,
  Search,
} from "lucide-react";
import {
  Asset,
  loadAssets,
  addAsset,
  removeAsset,
  STOCK_SECTIONS,
  fileToDataUrl,
  getImageDimensions,
} from "@/lib/assets";

interface Props {
  isOpen: boolean;
  currentImage?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

type Tab = "upload" | "url" | "library";

export default function ImagePicker({
  isOpen,
  currentImage,
  onSelect,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("library");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAssets(loadAssets());
    }
  }, [isOpen]);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);
      setUploadError(null);

      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) {
            setUploadError("Nur Bilddateien erlaubt");
            continue;
          }

          // Check file size (max 5MB for localStorage)
          if (file.size > 5 * 1024 * 1024) {
            setUploadError("Bild zu groß (max 5MB)");
            continue;
          }

          // Convert to data URL for localStorage storage
          const dataUrl = await fileToDataUrl(file);
          let dimensions = { width: 0, height: 0 };
          try {
            dimensions = await getImageDimensions(dataUrl);
          } catch {
            // Ignore dimension errors
          }

          const asset = addAsset({
            name: file.name,
            url: dataUrl,
            type: "image",
            width: dimensions.width,
            height: dimensions.height,
            size: file.size,
            isExternal: false,
          });

          setAssets((prev) => [asset, ...prev]);
          setActiveTab("library"); // Switch to library to show uploaded image
        }
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadError("Upload fehlgeschlagen");
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) return;

    const asset = addAsset({
      name: urlInput.split("/").pop() || "External Image",
      url: urlInput.trim(),
      type: "image",
      isExternal: true,
    });

    setAssets((prev) => [asset, ...prev]);
    onSelect(urlInput.trim());
    setUrlInput("");
  }, [urlInput, onSelect]);

  const handleDeleteAsset = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeAsset(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const q = searchQuery.toLowerCase();
  const filteredSections = STOCK_SECTIONS
    .map((section) => ({
      ...section,
      images: section.images.filter(
        (img) => !q || img.name.toLowerCase().includes(q)
      ),
    }))
    .filter((section) => section.images.length > 0);

  if (!isOpen) return null;

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "library", icon: <ImageIcon size={14} />, label: "Bibliothek" },
    { id: "upload", icon: <Upload size={14} />, label: "Hochladen" },
    { id: "url", icon: <Link size={14} />, label: "URL" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
          >
            <h2 className="text-[15px] font-semibold" style={{ color: "#1a1a1a" }}>
              Bild auswählen
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
              style={{ color: "rgba(0,0,0,0.4)" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex gap-1 px-4 py-2"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: activeTab === tab.id ? "rgba(0,0,0,0.08)" : "transparent",
                  color: activeTab === tab.id ? "#1a1a1a" : "rgba(0,0,0,0.5)",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Library Tab – scrollable sections with headings */}
            {activeTab === "library" && (
              <div className="flex flex-col gap-2">
                {/* Search bar (sticky) */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl sticky top-0 z-10"
                  style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <Search size={14} style={{ color: "rgba(0,0,0,0.35)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Bilder durchsuchen..."
                    className="flex-1 bg-transparent outline-none text-[13px]"
                    style={{ color: "#1a1a1a" }}
                  />
                </div>

                {/* Current Image */}
                {currentImage && (
                  <div className="mb-1 mt-1">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider mb-2 block"
                      style={{ color: "rgba(0,0,0,0.35)" }}
                    >
                      Aktuelles Bild
                    </span>
                    <div
                      className="relative w-24 h-16 rounded-xl overflow-hidden"
                      style={{ border: "2px solid #3b82f6" }}
                    >
                      <img
                        src={currentImage}
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "#3b82f6" }}
                      >
                        <Check size={12} color="#fff" />
                      </div>
                    </div>
                  </div>
                )}

                {/* User Uploads (if any) */}
                {filteredAssets.length > 0 && (
                  <div className="mb-1">
                    <h3
                      className="text-[12px] font-semibold mb-2 mt-1"
                      style={{ color: "rgba(0,0,0,0.6)" }}
                    >
                      Meine Uploads
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5">
                      {filteredAssets.map((asset) => (
                        <div
                          key={asset.id}
                          onClick={() => onSelect(asset.url)}
                          className="relative rounded-xl overflow-hidden cursor-pointer group transition-transform hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            aspectRatio: "16/10",
                            border: currentImage === asset.url
                              ? "2px solid #3b82f6"
                              : "1px solid rgba(0,0,0,0.08)",
                          }}
                        >
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" }}
                          >
                            <span className="text-[11px] text-white truncate flex-1 font-medium">
                              {asset.name}
                            </span>
                            <button
                              onClick={(e) => handleDeleteAsset(asset.id, e)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/90 hover:bg-red-600 transition-colors shrink-0 ml-1"
                            >
                              <Trash2 size={11} color="#fff" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock photo sections */}
                {filteredSections.map((section) => (
                  <div key={section.id} className="mb-1">
                    <h3
                      className="text-[12px] font-semibold mb-2 mt-2"
                      style={{ color: "rgba(0,0,0,0.6)" }}
                    >
                      {section.label}
                    </h3>
                    <div className="grid grid-cols-3 gap-2.5">
                      {section.images.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => onSelect(img.url)}
                          className="relative rounded-xl overflow-hidden cursor-pointer group transition-transform hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            aspectRatio: "16/10",
                            border: currentImage === img.url
                              ? "2px solid #3b82f6"
                              : "1px solid rgba(0,0,0,0.08)",
                          }}
                        >
                          <img
                            src={img.preview}
                            alt={img.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
                            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" }}
                          >
                            <span className="text-[11px] text-white font-medium truncate">
                              {img.name}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredSections.length === 0 && filteredAssets.length === 0 && (
                  <div
                    className="flex flex-col items-center justify-center py-12 text-center"
                    style={{ color: "rgba(0,0,0,0.4)" }}
                  >
                    <FolderOpen size={32} className="mb-3 opacity-40" />
                    <p className="text-[13px]">Keine Bilder gefunden</p>
                    <p className="text-[11px] mt-1 opacity-70">
                      Versuche einen anderen Suchbegriff
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Upload Tab */}
            {activeTab === "upload" && (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-2xl transition-colors cursor-pointer"
                style={{
                  background: dragOver ? "rgba(59,130,246,0.1)" : "rgba(0,0,0,0.03)",
                  border: `2px dashed ${dragOver ? "#3b82f6" : "rgba(0,0,0,0.12)"}`,
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Upload
                  size={32}
                  className="mb-3"
                  style={{ color: dragOver ? "#3b82f6" : "rgba(0,0,0,0.3)" }}
                />
                <p
                  className="text-[14px] font-medium"
                  style={{ color: dragOver ? "#3b82f6" : "rgba(0,0,0,0.7)" }}
                >
                  {isUploading ? "Wird hochgeladen..." : "Bilder hierher ziehen"}
                </p>
                <p className="text-[12px] mt-1" style={{ color: "rgba(0,0,0,0.4)" }}>
                  oder klicken zum Auswählen
                </p>
                <p className="text-[11px] mt-3" style={{ color: "rgba(0,0,0,0.3)" }}>
                  PNG, JPG, GIF, WebP • Max 5MB
                </p>
                {uploadError && (
                  <p className="text-[12px] mt-2 font-medium" style={{ color: "#dc2626" }}>
                    {uploadError}
                  </p>
                )}
              </div>
            )}

            {/* URL Tab */}
            {activeTab === "url" && (
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2 block"
                    style={{ color: "rgba(0,0,0,0.45)" }}
                  >
                    Bild-URL eingeben
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-4 py-3 rounded-xl text-[13px] outline-none"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        color: "#1a1a1a",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUrlSubmit();
                      }}
                    />
                    <button
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim()}
                      className="px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors"
                      style={{
                        background: urlInput.trim() ? "#1a1a1a" : "rgba(0,0,0,0.1)",
                        color: urlInput.trim() ? "#fff" : "rgba(0,0,0,0.3)",
                      }}
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {urlInput && (
                  <div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider mb-2 block"
                      style={{ color: "rgba(0,0,0,0.35)" }}
                    >
                      Vorschau
                    </span>
                    <div
                      className="w-full h-48 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.04)" }}
                    >
                      <img
                        src={urlInput}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
