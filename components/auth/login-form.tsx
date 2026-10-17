"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup" | "magic";

export function LoginForm({ initialError }: { initialError: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  function changeMode(next: Mode) {
    setMode(next);
    setPassword("");
    setShowPassword(false);
    setMessage(null);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const address = email.trim();
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: address,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });
        if (error) throw error;
        setMessage("Sign-in link sent. Check your inbox to continue.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setPassword("");
        if (data.session) {
          router.replace("/editor");
          router.refresh();
        } else {
          setMessage(
            "Check your inbox to confirm your email, then sign in with your password.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: address,
          password,
        });
        if (error) throw error;
        setPassword("");
        router.replace("/editor");
        router.refresh();
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-busy={busy}>
      <div className="grid grid-cols-2 gap-2" aria-label="Account options">
        <Button
          type="button"
          variant={mode !== "signup" ? "secondary" : "outline"}
          className="h-11"
          aria-pressed={mode !== "signup"}
          disabled={busy}
          onClick={() => changeMode("signin")}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "secondary" : "outline"}
          className="h-11"
          aria-pressed={mode === "signup"}
          disabled={busy}
          onClick={() => changeMode("signup")}
        >
          Create account
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
          placeholder="you@example.com"
          value={email}
          disabled={busy}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {mode !== "magic" ? (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              className="h-11 pr-12"
              value={password}
              disabled={busy}
              aria-describedby={mode === "signup" ? "password-hint" : undefined}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              className="absolute top-0 right-0 h-11 w-11"
              disabled={busy}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
          {mode === "signup" ? (
            <p id="password-hint" className="text-muted-foreground text-xs">
              Use at least 8 characters.
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {message}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Please wait...
          </>
        ) : mode === "signup" ? (
          "Create account"
        ) : mode === "magic" ? (
          "Send sign-in link"
        ) : (
          "Sign in"
        )}
      </Button>
      {mode !== "signup" ? (
        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground h-11 w-full"
          disabled={busy}
          onClick={() => changeMode(mode === "magic" ? "signin" : "magic")}
        >
          {mode === "magic"
            ? "Use email and password"
            : "Use a magic link instead"}
        </Button>
      ) : null}
      <p className="text-muted-foreground text-center text-xs">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </form>
  );
}
