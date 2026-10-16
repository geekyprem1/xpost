import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import {
  EXPORT_MAX_AGE_MS,
  UPLOAD_MAX_AGE_MS,
  createHandle,
  selectStaleFiles,
  type StorageEntry,
} from "./handle.ts";

const NOW = Date.UTC(2026, 9, 16, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

function isoAgo(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

Deno.test("selectStaleFiles: purane files chunte hain, fresh nahi", () => {
  const entries: StorageEntry[] = [
    { name: "old.png", updated_at: isoAgo(31 * DAY) },
    { name: "fresh.png", updated_at: isoAgo(2 * DAY) },
    { name: "created-old.png", created_at: isoAgo(40 * DAY) },
    { name: "no-stamp.png" },
  ];
  const stale = selectStaleFiles(entries, NOW, UPLOAD_MAX_AGE_MS);
  assertEquals(stale.sort(), ["created-old.png", "old.png"]);
});

function fakeAdmin(
  buckets: Record<string, { folders: string[]; files: Record<string, StorageEntry[]> }>
) {
  const removed: Array<{ bucket: string; paths: string[] }> = [];
  const admin = {
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string) => {
          const data = buckets[bucket];
          if (!data) return { data: [] };
          if (prefix === "") {
            return { data: data.folders.map((name) => ({ name, id: null })) };
          }
          return { data: data.files[prefix] ?? [] };
        },
        remove: async (paths: string[]) => {
          removed.push({ bucket, paths });
          return { data: null };
        },
      }),
    },
  } as unknown as SupabaseClient;
  return { admin, removed };
}

Deno.test("uploads-cleanup: secret missing → 503, galat → 401", async () => {
  const { admin } = fakeAdmin({});
  const handler = createHandle({ admin: () => admin, now: () => NOW, secret: () => null });
  const missing = await handler(new Request("http://x", { method: "POST" }));
  assertEquals(missing.status, 503);

  const withSecret = createHandle({
    admin: () => admin,
    now: () => NOW,
    secret: () => "right-secret",
  });
  const wrong = await withSecret(
    new Request("http://x", { method: "POST", headers: { "x-cron-secret": "wrong" } })
  );
  assertEquals(wrong.status, 401);
});

Deno.test("uploads-cleanup: stale files remove hote hain (dono buckets)", async () => {
  const { admin, removed } = fakeAdmin({
    uploads: {
      folders: ["user-1", "user-2"],
      files: {
        "user-1": [
          { name: "old.png", updated_at: isoAgo(31 * DAY) },
          { name: "fresh.png", updated_at: isoAgo(1 * DAY) },
        ],
        "user-2": [{ name: "old2.png", updated_at: isoAgo(45 * DAY) }],
      },
    },
    exports: {
      folders: ["user-1"],
      files: {
        "user-1": [
          { name: "staged.jpg", updated_at: isoAgo(2 * DAY) },
          { name: "new.jpg", updated_at: isoAgo(1 * 60 * 60 * 1000) },
        ],
      },
    },
  });
  const handler = createHandle({
    admin: () => admin,
    now: () => NOW,
    secret: () => "right-secret",
  });
  const response = await handler(
    new Request("http://x", { method: "POST", headers: { "x-cron-secret": "right-secret" } })
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.uploadsDeleted, 2);
  assertEquals(body.exportsDeleted, 1);
  assertEquals(body.foldersScanned, 3);

  const uploadPaths = removed
    .filter((entry) => entry.bucket === "uploads")
    .flatMap((entry) => entry.paths)
    .sort();
  assertEquals(uploadPaths, ["user-1/old.png", "user-2/old2.png"]);
  const exportPaths = removed
    .filter((entry) => entry.bucket === "exports")
    .flatMap((entry) => entry.paths);
  assertEquals(exportPaths, ["user-1/staged.jpg"]);
  assertEquals(EXPORT_MAX_AGE_MS < UPLOAD_MAX_AGE_MS, true);
});

Deno.test("uploads-cleanup: khali buckets pe bhi ok", async () => {
  const { admin } = fakeAdmin({ uploads: { folders: [], files: {} } });
  const handler = createHandle({
    admin: () => admin,
    now: () => NOW,
    secret: () => "s",
  });
  const response = await handler(
    new Request("http://x", { method: "POST", headers: { "x-cron-secret": "s" } })
  );
  const body = await response.json();
  assertEquals(body.ok, true);
  assertEquals(body.uploadsDeleted, 0);
});
