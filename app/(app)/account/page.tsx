"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useCreditsStore } from "@/lib/store/credits-store";

type Transaction = {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
};

type Generation = {
  id: string;
  action: string;
  model: string;
  status: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
};

type PageState =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      email: string | null;
      credits: number;
      resetAt: string | null;
      transactions: Transaction[];
      generations: Generation[];
    };

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (cancelled) return;
      if (!user) {
        setState({ kind: "guest" });
        return;
      }
      try {
        const [profileResult, transactionsResult, generationsResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("ai_credits, credits_reset_at")
              .single(),
            supabase
              .from("credit_transactions")
              .select("id, delta, reason, created_at")
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("ai_generations")
              .select(
                "id, action, model, status, prompt_tokens, completion_tokens, cost_usd, created_at",
              )
              .order("created_at", { ascending: false })
              .limit(10),
          ]);
        if (cancelled) return;
        const profile = profileResult.data as {
          ai_credits: number;
          credits_reset_at: string;
        } | null;
        if (!profile) {
          setState({ kind: "error", message: "Unable to load your profile." });
          return;
        }
        useCreditsStore
          .getState()
          .setCredits(profile.ai_credits, profile.credits_reset_at ?? null);
        setState({
          kind: "ready",
          email: user.email ?? null,
          credits: profile.ai_credits,
          resetAt: profile.credits_reset_at ?? null,
          transactions: (transactionsResult.data ?? []) as Transaction[],
          generations: (generationsResult.data ?? []) as Generation[],
        });
      } catch {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Unable to load account details.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.ok) {
        setDeleteError(
          payload?.error?.message ??
            `Unable to delete account (${response.status}).`,
        );
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/");
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Account</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/editor">
            <ArrowLeft aria-hidden />
            Editor
          </Link>
        </Button>
      </div>

      {state.kind === "loading" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : null}

      {state.kind === "guest" ? (
        <div className="rounded-xl border p-4 text-sm">
          <p className="font-medium">You are not signed in</p>
          <p className="text-muted-foreground mt-1">
            Sign in to view your credits and history. Sign-in will be available
            at launch.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/login">Go to sign in</Link>
          </Button>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="border-destructive/40 text-destructive rounded-xl border p-4 text-sm">
          {state.message}
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">{state.email ?? "User"}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span>
                AI credits: <strong>{state.credits}</strong>
              </span>
              <span className="text-muted-foreground">
                Reset: {formatDate(state.resetAt)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">Credits history</p>
            {state.transactions.length === 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                No transactions yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {state.transactions.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-muted-foreground">
                      {transaction.reason}
                    </span>
                    <span
                      className={
                        transaction.delta < 0
                          ? "text-destructive"
                          : "text-emerald-500"
                      }
                    >
                      {transaction.delta > 0
                        ? `+${transaction.delta}`
                        : transaction.delta}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-medium">AI generations (last 10)</p>
            {state.generations.length === 0 ? (
              <p className="text-muted-foreground mt-1 text-xs">
                No generations yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {state.generations.map((generation) => (
                  <li
                    key={generation.id}
                    className="flex justify-between gap-2"
                  >
                    <span>{generation.action}</span>
                    <span className="text-muted-foreground truncate">
                      {generation.model}
                    </span>
                    <span
                      className={
                        generation.status === "success"
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }
                    >
                      {generation.status}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(generation.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-destructive/40 rounded-xl border p-4">
            <p className="text-destructive text-sm font-medium">
              Delete account
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              All your projects, uploads and generations will be permanently
              deleted.
            </p>
            {deleteError ? (
              <p className="text-destructive mt-2 text-xs">{deleteError}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              {confirmDelete ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={() => void onDelete()}
                  >
                    {deleting ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Trash2 aria-hidden />
                    )}
                    Confirm delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 aria-hidden />
                  Delete account
                </Button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
