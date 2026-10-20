/**
 * Projects & cloud save (PRD PJ-1…PJ-7) — pure helpers, no I/O.
 * Storage layout (`uploads` bucket, private):
 *   {uid}/{projectId}/source-{token}.{ext}   screenshot (token → no overwrite on conflict)
 *   {uid}/{projectId}/thumb.webp             dashboard thumbnail (DB check enforces path)
 */

export const PROJECTS_BUCKET = "uploads";
export const PROJECTS_MAX = 50;
export const MAX_PROJECT_TITLE = 80;
export const DEFAULT_PROJECT_TITLE = "Untitled";

export type ProjectErrorCode =
  | "NOT_FOUND"
  | "LIMIT_REACHED"
  | "CONFLICT"
  | "UNAUTHENTICATED"
  | "INVALID"
  | "NETWORK";

export class ProjectError extends Error {
  readonly code: ProjectErrorCode;
  constructor(code: ProjectErrorCode, message: string) {
    super(message);
    this.name = "ProjectError";
    this.code = code;
  }
}

export function isProjectError(
  error: unknown,
  code?: ProjectErrorCode,
): error is ProjectError {
  return (
    error instanceof ProjectError && (code === undefined || error.code === code)
  );
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProjectId(value: string): boolean {
  return UUID.test(value);
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function imageExtension(mime: string): string {
  const ext = EXT_BY_MIME[mime];
  if (!ext)
    throw new ProjectError(
      "INVALID",
      "Only PNG, JPG and WebP screenshots can be saved.",
    );
  return ext;
}

export function projectFolder(userId: string, projectId: string): string {
  return `${userId}/${projectId}`;
}

export function sourceImagePath(
  userId: string,
  projectId: string,
  mime: string,
  token: string,
): string {
  const safeToken = token.replace(/[^a-z0-9]/gi, "").slice(0, 16) || "0";
  return `${projectFolder(userId, projectId)}/source-${safeToken}.${imageExtension(mime)}`;
}

export function thumbnailPath(userId: string, projectId: string): string {
  return `${projectFolder(userId, projectId)}/thumb.webp`;
}

/** Path must live in this user's own project folder (never trust stored paths blindly). */
export function isOwnProjectPath(
  path: string,
  userId: string,
  projectId: string,
): boolean {
  const folder = `${projectFolder(userId, projectId)}/`;
  return (
    path.startsWith(folder) &&
    !path.slice(folder.length).includes("/") &&
    !path.includes("..")
  );
}

export function normalizeProjectTitle(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, MAX_PROJECT_TITLE);
}

/** "Dashboard final (2).png" → "Dashboard final (2)". */
export function titleFromFileName(name: string | null | undefined): string {
  if (!name) return DEFAULT_PROJECT_TITLE;
  const base = name.replace(/^local\//, "").replace(/\.[a-z0-9]{2,5}$/i, "");
  const title = normalizeProjectTitle(base.replace(/[_-]+/g, " "));
  if (
    !title ||
    /^(restored screenshot|screenshot|image|untitled)$/i.test(title)
  ) {
    return DEFAULT_PROJECT_TITLE;
  }
  return title;
}

export function duplicateTitle(title: string): string {
  return normalizeProjectTitle(`${title} copy`);
}

/**
 * Project kholte waqt kaunsa version load ho (PJ-4).
 * - cache nahi → server
 * - cache usi server version pe based → cache (unsynced edits ya fast open)
 * - cache purane version pe + unsynced edits → conflict (user chune)
 * - cache purana + clean → server
 */
export type OpenDecision = "server" | "cache" | "conflict";

export function decideOpen(
  serverUpdatedAt: string,
  cache: { baseUpdatedAt: string; dirty: boolean } | null,
): OpenDecision {
  if (!cache) return "server";
  if (sameInstant(cache.baseUpdatedAt, serverUpdatedAt)) return "cache";
  return cache.dirty ? "conflict" : "server";
}

/** Postgres timestamptz strings may differ in format; compare instants. */
export function sameInstant(a: string, b: string): boolean {
  if (a === b) return true;
  const left = Date.parse(a);
  const right = Date.parse(b);
  return Number.isFinite(left) && left === right;
}
