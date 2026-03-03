import { describe, it, expect, beforeEach } from "vitest";
import { genProjectId, loadProjectList, saveProjectList } from "@/lib/project-store";

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("genProjectId", () => {
  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => genProjectId()));
    expect(ids.size).toBe(100);
  });

  it("starts with proj_ prefix", () => {
    expect(genProjectId()).toMatch(/^proj_/);
  });
});

describe("loadProjectList", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns empty array when no data", () => {
    expect(loadProjectList()).toEqual([]);
  });

  it("returns parsed projects", () => {
    const projects = [
      { id: "proj_1", name: "Test", createdAt: 0, updatedAt: 0 },
    ];
    localStorageMock.setItem("d3studio.v2.projects", JSON.stringify(projects));
    expect(loadProjectList()).toEqual(projects);
  });

  it("returns empty array on corrupt JSON", () => {
    localStorageMock.setItem("d3studio.v2.projects", "not-json");
    expect(loadProjectList()).toEqual([]);
  });
});

describe("saveProjectList", () => {
  beforeEach(() => localStorageMock.clear());

  it("persists projects", () => {
    const projects = [{ id: "proj_1", name: "Test", createdAt: 0, updatedAt: 0 }];
    saveProjectList(projects);
    expect(loadProjectList()).toEqual(projects);
  });

  it("caps at 50 projects", () => {
    const projects = Array.from({ length: 60 }, (_, i) => ({
      id: `proj_${i}`,
      name: `Project ${i}`,
      createdAt: 0,
      updatedAt: 0,
    }));
    saveProjectList(projects);
    expect(loadProjectList().length).toBe(50);
  });
});
