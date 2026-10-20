import type { SupabaseClient } from "@supabase/supabase-js";
import { migrateScene, type Scene } from "@/lib/scene";
import {
  DEFAULT_PROJECT_TITLE,
  PROJECTS_BUCKET,
  ProjectError,
  duplicateTitle,
  isOwnProjectPath,
  isProjectId,
  normalizeProjectTitle,
  projectFolder,
  sourceImagePath,
  thumbnailPath,
} from "./project-model";

/**
 * Client-side project CRUD (RLS: "projects: own all"; Storage: own folder).
 * Secrets nahi — user JWT + publishable key. Har function ProjectError throw
 * karta hai taaki UI ek hi tarah handle kare.
 */

export type ProjectSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  thumbnailUrl: string | null;
};

export type ProjectRecord = {
  id: string;
  userId: string;
  title: string;
  scene: Scene;
  postText: string;
  postVersions: string[];
  sourceImagePath: string | null;
  thumbnailPath: string | null;
  updatedAt: string;
};

type Row = {
  id: string;
  user_id: string;
  title: string;
  editor_state: unknown;
  post_text: string | null;
  post_versions: unknown;
  source_image_path: string | null;
  thumbnail_path: string | null;
  updated_at: string;
  created_at: string;
};

const SIGNED_URL_SECONDS = 60 * 60;

function failure(
  error: { code?: string; message?: string } | null,
  fallback: string,
): ProjectError {
  const message = error?.message ?? "";
  if (message.includes("PROJECTS_LIMIT_REACHED")) {
    return new ProjectError(
      "LIMIT_REACHED",
      "You have reached 50 projects. Delete a project to create a new one.",
    );
  }
  if (
    error?.code === "PGRST301" ||
    error?.code === "42501" ||
    /JWT|not authenticated/i.test(message)
  ) {
    return new ProjectError(
      "UNAUTHENTICATED",
      "Your session has expired. Sign in again.",
    );
  }
  if (error?.code === "22P02")
    return new ProjectError("NOT_FOUND", "This project does not exist.");
  return new ProjectError("NETWORK", fallback);
}

async function attempt<T>(
  work: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ProjectError) throw error;
    throw new ProjectError("NETWORK", fallback);
  }
}

function parseRow(row: Row): ProjectRecord {
  const { scene, warning } = migrateScene(row.editor_state);
  if (warning) {
    throw new ProjectError(
      "INVALID",
      "This project was saved in a format this editor cannot open.",
    );
  }
  const versions = Array.isArray(row.post_versions)
    ? row.post_versions.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || DEFAULT_PROJECT_TITLE,
    scene,
    postText: row.post_text ?? "",
    postVersions: versions,
    sourceImagePath:
      row.source_image_path &&
      isOwnProjectPath(row.source_image_path, row.user_id, row.id)
        ? row.source_image_path
        : null,
    thumbnailPath: row.thumbnail_path,
    updatedAt: row.updated_at,
  };
}

const ROW_COLUMNS =
  "id, user_id, title, editor_state, post_text, post_versions, source_image_path, thumbnail_path, updated_at, created_at";

function randomToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(-12);
}

/** Scene ko DB ke liye: image path storage path ho, `local/…` nahi. */
function sceneForStorage(scene: Scene, imagePath: string | null): Scene {
  if (!scene.image) return scene;
  return {
    ...scene,
    image: { ...scene.image, path: imagePath ?? scene.image.path },
  };
}

// ── List / read ──────────────────────────────────────────────────────

export async function listProjects(
  client: SupabaseClient,
): Promise<ProjectSummary[]> {
  return attempt(async () => {
    const { data, error } = await client
      .from("projects")
      .select("id, title, updated_at, created_at, thumbnail_path")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw failure(error, "Projects could not be loaded.");
    const rows = (data ?? []) as Array<
      Pick<Row, "id" | "title" | "updated_at" | "created_at" | "thumbnail_path">
    >;
    const paths = rows
      .map((row) => row.thumbnail_path)
      .filter((path): path is string => Boolean(path));
    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await client.storage
        .from(PROJECTS_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
      }
    }
    return rows.map((row) => ({
      id: row.id,
      title: row.title || DEFAULT_PROJECT_TITLE,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      thumbnailUrl: row.thumbnail_path
        ? (urls.get(row.thumbnail_path) ?? null)
        : null,
    }));
  }, "Projects could not be loaded.");
}

