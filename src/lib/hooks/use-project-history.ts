import { useReducer, useCallback } from "react";
import type { Project } from "../types";
import { generateProject } from "../project-generator";

const HISTORY_LIMIT = 120;

export type ProjectUpdater = (project: Project) => Project;

interface ProjectHistoryState {
  project: Project;
  undoStack: Project[];
  redoStack: Project[];
}

type ProjectHistoryAction =
  | { type: "apply"; updater: ProjectUpdater }
  | { type: "replace"; project: Project }
  | { type: "undo" }
  | { type: "redo" };

function projectHistoryReducer(
  state: ProjectHistoryState,
  action: ProjectHistoryAction
): ProjectHistoryState {
  if (action.type === "undo") {
    if (state.undoStack.length === 0) return state;
    return {
      project: state.undoStack[state.undoStack.length - 1],
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, state.project].slice(-HISTORY_LIMIT),
    };
  }

  if (action.type === "redo") {
    if (state.redoStack.length === 0) return state;
    return {
      project: state.redoStack[state.redoStack.length - 1],
      undoStack: [...state.undoStack, state.project].slice(-HISTORY_LIMIT),
      redoStack: state.redoStack.slice(0, -1),
    };
  }

  const nextProject =
    action.type === "replace" ? action.project : action.updater(state.project);

  if (nextProject === state.project) return state;

  return {
    project: nextProject,
    undoStack: [...state.undoStack, state.project].slice(-HISTORY_LIMIT),
    redoStack: [],
  };
}

function createInitialHistoryState(): ProjectHistoryState {
  return {
    project: generateProject("D³ Studio", "agency", "clean-light"),
    undoStack: [],
    redoStack: [],
  };
}

export function useProjectHistory() {
  const [state, dispatch] = useReducer(
    projectHistoryReducer,
    undefined,
    createInitialHistoryState
  );

  const apply = useCallback((updater: ProjectUpdater) => {
    dispatch({ type: "apply", updater });
  }, []);

  const replace = useCallback((project: Project) => {
    dispatch({ type: "replace", project });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);

  return {
    project: state.project,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    apply,
    replace,
    undo,
    redo,
  };
}
