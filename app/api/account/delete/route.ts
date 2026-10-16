import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const instant = false;

const BUCKETS = ["uploads", "exports"];

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

    for (const bucket of BUCKETS) {
      const { data: files } = await admin.storage
        .from(bucket)
        .list(user.id, { limit: 1000 });
      if (files && files.length > 0) {
        await admin.storage
          .from(bucket)
          .remove(files.map((file) => `${user.id}/${file.name}`));
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json(
        { error: { code: "DELETE_FAILED", message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (reason) {
    return NextResponse.json(
      {
        error: {
          code: "DELETE_FAILED",
          message:
            reason instanceof Error
              ? reason.message
              : "Unable to delete your account.",
        },
      },
      { status: 500 },
    );
  }
}
