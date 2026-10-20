"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteProject,
  duplicateProject,
  listProjects,
  renameProject,
  type ProjectSummary,
} from "@/lib/projects/project-api";
import { deleteProjectCache } from "@/lib/projects/project-cache";
import { MAX_PROJECT_TITLE, PROJECTS_MAX } from "@/lib/projects/project-model";
import { projectHref } from "@/lib/projects/project-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; userId: string; projects: ProjectSummary[] };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ProjectCard({
  project,
  busy,
  onRename,
  onDuplicate,
  onDelete,
}: {
  project: ProjectSummary;
  busy: boolean;
  onRename: (title: string) => Promise<boolean>;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <Link
        href={projectHref(project.id)}
        className="bg-muted focus-visible:ring-ring relative block aspect-[16/10] outline-none focus-visible:ring-2"
        aria-label={`Open ${project.title}`}
      >
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img
            src={project.thumbnailUrl}
            alt=""
            className="size-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-muted-foreground flex size-full items-center justify-center">
            <ImageIcon aria-hidden className="size-6" />
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              void onRename(draft).then((ok) => {
                if (ok) setEditing(false);
              });
            }}
          >
            <Input
              autoFocus
              value={draft}
              maxLength={MAX_PROJECT_TITLE}
              aria-label={`Rename ${project.title}`}
              className="h-8 text-sm"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraft(project.title);
                  setEditing(false);
                }
              }}
            />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              aria-label="Save name"
              disabled={busy}
            >
              <Check aria-hidden />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Cancel rename"
              onClick={() => {
                setDraft(project.title);
                setEditing(false);
              }}
            >
              <X aria-hidden />
            </Button>
          </form>
        ) : (
          <div className="min-w-0">
            <Link
              href={projectHref(project.id)}
              className="block truncate text-sm font-medium hover:underline"
            >
              {project.title}
            </Link>
            <p className="text-muted-foreground text-xs">
              Edited {formatDate(project.updatedAt)}
            </p>
          </div>
        )}

        {confirmDelete ? (
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <span className="text-xs">Delete this project?</span>
            <Button
              size="xs"
              variant="destructive"
              disabled={busy}
              onClick={onDelete}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Delete
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Rename ${project.title}`}
              title="Rename"
              disabled={busy}
              onClick={() => {
                setDraft(project.title);
                setEditing(true);
              }}
            >
              <Pencil aria-hidden />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Duplicate ${project.title}`}
              title="Duplicate"
              disabled={busy}
              onClick={onDuplicate}
            >
              <Copy aria-hidden />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Delete ${project.title}`}
              title="Delete"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = createSupabaseBrowserClient();
    const { data } = await client.auth.getUser();
    if (!data.user) {
      router.replace("/login");
      return;
    }
    try {
      const projects = await listProjects(client);
      setState({ kind: "ready", userId: data.user.id, projects });
    } catch (reason) {
      setState({
        kind: "error",
        message:
          reason instanceof Error
            ? reason.message
            : "Projects could not be loaded.",
      });
    }
  }, [router]);

  useEffect(() => {
    // Data fetch on mount; setState happens after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(id: string, work: () => Promise<void>) {
    setBusyId(id);
    setActionError(null);
    try {
      await work();
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Something went wrong.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const ready = state.kind === "ready" ? state : null;
  const atLimit = ready ? ready.projects.length >= PROJECTS_MAX : false;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Projects</h1>
          {ready ? (
            <p className="text-muted-foreground text-xs">
              {ready.projects.length} / {PROJECTS_MAX} projects
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/editor">
              <ArrowLeft aria-hidden />
              Editor
            </Link>
          </Button>
          {atLimit ? (
            <Button size="sm" disabled>
              <Plus aria-hidden />
              New project
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link href="/editor">
                <Plus aria-hidden />
                New project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {atLimit ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          You have reached {PROJECTS_MAX} projects. Delete one to create a new
          project.
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" className="text-destructive text-sm">
          {actionError}
        </p>
      ) : null}

      {state.kind === "loading" ? (
        <p
          role="status"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading projects…
        </p>
      ) : state.kind === "error" ? (
        <div className="border-destructive/40 text-destructive flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4 text-sm">
          <span role="alert">{state.message}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : state.projects.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm">
          <p className="font-medium">No projects yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Add a screenshot in the editor and it is saved here automatically.
          </p>
          <Button size="sm" className="mt-4" asChild>
            <Link href="/editor">
              <Plus aria-hidden />
              New project
            </Link>
          </Button>
        </div>
      ) : (
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Your projects"
        >
          {state.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              busy={busyId === project.id}
              onRename={async (title) => {
                let ok = false;
                await run(project.id, async () => {
                  const next = await renameProject(
                    createSupabaseBrowserClient(),
                    project.id,
                    title,
                  );
                  ok = true;
                  setState((current) =>
                    current.kind === "ready"
                      ? {
                          ...current,
                          projects: current.projects.map((item) =>
                            item.id === project.id
                              ? { ...item, title: next }
                              : item,
                          ),
                        }
                      : current,
                  );
                });
                return ok;
              }}
              onDuplicate={() =>
                void run(project.id, async () => {
                  await duplicateProject(
                    createSupabaseBrowserClient(),
                    state.userId,
                    project.id,
                  );
                  await load();
                })
              }
              onDelete={() =>
                void run(project.id, async () => {
                  await deleteProject(
                    createSupabaseBrowserClient(),
                    state.userId,
                    project.id,
                  );
                  await deleteProjectCache(project.id);
                  setState((current) =>
                    current.kind === "ready"
                      ? {
                          ...current,
                          projects: current.projects.filter(
                            (item) => item.id !== project.id,
                          ),
                        }
                      : current,
                  );
                })
              }
            />
          ))}
        </ul>
      )}
    </main>
  );
}