export async function getProject(
  client: SupabaseClient,
  projectId: string,
): Promise<ProjectRecord> {
  if (!isProjectId(projectId))
    throw new ProjectError("NOT_FOUND", "This project does not exist.");
  return attempt(async () => {
    const { data, error } = await client
      .from("projects")
      .select(ROW_COLUMNS)
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw failure(error, "The project could not be loaded.");
    // RLS: doosre user ka project bhi "not found" hi dikhta hai.
    if (!data)
      throw new ProjectError("NOT_FOUND", "This project does not exist.");
    return parseRow(data as Row);
  }, "The project could not be loaded.");
}

export async function downloadProjectImage(
  client: SupabaseClient,
  path: string,
): Promise<Blob> {
  return attempt(async () => {
    const { data, error } = await client.storage
      .from(PROJECTS_BUCKET)
      .download(path);
    if (error || !data)
      throw new ProjectError(
        "NETWORK",
        "The project screenshot could not be downloaded.",
      );
    return data;
  }, "The project screenshot could not be downloaded.");
}

// ── Create / save ────────────────────────────────────────────────────

async function uploadSource(
  client: SupabaseClient,
  userId: string,
  projectId: string,
  image: Blob,
): Promise<string> {
  const path = sourceImagePath(userId, projectId, image.type, randomToken());
  const { error } = await client.storage
    .from(PROJECTS_BUCKET)
    .upload(path, image, {
      contentType: image.type,
      upsert: false,
      cacheControl: "3600",
    });
  if (error)
    throw new ProjectError("NETWORK", "The screenshot could not be uploaded.");
  return path;
}

async function removeFiles(client: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  // Best effort: ek stray file storage mein reh jaaye to bhi user flow na toote.
  await client.storage
    .from(PROJECTS_BUCKET)
    .remove(paths)
    .catch(() => undefined);
}

export type CreateProjectInput = {
  userId: string;
  title: string;
  scene: Scene;
  postText: string;
  image: Blob | null;
};

export type SavedProject = {
  id: string;
  updatedAt: string;
  imagePath: string | null;
};

/** Row pehle (limit trigger), phir upload — limit pe koi orphan file nahi. */
export async function createProject(
  client: SupabaseClient,
  input: CreateProjectInput,
): Promise<SavedProject> {
  return attempt(async () => {
    const id = crypto.randomUUID();
    const title = normalizeProjectTitle(input.title) || DEFAULT_PROJECT_TITLE;
    const { error } = await client.from("projects").insert({
      id,
      user_id: input.userId,
      title,
      editor_state: sceneForStorage(input.scene, null),
      post_text: input.postText,
    });
    if (error) throw failure(error, "The project could not be created.");

    let imagePath: string | null = null;
    try {
      if (input.image)
        imagePath = await uploadSource(client, input.userId, id, input.image);
      const { data, error: updateError } = await client
        .from("projects")
        .update({
          source_image_path: imagePath,
          editor_state: sceneForStorage(input.scene, imagePath),
        })
        .eq("id", id)
        .select("updated_at")
        .single();
      if (updateError || !data)
        throw failure(updateError, "The project could not be created.");
      return {
        id,
        updatedAt: (data as { updated_at: string }).updated_at,
        imagePath,
      };
    } catch (reason) {
      await client.from("projects").delete().eq("id", id);
      if (imagePath) await removeFiles(client, [imagePath]);
      throw reason;
    }
  }, "The project could not be created.");
}

export type SaveProjectInput = {
  userId: string;
  projectId: string;
  /** Server `updated_at` these edits are based on; mismatch → CONFLICT. */
  baseUpdatedAt: string;
  /** Overwrite even if the cloud copy changed (user picked "keep mine"). */
  force?: boolean;
  scene: Scene;
  postText: string;
  /** Blob = new screenshot to upload, null = screenshot removed, undefined = unchanged. */
  image?: Blob | null;
  currentImagePath: string | null;
  thumbnail?: Blob | null;
};

