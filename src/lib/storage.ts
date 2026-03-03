import { Project } from "./types";
import { NextExportFile } from "./next-export";

export interface SavedProject {
  id: string;
  name: string;
  savedAt: number;
  project: Project;
  planningDocs: PlanningDoc[];
  generatedFiles: NextExportFile[];
}

export interface PlanningDoc {
  id: string;
  title: string;
  content: string;
  blueprint?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

const PROJECTS_KEY = "d3studio.projects";
const ACTIVE_PROJECT_KEY = "d3studio.active-project";

export function loadProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProject(saved: SavedProject): void {
  try {
    const all = loadProjects();
    const idx = all.findIndex((p) => p.id === saved.id);
    if (idx >= 0) {
      all[idx] = saved;
    } else {
      all.unshift(saved);
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all.slice(0, 20)));
  } catch {
    // ignore
  }
}

export function deleteProject(id: string): void {
  try {
    const all = loadProjects().filter((p) => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {
    // ignore
  }
}

export function createPlanningDoc(title: string, content: string): PlanningDoc {
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
