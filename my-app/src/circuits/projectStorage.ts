import type { Edge, Node } from "reactflow";

export const PROJECT_STORAGE_KEY = "rde-circuit-projects-v1";

export type SavedCircuitProject = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  nodes: Node[];
  edges: Edge[];
  code: string;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeNodes(nodes: Node[]): Node[] {
  return clone(nodes).map((node) => ({
    ...node,
    data: {
      ...(node.data ?? {}),
      simulation: undefined,
    },
  }));
}

function readProjects(): SavedCircuitProject[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (project): project is SavedCircuitProject =>
        Boolean(
          project &&
          typeof project.id === "string" &&
          typeof project.name === "string" &&
          Array.isArray(project.nodes) &&
          Array.isArray(project.edges) &&
          typeof project.code === "string",
        ),
    );
  } catch {
    return [];
  }
}

function writeProjects(projects: SavedCircuitProject[]): void {
  window.localStorage.setItem(
    PROJECT_STORAGE_KEY,
    JSON.stringify(projects),
  );
}

export function listSavedProjects(): SavedCircuitProject[] {
  return readProjects().sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export function getSavedProject(id: string): SavedCircuitProject | null {
  return readProjects().find((project) => project.id === id) ?? null;
}

export function saveCircuitProject(input: {
  id?: string | null;
  name: string;
  nodes: Node[];
  edges: Edge[];
  code: string;
  viewport?: SavedCircuitProject["viewport"];
}): SavedCircuitProject {
  const now = Date.now();
  const projects = readProjects();

  const existingIndex = input.id
    ? projects.findIndex((project) => project.id === input.id)
    : -1;

  const project: SavedCircuitProject = {
    id:
      existingIndex >= 0
        ? projects[existingIndex].id
        : `project-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name:
      input.name.trim() ||
      `Untitled Circuit ${new Date(now).toLocaleDateString()}`,
    createdAt:
      existingIndex >= 0
        ? projects[existingIndex].createdAt
        : now,
    updatedAt: now,
    nodes: sanitizeNodes(input.nodes),
    edges: clone(input.edges),
    code: input.code,
    viewport: input.viewport ? { ...input.viewport } : undefined,
  };

  if (existingIndex >= 0) {
    projects[existingIndex] = project;
  } else {
    projects.push(project);
  }

  writeProjects(projects);
  return project;
}

export function deleteSavedProject(id: string): void {
  writeProjects(
    readProjects().filter((project) => project.id !== id),
  );
}
