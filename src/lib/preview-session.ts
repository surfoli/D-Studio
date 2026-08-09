export type PreviewRuntimeStatus =
  | "idle"
  | "booting"
  | "ready"
  | "installing"
  | "starting"
  | "running"
  | "error";

export interface ProjectPreviewState {
  projectId: string;
  url: string | null;
  status: PreviewRuntimeStatus;
  updatedAt: number;
}

const PREVIEW_KEY_PREFIX = "d3studio.preview.";

function previewKey(projectId: string): string {
  return `${PREVIEW_KEY_PREFIX}${projectId}`;
}

export function loadProjectPreview(projectId: string): ProjectPreviewState | null {
  try {
    const raw = localStorage.getItem(previewKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as ProjectPreviewState;
  } catch {
    return null;
  }
}

export function saveProjectPreview(state: ProjectPreviewState): void {
  try {
    localStorage.setItem(previewKey(state.projectId), JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function clearProjectPreview(projectId: string): void {
  try {
    localStorage.removeItem(previewKey(projectId));
  } catch {
    // ignore storage errors
  }
}
