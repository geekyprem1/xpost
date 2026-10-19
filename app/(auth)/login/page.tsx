import Image from "next/image";
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
          <Image
            src="/logos/shotlark-flight.svg"
            width={64}
            height={64}
            alt=""
            className="mx-auto rounded-2xl bg-[#f0ecfc] p-2"
          />
          <h1 className="text-xl font-semibold">Shotlark</h1>
          <p className="text-muted-foreground text-sm">
            Sign in with your Google account to continue.
          </p>
        </div>
        <LoginForm
          initialError={
            error ? "Sign-in didn't complete. Please try again." : null
          }
        />
      </div>
    </main>
  );
}
