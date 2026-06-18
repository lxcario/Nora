"use client";

import { useState } from "react";
import { Globe, Lock, Loader2, Copy, Check } from "lucide-react";
import { createParty } from "../../_actions/party";

interface CreatePartyFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Validates a party name client-side: 3-30 chars, only alphanumeric + space/hyphen/underscore.
 */
function validateName(name: string): string | null {
  if (name.length < 3) {
    return "Group name must be at least 3 characters";
  }
  if (name.length > 30) {
    return "Group name must be at most 30 characters";
  }
  if (!/^[a-zA-Z0-9 \-_]+$/.test(name)) {
    return "Only letters, numbers, spaces, hyphens, and underscores allowed";
  }
  return null;
}

export function CreatePartyForm({ onSuccess, onCancel }: CreatePartyFormProps) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (value.length > 0) {
      setNameError(validateName(value));
    } else {
      setNameError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const error = validateName(name);
    if (error) {
      setNameError(error);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createParty({ name: name.trim(), visibility });

      if (result.error) {
        setServerError(result.error);
        return;
      }

      if (result.data) {
        if (visibility === "private" && result.data.inviteCode) {
          setInviteCode(result.data.inviteCode);
        } else {
          onSuccess?.();
        }
      }
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: user can manually select the code
    }
  }

  // After successful private party creation — show invite code
  if (inviteCode) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Group created! Share this invite code with friends:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 font-mono text-sm dark:border-green-700 dark:bg-zinc-800">
              {inviteCode}
            </code>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
        <button
          onClick={() => onSuccess?.()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Party name */}
      <div>
        <label
          htmlFor="party-name"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Group Name
        </label>
        <input
          id="party-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Study Squad"
          maxLength={30}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
        <p className="mt-1 text-xs text-zinc-400">{name.length}/30 characters</p>
      </div>

      {/* Visibility toggle */}
      <div>
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Visibility
        </span>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setVisibility("public")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              visibility === "public"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <Globe className="h-4 w-4" />
            Public
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              visibility === "private"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <Lock className="h-4 w-4" />
            Private
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {visibility === "public"
            ? "Anyone can find and join your group"
            : "Only people with an invite code can join"}
        </p>
      </div>

      {/* Server error */}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Creating..." : "Create Group"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
