import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CircuitBoard,
  Clock3,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  deleteSavedProject,
  listSavedProjects,
  type SavedCircuitProject,
} from "./projectStorage";

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SavedCircuitProject[]>([]);

  const refresh = () => {
    setProjects(listSavedProjects());
  };

  useEffect(() => {
    refresh();
  }, []);

  const openProject = (id: string) => {
    navigate("/?project=" + encodeURIComponent(id));
  };

  const createProject = () => {
    navigate("/");
  };

  const removeProject = (id: string) => {
    const project = projects.find((item) => item.id === id);
    if (!project) return;

    const confirmed = window.confirm(
      'Delete "' + project.name + '"? This cannot be undone.',
    );

    if (!confirmed) return;

    deleteSavedProject(id);
    refresh();
  };

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#070b12]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
              title="Back to circuit editor"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <h1 className="text-lg font-semibold">My Projects</h1>
              <p className="text-xs text-slate-500">
                Saved circuits and Arduino sketches
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={createProject}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Plus size={17} />
            New Project
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8">
        {projects.length === 0 ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-cyan-400">
              <FolderOpen size={30} />
            </div>

            <h2 className="text-base font-semibold">
              No saved projects yet
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Build a circuit, write your Arduino code, then press Save.
              Your project will appear here.
            </p>

            <button
              type="button"
              onClick={createProject}
              className="mt-5 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <CircuitBoard size={17} />
              Start building
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="group overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111c] shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-cyan-500/40"
              >
                <button
                  type="button"
                  onClick={() => openProject(project.id)}
                  className="block w-full text-left"
                >
                  <div className="relative h-40 overflow-hidden border-b border-slate-800 bg-slate-950">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name + " circuit preview"}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_60%)]">
                        <CircuitBoard
                          size={48}
                          className="text-cyan-400/70 transition group-hover:scale-105 group-hover:text-cyan-300"
                        />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-black/50 to-transparent" />
                  </div>

                  <div className="p-4">
                    <h2 className="truncate text-sm font-semibold text-slate-100">
                      {project.name}
                    </h2>

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>{project.nodes.length} components</span>
                      <span>{project.edges.length} wires</span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Clock3 size={12} />
                      {formatDate(project.updatedAt)}
                    </div>
                  </div>
                </button>

                <div className="border-t border-slate-800 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => removeProject(project.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400/80 transition hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