export async function saveProject(
  client: SupabaseClient,
  input: SaveProjectInput,
): Promise<SavedProject> {
  return attempt(async () => {
    let imagePath = input.currentImagePath;
    let uploaded: string | null = null;
    if (input.image instanceof Blob) {
      uploaded = await uploadSource(
        client,
        input.userId,
        input.projectId,
        input.image,
      );
      imagePath = uploaded;
    } else if (input.image === null) {
      imagePath = null;
    }

    let thumb: string | undefined;
    if (input.thumbnail) {
      thumb = thumbnailPath(input.userId, input.projectId);
      const { error } = await client.storage
        .from(PROJECTS_BUCKET)
        .upload(thumb, input.thumbnail, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "60",
        });
      if (error) thumb = undefined; // Thumbnail optional; save continue.
    }

    const patch: Record<string, unknown> = {
      editor_state: sceneForStorage(input.scene, imagePath),
      post_text: input.postText,
      source_image_path: imagePath,
    };
    if (thumb) patch.thumbnail_path = thumb;

    let query = client.from("projects").update(patch).eq("id", input.projectId);
    if (!input.force) query = query.eq("updated_at", input.baseUpdatedAt);
    const { data, error } = await query.select("updated_at").maybeSingle();
    if (error || !data) {
      if (uploaded) await removeFiles(client, [uploaded]);
      if (error) throw failure(error, "Your changes could not be saved.");
      // 0 rows: kisi aur tab / device ne pehle save kiya (ya project delete hua).
      throw new ProjectError(
        "CONFLICT",
        "This project was changed somewhere else.",
      );
    }
    // Purani screenshot file ab kisi row ki nahi.
    if (input.currentImagePath && input.currentImagePath !== imagePath) {
      await removeFiles(client, [input.currentImagePath]);
    }
    return {
      id: input.projectId,
      updatedAt: (data as { updated_at: string }).updated_at,
      imagePath,
    };
  }, "Your changes could not be saved.");
}

// ── Dashboard actions ────────────────────────────────────────────────

export async function renameProject(
  client: SupabaseClient,
  projectId: string,
  title: string,
): Promise<string> {
  const next = normalizeProjectTitle(title);
  if (!next) throw new ProjectError("INVALID", "Enter a project name.");
  return attempt(async () => {
    const { error } = await client
      .from("projects")
      .update({ title: next })
      .eq("id", projectId);
    if (error) throw failure(error, "The project could not be renamed.");
    return next;
  }, "The project could not be renamed.");
}

async function listFolder(
  client: SupabaseClient,
  folder: string,
): Promise<string[]> {
  const { data, error } = await client.storage
    .from(PROJECTS_BUCKET)
    .list(folder, { limit: 100 });
  if (error)
    throw new ProjectError("NETWORK", "Project files could not be listed.");
  return (data ?? [])
    .filter((entry) => entry.id !== null)
    .map((entry) => `${folder}/${entry.name}`);
}

export async function deleteProject(
  client: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<void> {
  return attempt(async () => {
    // Files pehle: row delete ke baad folder ka owner check nahi bachta.
    const paths = await listFolder(client, projectFolder(userId, projectId));
    if (paths.length > 0) {
      const { error } = await client.storage
        .from(PROJECTS_BUCKET)
        .remove(paths);
      if (error)
        throw new ProjectError(
          "NETWORK",
          "Project files could not be deleted.",
        );
    }
    const { error } = await client
      .from("projects")
      .delete()
      .eq("id", projectId);
    if (error) throw failure(error, "The project could not be deleted.");
  }, "The project could not be deleted.");
}

export async function duplicateProject(
  client: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<string> {
  return attempt(async () => {
    const source = await getProject(client, projectId);
    const id = crypto.randomUUID();
    const { error } = await client.from("projects").insert({
      id,
      user_id: userId,
      title: duplicateTitle(source.title),
      editor_state: source.scene,
      post_text: source.postText,
      post_versions: source.postVersions,
    });
    if (error) throw failure(error, "The project could not be duplicated.");

    const copied: string[] = [];
    try {
      let imagePath: string | null = null;
      if (source.sourceImagePath) {
        const ext = source.sourceImagePath.split(".").pop() ?? "png";
        imagePath = `${projectFolder(userId, id)}/source-${randomToken()}.${ext}`;
        const { error: copyError } = await client.storage
          .from(PROJECTS_BUCKET)
          .copy(source.sourceImagePath, imagePath);
        if (copyError)
          throw new ProjectError(
            "NETWORK",
            "The screenshot could not be copied.",
          );
        copied.push(imagePath);
      }
      let thumb: string | null = null;
      if (source.thumbnailPath) {
        thumb = thumbnailPath(userId, id);
        const { error: thumbError } = await client.storage
          .from(PROJECTS_BUCKET)
          .copy(source.thumbnailPath, thumb);
        if (thumbError) thumb = null;
        else copied.push(thumb);
      }
      const { error: updateError } = await client
        .from("projects")
        .update({
          source_image_path: imagePath,
          thumbnail_path: thumb,
          editor_state: sceneForStorage(source.scene, imagePath),
        })
        .eq("id", id);
      if (updateError)
        throw failure(updateError, "The project could not be duplicated.");
      return id;
    } catch (reason) {
      await client.from("projects").delete().eq("id", id);
      await removeFiles(client, copied);
      throw reason;
    }
  }, "The project could not be duplicated.");
}
