"use client";

import { useActionState } from "react";
import { signup } from "@/app/(auth)/_actions/auth";
import Link from "next/link";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center">
          <img
            src="/sprites/travel-book/icons/Book.png"
            alt=""
            width={32}
            height={32}
            className="pixel-art mx-auto mb-3"
          />
          <h1 className="font-pixel text-2xl tracking-tight" style={{ color: "#f0e6d2" }}>
            Create your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8b7355" }}>
            Your Pokémon companion is ready to meet you 🐾
          </p>
        </div>

        {/* Form */}
        <div className="pixel-panel" style={{ padding: "24px" }}>
          <form action={action} className="space-y-4">
            {state?.message && (
              <div
                className="p-3 text-sm"
                style={{
                  border: "2px solid var(--pixel-error, #c45a58)",
                  color: "var(--pixel-error, #c45a58)",
                  backgroundColor: "color-mix(in srgb, #c45a58 10%, #1a1410)",
                }}
              >
                {state.message}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="font-pixel text-xs"
                style={{ color: "#c4a882" }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 text-sm"
                style={{
                  border: "2px solid #3d2817",
                  backgroundColor: "#241c14",
                  color: "#f0e6d2",
                  outline: "none",
                }}
                placeholder="you@example.com"
              />
              {state?.errors?.email && (
                <p className="text-xs" style={{ color: "#c45a58" }}>
                  {state.errors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="font-pixel text-xs"
                style={{ color: "#c4a882" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 text-sm"
                style={{
                  border: "2px solid #3d2817",
                  backgroundColor: "#241c14",
                  color: "#f0e6d2",
                  outline: "none",
                }}
                placeholder="6 characters or more"
              />
              {state?.errors?.password && (
                <div className="text-xs" style={{ color: "#c45a58" }}>
                  <p>Password must:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {state.errors.password.map((err: string) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="pixel-btn pixel-btn-primary w-full"
            >
              {pending ? "Creating account..." : "Enter Nora ✨"}
            </button>

            <p className="text-center text-xs" style={{ color: "#5a4a35" }}>
              Free forever. No credit card required.
            </p>
          </form>
        </div>

        <p className="text-center text-sm" style={{ color: "#8b7355" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-pixel text-xs"
            style={{ color: "#d4a526" }}
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
