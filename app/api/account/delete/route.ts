import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

const BUCKETS = ["uploads", "exports"];
const PAGE_SIZE = 1000;
const REMOVE_BATCH = 1000;

/**
 * Lists every object under `prefix`, recursing into sub-folders and paging
 * through results. Storage `list()` returns folders as entries with `id: null`.
 */
async function listAllPaths(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        paths.push(...(await listAllPaths(admin, bucket, path)));
      } else {
        paths.push(path);
      }
    }
    if (entries.length < PAGE_SIZE) break;
  }
  return paths;
}

async function deleteUserFiles(admin: SupabaseClient, userId: string) {
  for (const bucket of BUCKETS) {
    const paths = await listAllPaths(admin, bucket, userId);
    for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
      const { error } = await admin.storage
        .from(bucket)
        .remove(paths.slice(i, i + REMOVE_BATCH));
      if (error) throw new Error(`remove ${bucket}: ${error.message}`);
    }
  }
}

function deleteFailed() {
  return NextResponse.json(
    {
      error: {
        code: "DELETE_FAILED",
        message: "Unable to delete your account. Please try again.",
      },
    },
    { status: 500 },
  );
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Login required" } },
      { status: 401 },
    );
  }

  try {
    const admin = createSupabaseAdminClient();

    // Files must be gone before the user is: if cleanup fails we abort so the
    // user can retry, instead of leaving orphaned files with no owner.
    await deleteUserFiles(admin, user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error("deleteUser failed:", error.message);
      return deleteFailed();
    }

    return NextResponse.json({ ok: true });
  } catch (reason) {
    console.error("account delete failed:", reason);
    return deleteFailed();
  }
}
