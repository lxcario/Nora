"use client";

import { useState } from "react";
import { Settings, Trash2, RefreshCw, Copy, AlertTriangle, Globe, Lock, Check, UserMinus } from "lucide-react";
import { PixelSpinner } from "@/components/pixel-ui";
import {
  updatePartySettings,
  regenerateInviteCode,
  removeMember,
  disbandParty,
} from "../../_actions/party-admin";

// ─── Props ────────────────────────────────────────────────────────────

interface PartyAdminProps {
  partyName: string;
  visibility: "public" | "private";
  inviteCode?: string;
  members: { userId: string; displayName: string }[];
}

// ─── Component ────────────────────────────────────────────────────────

/**
 * Owner-only administration panel for managing party settings,
 * invite codes, members, and disbanding.
 *
 * Requirements: 3.6, 12.1, 12.2, 12.3, 12.5
 */
export function PartyAdmin({ partyName, visibility, inviteCode, members }: PartyAdminProps) {
  // ── Settings state ──
  const [name, setName] = useState(partyName);
  const [vis, setVis] = useState<"public" | "private">(visibility);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // ── Invite code state ──
  const [currentCode, setCurrentCode] = useState(inviteCode);
  const [regenerating, setRegenerating] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState<string | null>(null);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // ── Member removal state ──
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeSuccess, setRemoveSuccess] = useState<string | null>(null);

  // ── Disband state ──
  const [disbanding, setDisbanding] = useState(false);
  const [disbandStep, setDisbandStep] = useState<0 | 1 | 2>(0); // 0=idle, 1=first confirm, 2=final confirm
  const [disbandError, setDisbandError] = useState<string | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    const result = await updatePartySettings({
      name: name.trim(),
      visibility: vis,
    });

    if (result.error) {
      setSettingsError(result.error);
    } else {
      setSettingsSuccess("Settings updated");
      setTimeout(() => setSettingsSuccess(null), 3000);
    }
    setSavingSettings(false);
  }

  async function handleRegenerateCode() {
    if (!confirmRegen) {
      setConfirmRegen(true);
      return;
    }

    setRegenerating(true);
    setRegenError(null);
    setRegenSuccess(null);
    setConfirmRegen(false);

    const result = await regenerateInviteCode();

    if (result.error) {
      setRegenError(result.error);
    } else if (result.data) {
      setCurrentCode(result.data.inviteCode);
      setRegenSuccess("Invite code regenerated");
      setTimeout(() => setRegenSuccess(null), 3000);
    }
    setRegenerating(false);
  }

  async function handleCopyCode() {
    if (!currentCode) return;
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: user can manually select the code
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (removeConfirmId !== memberId) {
      setRemoveConfirmId(memberId);
      return;
    }

    setRemovingId(memberId);
    setRemoveError(null);
    setRemoveSuccess(null);
    setRemoveConfirmId(null);

    const result = await removeMember(memberId);

    if (result.error) {
      setRemoveError(result.error);
    } else {
      setRemoveSuccess("Member removed");
      setTimeout(() => setRemoveSuccess(null), 3000);
    }
    setRemovingId(null);
  }

  async function handleDisband() {
    if (disbandStep === 0) {
      setDisbandStep(1);
      return;
    }
    if (disbandStep === 1) {
      setDisbandStep(2);
      return;
    }

    // Step 2 — actually disband
    setDisbanding(true);
    setDisbandError(null);

    const result = await disbandParty();

    if (result.error) {
      setDisbandError(result.error);
      setDisbanding(false);
      setDisbandStep(0);
    }
    // On success, page will revalidate to discovery view
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pixel-panel p-4">
      {/* ── Edit Settings Section ── */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--pixel-text-secondary)]">
          <Settings className="h-4 w-4" />
          Group Settings
        </h4>

        <div>
          <label
            htmlFor="admin-party-name"
            className="block text-xs font-medium text-[var(--pixel-text-muted)]"
          >
            Group Name
          </label>
          <input
            id="admin-party-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="mt-1 w-full border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-3 py-2 text-sm text-[var(--pixel-text-primary)]"
          />
          <p className="mt-1 text-xs text-[var(--pixel-text-muted)]">{name.length}/30 characters</p>
        </div>

        <div>
          <span className="block text-xs font-medium text-[var(--pixel-text-muted)]">
            Visibility
          </span>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setVis("public")}
              className={`inline-flex flex-1 items-center justify-center gap-2 border-2 px-3 py-2 text-sm font-medium transition-[filter] ${
                vis === "public"
                  ? "border-[var(--pixel-accent)] bg-[color-mix(in_srgb,var(--pixel-accent)_14%,var(--pixel-bg-surface))] text-[var(--pixel-accent)]"
                  : "border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] pixel-hover-brighten"
              }`}
            >
              <Globe className="h-4 w-4" />
              Public
            </button>
            <button
              type="button"
              onClick={() => setVis("private")}
              className={`inline-flex flex-1 items-center justify-center gap-2 border-2 px-3 py-2 text-sm font-medium transition-[filter] ${
                vis === "private"
                  ? "border-[var(--pixel-accent)] bg-[color-mix(in_srgb,var(--pixel-accent)_14%,var(--pixel-bg-surface))] text-[var(--pixel-accent)]"
                  : "border-[var(--pixel-border)] text-[var(--pixel-text-secondary)] pixel-hover-brighten"
              }`}
            >
              <Lock className="h-4 w-4" />
              Private
            </button>
          </div>
        </div>

        {settingsError && <p className="text-xs text-[var(--pixel-error)]">{settingsError}</p>}
        {settingsSuccess && <p className="text-xs text-[var(--pixel-success)]">{settingsSuccess}</p>}

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="pixel-btn pixel-btn-primary pixel-btn-sm"
        >
          {savingSettings && <PixelSpinner size={5} />}
          {savingSettings ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ── Invite Code Section (private parties only) ── */}
      {vis === "private" && (
        <div className="space-y-3 border-t-2 border-[var(--pixel-border)] pt-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--pixel-text-secondary)]">
            <Copy className="h-4 w-4" />
            Invite Code
          </h4>

          {currentCode ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 border-2 border-[var(--pixel-border)] bg-[var(--pixel-bg-primary)] px-3 py-2 font-mono text-sm text-[var(--pixel-text-primary)]">
                {currentCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="pixel-btn pixel-btn-secondary pixel-btn-sm"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-[var(--pixel-success)]" />
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
          ) : (
            <p className="text-xs text-[var(--pixel-text-muted)]">No invite code generated yet.</p>
          )}

          {regenError && <p className="text-xs text-[var(--pixel-error)]">{regenError}</p>}
          {regenSuccess && <p className="text-xs text-[var(--pixel-success)]">{regenSuccess}</p>}

          {confirmRegen ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--pixel-warning)]">
                This will invalidate the current code. Continue?
              </span>
              <button
                onClick={handleRegenerateCode}
                disabled={regenerating}
                className="pixel-btn pixel-btn-primary pixel-btn-sm"
              >
                {regenerating && <PixelSpinner size={4} />}
                Confirm
              </button>
              <button
                onClick={() => setConfirmRegen(false)}
                className="pixel-btn pixel-btn-secondary pixel-btn-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleRegenerateCode}
              disabled={regenerating}
              className="pixel-btn pixel-btn-secondary pixel-btn-sm"
            >
              <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating…" : "Regenerate Code"}
            </button>
          )}
        </div>
      )}

      {/* ── Member Management Section ── */}
      {members.length > 0 && (
        <div className="space-y-3 border-t-2 border-[var(--pixel-border)] pt-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--pixel-text-secondary)]">
            <UserMinus className="h-4 w-4" />
            Manage Members
          </h4>

          {removeError && <p className="text-xs text-[var(--pixel-error)]">{removeError}</p>}
          {removeSuccess && <p className="text-xs text-[var(--pixel-success)]">{removeSuccess}</p>}

          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between border-2 border-[var(--pixel-border)] px-3 py-2"
              >
                <span className="text-sm text-[var(--pixel-text-primary)]">
                  {member.displayName}
                </span>

                {removeConfirmId === member.userId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--pixel-error)]">Remove?</span>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={removingId === member.userId}
                      className="pixel-btn pixel-btn-danger pixel-btn-sm"
                    >
                      {removingId === member.userId && (
                        <PixelSpinner size={4} />
                      )}
                      Confirm
                    </button>
                    <button
                      onClick={() => setRemoveConfirmId(null)}
                      className="pixel-btn pixel-btn-secondary pixel-btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={removingId === member.userId}
                    className="pixel-btn pixel-btn-danger pixel-btn-sm"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Disband Section ── */}
      <div className="space-y-3 border-t-2 border-[var(--pixel-border)] pt-4">
        <h4 className="flex items-center gap-2 text-sm font-medium text-[var(--pixel-error)]">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h4>

        {disbandError && <p className="text-xs text-[var(--pixel-error)]">{disbandError}</p>}

        {disbandStep === 0 && (
          <button
            onClick={handleDisband}
            className="pixel-btn pixel-btn-danger pixel-btn-sm"
          >
            <Trash2 className="h-4 w-4" />
            Disband Group
          </button>
        )}

        {disbandStep === 1 && (
          <div className="border-2 border-[var(--pixel-error)] bg-[color-mix(in_srgb,var(--pixel-error)_12%,var(--pixel-bg-surface))] p-3">
            <p className="text-xs text-[var(--pixel-error)]">
              Are you sure? This will remove all members and permanently close the group.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleDisband}
                className="pixel-btn pixel-btn-danger pixel-btn-sm"
              >
                Yes, continue
              </button>
              <button
                onClick={() => setDisbandStep(0)}
                className="pixel-btn pixel-btn-secondary pixel-btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {disbandStep === 2 && (
          <div className="border-2 border-[var(--pixel-error)] bg-[color-mix(in_srgb,var(--pixel-error)_20%,var(--pixel-bg-surface))] p-3">
            <p className="text-xs font-medium text-[var(--pixel-error)]">
              Final confirmation: This action cannot be undone.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleDisband}
                disabled={disbanding}
                className="pixel-btn pixel-btn-danger pixel-btn-sm"
              >
                {disbanding && <PixelSpinner size={4} />}
                {disbanding ? "Disbanding…" : "Disband permanently"}
              </button>
              <button
                onClick={() => setDisbandStep(0)}
                disabled={disbanding}
                className="pixel-btn pixel-btn-secondary pixel-btn-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
