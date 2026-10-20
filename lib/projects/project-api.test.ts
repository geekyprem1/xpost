import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDefaultScene } from "@/lib/scene";
import {
  createProject,
  deleteProject,
  getProject,
  saveProject,
} from "./project-api";
import { isProjectError } from "./project-model";

const UID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Row = Record<string, unknown>;

/**
 * Tiny in-memory stand-in for the supabase-js query builder + storage —
 * sirf wahi chains jo project-api use karta hai. RLS / triggers ko mimic:
 * `limit` rows ke baad insert PROJECTS_LIMIT_REACHED, update pe updated_at bump.
 */
function fakeClient(options: { limit?: number } = {}) {
  const rows = new Map<string, Row>();
  const files = new Map<string, Blob>();
  let clock = 0;
  const stamp = () =>
    `2026-10-20T10:00:${String(++clock).padStart(2, "0")}+00:00`;

  function table() {
    let op: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row = {};
    const filters: Array<[string, unknown]> = [];
    const builder = {
      select: () => builder,
      insert: (value: Row) => {
        op = "insert";
        payload = value;
        return run();
      },
      update: (value: Row) => {
        op = "update";
        payload = value;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      order: () => builder,
      limit: () => run(),
      maybeSingle: () => run("maybe"),
      single: () => run("single"),
      then: (resolve: (value: unknown) => void) => resolve(execute()),
    };
    const matches = () =>
      [...rows.values()].filter((row) =>
        filters.every(([column, value]) => row[column] === value),
      );
    function execute(mode?: "maybe" | "single") {
      if (op === "insert") {
        if (rows.size >= (options.limit ?? 50)) {
          return {
            data: null,
            error: { code: "P0001", message: "PROJECTS_LIMIT_REACHED" },
          };
        }
        const now = stamp();
        rows.set(String(payload.id), {
          post_versions: [],
          thumbnail_path: null,
          ...payload,
          updated_at: now,
          created_at: now,
        });
        return { data: null, error: null };
      }
      const found = matches();
      if (op === "update") {
        for (const row of found)
          Object.assign(row, payload, { updated_at: stamp() });
      }
      if (op === "delete") for (const row of found) rows.delete(String(row.id));
      const data = mode ? (found[0] ?? null) : found;
      if (mode === "single" && !found[0])
        return { data: null, error: { code: "PGRST116", message: "no rows" } };
      return { data, error: null };
    }
    function run(mode?: "maybe" | "single") {
      return Promise.resolve(execute(mode));
    }
    return builder;
  }

  const storage = {
    from: () => ({
      upload: async (path: string, blob: Blob, opts?: { upsert?: boolean }) => {
        if (files.has(path) && !opts?.upsert)
          return { error: { message: "exists" } };
        files.set(path, blob);
        return { error: null };
      },
      remove: async (paths: string[]) => {
        for (const path of paths) files.delete(path);
        return { error: null };
      },
      download: async (path: string) =>
        files.has(path)
          ? { data: files.get(path), error: null }
          : { data: null, error: { message: "missing" } },
      list: async (folder: string) => ({
        data: [...files.keys()]
          .filter((path) => path.startsWith(`${folder}/`))
          .map((path) => ({ id: path, name: path.slice(folder.length + 1) })),
        error: null,
      }),
      copy: async (from: string, to: string) => {
        files.set(to, files.get(from)!);
        return { error: null };
      },
      createSignedUrls: async () => ({ data: [], error: null }),
    }),
  };

  const client = { from: () => table(), storage } as unknown as SupabaseClient;
  return { client, rows, files };
}

const png = () => new Blob(["png-bytes"], { type: "image/png" });

describe("project api", () => {
  beforeEach(() => {
    let n = 0;
    vi.stubGlobal("crypto", {
      randomUUID: () =>
        `dddddddd-dddd-4ddd-8ddd-${String(++n).padStart(12, "0")}`,
    });
  });

  it("create: row + source upload, scene mein storage path", async () => {
    const { client, rows, files } = fakeClient();
    const scene = createDefaultScene();
    scene.image = { path: "local/shot.png", width: 10, height: 10 };
    const created = await createProject(client, {
      userId: UID,
      title: "  Launch  ",
      scene,
      postText: "hi",
      image: png(),
    });
    const row = rows.get(created.id)!;
    expect(row.title).toBe("Launch");
    expect(created.imagePath).toMatch(
      new RegExp(`^${UID}/${created.id}/source-[a-z0-9]+\\.png$`),
    );
    expect(files.has(created.imagePath!)).toBe(true);
    expect((row.editor_state as { image: { path: string } }).image.path).toBe(
      created.imagePath,
    );
    expect(row.updated_at).toBe(created.updatedAt);
  });

  it("limit pe LIMIT_REACHED aur koi file upload nahi", async () => {
    const { client, files } = fakeClient({ limit: 0 });
    await expect(
      createProject(client, {
        userId: UID,
        title: "x",
        scene: createDefaultScene(),
        postText: "",
        image: png(),
      }),
    ).rejects.toSatisfy((error) => isProjectError(error, "LIMIT_REACHED"));
    expect(files.size).toBe(0);
  });

  it("save: base match pe update; stale base pe CONFLICT aur nayi upload rollback", async () => {
    const { client, files } = fakeClient();
    const created = await createProject(client, {
      userId: UID,
      title: "x",
      scene: createDefaultScene(),
      postText: "",
      image: png(),
    });

    const first = await saveProject(client, {
      userId: UID,
      projectId: created.id,
      baseUpdatedAt: created.updatedAt,
      scene: createDefaultScene(),
      postText: "v2",
      currentImagePath: created.imagePath,
    });
    expect(first.updatedAt).not.toBe(created.updatedAt);

    const before = new Set(files.keys());
    await expect(
      saveProject(client, {
        userId: UID,
        projectId: created.id,
        baseUpdatedAt: created.updatedAt, // stale
        scene: createDefaultScene(),
        postText: "other tab",
        image: png(),
        currentImagePath: created.imagePath,
      }),
    ).rejects.toSatisfy((error) => isProjectError(error, "CONFLICT"));
    expect(new Set(files.keys())).toEqual(before);

    const forced = await saveProject(client, {
      userId: UID,
      projectId: created.id,
      baseUpdatedAt: created.updatedAt,
      force: true,
      scene: createDefaultScene(),
      postText: "keep mine",
      currentImagePath: created.imagePath,
    });
    expect((await getProject(client, created.id)).postText).toBe("keep mine");
    expect(forced.updatedAt).not.toBe(first.updatedAt);
  });

  it("naya screenshot: nayi file, purani hat jaati hai; thumbnail fixed path", async () => {
    const { client, files } = fakeClient();
    const created = await createProject(client, {
      userId: UID,
      title: "x",
      scene: createDefaultScene(),
      postText: "",
      image: png(),
    });
    const saved = await saveProject(client, {
      userId: UID,
      projectId: created.id,
      baseUpdatedAt: created.updatedAt,
      scene: createDefaultScene(),
      postText: "",
      image: new Blob(["jpg"], { type: "image/jpeg" }),
      currentImagePath: created.imagePath,
      thumbnail: new Blob(["thumb"], { type: "image/webp" }),
    });
    expect(saved.imagePath).toMatch(/\.jpg$/);
    expect(files.has(created.imagePath!)).toBe(false);
    expect(files.has(saved.imagePath!)).toBe(true);
    expect(files.has(`${UID}/${created.id}/thumb.webp`)).toBe(true);
    expect(saved.thumbnailUploaded).toBe(true);
    expect(await files.get(`${UID}/${created.id}/thumb.webp`)!.text()).toBe(
      "thumb",
    );
  });

  it("create ke saath thumbnail: file + thumbnail_path set", async () => {
    const { client, files, rows } = fakeClient();
    const created = await createProject(client, {
      userId: UID,
      title: "x",
      scene: createDefaultScene(),
      postText: "",
      image: png(),
      thumbnail: new Blob(["t0"], { type: "image/webp" }),
    });
    expect(created.thumbnailUploaded).toBe(true);
    expect(rows.get(created.id)!.thumbnail_path).toBe(
      `${UID}/${created.id}/thumb.webp`,
    );
    expect(await files.get(`${UID}/${created.id}/thumb.webp`)!.text()).toBe(
      "t0",
    );
    const without = await createProject(client, {
      userId: UID,
      title: "y",
      scene: createDefaultScene(),
      postText: "",
      image: null,
    });
    expect(without.thumbnailUploaded).toBe(false);
    expect(rows.get(without.id)!.thumbnail_path).toBeNull();
  });

  it("delete: folder files + row", async () => {
    const { client, rows, files } = fakeClient();
    const created = await createProject(client, {
      userId: UID,
      title: "x",
      scene: createDefaultScene(),
      postText: "",
      image: png(),
    });
    await deleteProject(client, UID, created.id);
    expect(rows.has(created.id)).toBe(false);
    expect(files.size).toBe(0);
  });

  it("getProject: invalid id / missing row → NOT_FOUND", async () => {
    const { client } = fakeClient();
    await expect(getProject(client, "nope")).rejects.toSatisfy((error) =>
      isProjectError(error, "NOT_FOUND"),
    );
    await expect(
      getProject(client, "dddddddd-dddd-4ddd-8ddd-999999999999"),
    ).rejects.toSatisfy((error) => isProjectError(error, "NOT_FOUND"));
  });
});
