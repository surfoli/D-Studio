"use client";

import { createContext, useContext } from "react";
import {
  Project,
  Page,
  SelectedElement,
  EditorMode,
  ZoomLevel,
  BlockVariant,
} from "./types";

export interface EditorState {
  project: Project | null;
  mode: EditorMode;
  zoomLevel: ZoomLevel;
  selectedElement: SelectedElement | null;
  activePageId: string | null;
  canvasPosition: { x: number; y: number };
  canvasScale: number;
}

export interface EditorActions {
  setProject: (project: Project) => void;
  setMode: (mode: EditorMode) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  selectElement: (element: SelectedElement | null) => void;
  setActivePage: (pageId: string | null) => void;
  setCanvasPosition: (pos: { x: number; y: number }) => void;
  setCanvasScale: (scale: number) => void;
  updateBlockContent: (
    pageId: string,
    blockId: string,
    content: Record<string, string>
  ) => void;
  swapBlockVariant: (
    pageId: string,
    blockId: string,
    variant: BlockVariant
  ) => void;
  moveBlock: (pageId: string, blockId: string, direction: "up" | "down") => void;
  addPage: (page: Page) => void;
  removePage: (pageId: string) => void;
}

export type EditorContextType = EditorState & EditorActions;

export const EditorContext = createContext<EditorContextType | null>(null);

export function useEditor(): EditorContextType {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}

export const initialState: EditorState = {
  project: null,
  mode: "onboarding",
  zoomLevel: "overview",
  selectedElement: null,
  activePageId: null,
  canvasPosition: { x: 0, y: 0 },
  canvasScale: 0.45,
};
