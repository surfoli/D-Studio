// ── Central Project Store ──
// Single source of truth for the active project and all project-level state.
// All modes (Plan, Design, Build, History) read from and write to this store.

import type { DesignBrief } from "./design-brief";
import { createDesignBrief, saveDesignBrief, loadDesignBrief } from "./design-brief";
import { saveHistory } from "./history";

export interface D3Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectList {
  projects: D3Project[];
  activeId: string | null;
}

const PROJECTS_KEY = "d3studio.v2.projects";
const ACTIVE_KEY = "d3studio.v2.active";
const BRIEF_KEY_PREFIX = "d3studio.brief.";
const HISTORY_KEY_PREFIX = "d3studio.history.";
const FILES_KEY_PREFIX = "d3studio.files.";

// ── Helpers ──

export function genProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Project List ──

export function loadProjectList(): D3Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as D3Project[];
  } catch {
    return [];
  }
}

export function saveProjectList(projects: D3Project[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 50)));
  } catch {}
}

// ── Active Project ──

export function getActiveProjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

// ── Per-project Brief ──

export function loadProjectBrief(projectId: string): DesignBrief | null {
  try {
    const raw = localStorage.getItem(BRIEF_KEY_PREFIX + projectId);
    if (!raw) return null;
    return JSON.parse(raw) as DesignBrief;
  } catch {
    return null;
  }
}

export function saveProjectBrief(projectId: string, brief: DesignBrief): void {
  try {
    localStorage.setItem(BRIEF_KEY_PREFIX + projectId, JSON.stringify(brief));
  } catch {}
}

// ── Per-project Files (Build mode) ──

export function loadProjectFiles(projectId: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(FILES_KEY_PREFIX + projectId);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export function saveProjectFiles(projectId: string, files: Record<string, string>): void {
  try {
    localStorage.setItem(FILES_KEY_PREFIX + projectId, JSON.stringify(files));
  } catch {}
}

// ── Per-project History key ──

export function getProjectHistoryKey(projectId: string): string {
  return HISTORY_KEY_PREFIX + projectId;
}

// ── Create new project ──

export function createProject(name = "Neues Projekt"): { project: D3Project; brief: DesignBrief } {
  const id = genProjectId();
  const now = Date.now();
  const project: D3Project = { id, name, createdAt: now, updatedAt: now };
  const brief = createDesignBrief();
  brief.name = name;

  const projects = loadProjectList();
  projects.unshift(project);
  saveProjectList(projects);
  saveProjectBrief(id, brief);
  setActiveProjectId(id);

  return { project, brief };
}

// ── Delete project ──

export function deleteProject(id: string): void {
  try {
    const projects = loadProjectList().filter((p) => p.id !== id);
    saveProjectList(projects);
    localStorage.removeItem(BRIEF_KEY_PREFIX + id);
    localStorage.removeItem(FILES_KEY_PREFIX + id);
    localStorage.removeItem(HISTORY_KEY_PREFIX + id);

    // If deleted was active, switch to next
    if (getActiveProjectId() === id) {
      const next = projects[0];
      if (next) {
        setActiveProjectId(next.id);
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    }
  } catch {}
}

// ── Rename project ──

export function renameProject(id: string, name: string): void {
  try {
    const projects = loadProjectList();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], name, updatedAt: Date.now() };
      saveProjectList(projects);
    }
  } catch {}
}

// ── Bootstrap: ensure at least one project exists ──
// Returns { projectId, brief } for the active project.

export function bootstrapProject(): { projectId: string; brief: DesignBrief } {
  let activeId = getActiveProjectId();
  const projects = loadProjectList();

  // Migrate legacy brief if no projects exist yet
  if (projects.length === 0) {
    const legacyBrief = loadDesignBrief(); // old global key
    const { project, brief: newBrief } = createProject("Mein Projekt");
    if (legacyBrief) {
      saveProjectBrief(project.id, legacyBrief);
      return { projectId: project.id, brief: legacyBrief };
    }
    return { projectId: project.id, brief: newBrief };
  }

  // If active ID is stale, use first project
  if (!activeId || !projects.find((p) => p.id === activeId)) {
    activeId = projects[0].id;
    setActiveProjectId(activeId);
  }

  const brief = loadProjectBrief(activeId) ?? createDesignBrief();
  return { projectId: activeId, brief };
}
