"use client";

import { useState } from "react";
import { Globe, Lock, Copy, Check } from "lucide-react";
import { PixelSpinner } from "@/components/pixel-ui";
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
        <div className="border-2 border-[var(--pixel-success)] bg-[color-mix(in_srgb,var(--pixel-success)_12%,var(--pixel-bg-surface))] p-4">
          <p className="text-sm font-medium text-[var(--pixel-success)]">
            Group created! Share this invite code with friends:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-3 py-2 font-mono text-sm text-[var(--pixel-text-primary)]">
              {inviteCode}
            </code>
            <button
              onClick={handleCopyCode}
              className="pixel-btn pixel-btn-success pixel-btn-sm"
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
          className="pixel-btn pixel-btn-primary pixel-btn-sm"
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
          className="block text-sm font-medium text-[var(--pixel-text-secondary)]"
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
          className="mt-1 w-full border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-3 py-2 text-sm text-[var(--pixel-text-primary)]"
        />
        {nameError && <p className="mt-1 text-xs text-[var(--pixel-error)]">{nameError}</p>}
        <p className="mt-1 text-xs text-[var(--pixel-text-muted)]">{name.length}/30 characters</p>
      </div>

      {/* Visibility toggle */}
      <div>
        <span className="block text-sm font-medium text-[var(--pixel-text-secondary)]">
          Visibility
        </span>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setVisibility("public")}
            className={`inline-flex flex-1 items-center justify-center gap-2 border-2 px-3 py-2 text-sm font-medium transition-[filter] ${
              visibility === "public"
                ? "border-[var(--pixel-accent)] bg-[color-mix(in_srgb,var(--pixel-accent)_14%,var(--pixel-bg-surface))] text-[var(--pixel-accent)]"
                : "border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] pixel-hover-brighten"
            }`}
          >
            <Globe className="h-4 w-4" />
            Public
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`inline-flex flex-1 items-center justify-center gap-2 border-2 px-3 py-2 text-sm font-medium transition-[filter] ${
              visibility === "private"
                ? "border-[var(--pixel-accent)] bg-[color-mix(in_srgb,var(--pixel-accent)_14%,var(--pixel-bg-surface))] text-[var(--pixel-accent)]"
                : "border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] pixel-hover-brighten"
            }`}
          >
            <Lock className="h-4 w-4" />
            Private
          </button>
        </div>
        <p className="mt-1 text-xs text-[var(--pixel-text-muted)]">
          {visibility === "public"
            ? "Anyone can find and join your group"
            : "Only people with an invite code can join"}
        </p>
      </div>

      {/* Server error */}
      {serverError && <p className="text-sm text-[var(--pixel-error)]">{serverError}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="pixel-btn pixel-btn-primary pixel-btn-sm"
        >
          {isSubmitting && <PixelSpinner size={5} />}
          {isSubmitting ? "Creating..." : "Create Group"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="pixel-btn pixel-btn-secondary pixel-btn-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
