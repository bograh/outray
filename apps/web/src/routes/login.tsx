import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleLogin = async (provider: "github" | "google") => {
    setLoading(provider);
    await authClient.signIn.social({
      provider,
      callbackURL: "/dash",
      newUserCallbackURL: "/onboarding",
    });
    setLoading(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to your account to continue
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => handleLogin("github")}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {loading === "github" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FaGithub className="h-5 w-5" />
            )}
            Continue with GitHub
          </button>

          <button
            onClick={() => handleLogin("google")}
            disabled={loading !== null}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {loading === "google" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FaGoogle className="h-5 w-5" />
            )}
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
