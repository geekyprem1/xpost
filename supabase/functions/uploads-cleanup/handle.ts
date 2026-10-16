import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { errorResponse, jsonResponse } from "../_shared/errors.ts";
import { isAuthorizedCronRequest } from "../_shared/secret-auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";

export const UPLOAD_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const EXPORT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type StorageEntry = {
  name: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function selectStaleFiles(
  entries: StorageEntry[],
  nowMs: number,
  maxAgeMs: number,
): string[] {
  return entries
    .filter((entry) => {
      const stamp = entry.updated_at ?? entry.created_at;
      if (!stamp) return false;
      const time = new Date(stamp).getTime();
      return Number.isFinite(time) && nowMs - time > maxAgeMs;
    })
    .map((entry) => entry.name);
}

const BUCKETS: Array<{ name: string; maxAgeMs: number }> = [
  { name: "uploads", maxAgeMs: UPLOAD_MAX_AGE_MS },
  { name: "exports", maxAgeMs: EXPORT_MAX_AGE_MS },
];

export type CleanupDeps = {
  admin: () => SupabaseClient;
  now: () => number;
  secret: () => string | null;
};

export function createHandle(overrides: Partial<CleanupDeps> = {}) {
  const deps: CleanupDeps = {
    admin: overrides.admin ?? (() => createAdminClient()),
    now: overrides.now ?? (() => Date.now()),
    secret: overrides.secret ?? (() => Deno.env.get("CRON_SECRET") ?? null),
  };

  return async function handle(request: Request): Promise<Response> {
    const expected = deps.secret();
    if (!expected) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "CRON_SECRET is not configured",
      );
    }
    if (!isAuthorizedCronRequest(request, expected)) {
      return errorResponse("UNAUTHENTICATED", "Invalid cron secret");
    }

    const admin = deps.admin();
    const now = deps.now();
    const summary = { uploadsDeleted: 0, exportsDeleted: 0, foldersScanned: 0 };

    try {
      for (const bucket of BUCKETS) {
        const { data: roots } = await admin.storage
          .from(bucket.name)
          .list("", { limit: 1000 });
        const folders = (roots ?? []).filter(
          (entry) => entry.name && !entry.id,
        );
        for (const folder of folders) {
          summary.foldersScanned++;
          const { data: files } = await admin.storage
            .from(bucket.name)
            .list(folder.name, { limit: 1000 });
          const stale = selectStaleFiles(
            (files ?? []) as StorageEntry[],
            now,
            bucket.maxAgeMs,
          );
          if (stale.length > 0) {
            await admin.storage
              .from(bucket.name)
              .remove(stale.map((name) => `${folder.name}/${name}`));
            if (bucket.name === "uploads") {
              summary.uploadsDeleted += stale.length;
            } else {
              summary.exportsDeleted += stale.length;
            }
          }
        }
      }
      return jsonResponse({ ok: true, ...summary });
    } catch (reason) {
      return errorResponse(
        "UPSTREAM_ERROR",
        reason instanceof Error ? reason.message : "Cleanup failed",
      );
    }
  };
}

export const handle = createHandle();
