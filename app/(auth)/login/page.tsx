import { LoginForm } from "@/components/auth/login-form";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold">Shotlark</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your email. We will send you a sign-in link.
          </p>
        </div>
        <LoginForm
          initialError={
            error === "link"
              ? "This link is invalid or expired. Request a new sign-in link."
              : null
          }
        />
      </div>
    </main>
  );
}
