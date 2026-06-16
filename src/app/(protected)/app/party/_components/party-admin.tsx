"use client";

import { useState } from "react";
import { Settings, Trash2, RefreshCw, Copy, AlertTriangle, Globe, Lock, Loader2, Check, UserMinus } from "lucide-react";
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
    <div className="space-y-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      {/* ── Edit Settings Section ── */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Settings className="h-4 w-4" />
          Party Settings
        </h4>

        <div>
          <label
            htmlFor="admin-party-name"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Party Name
          </label>
          <input
            id="admin-party-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <p className="mt-1 text-xs text-zinc-400">{name.length}/30 characters</p>
        </div>

        <div>
          <span className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Visibility
          </span>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setVis("public")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                vis === "public"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Globe className="h-4 w-4" />
              Public
            </button>
            <button
              type="button"
              onClick={() => setVis("private")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                vis === "private"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Lock className="h-4 w-4" />
              Private
            </button>
          </div>
        </div>

        {settingsError && <p className="text-xs text-red-500">{settingsError}</p>}
        {settingsSuccess && <p className="text-xs text-green-600 dark:text-green-400">{settingsSuccess}</p>}

        <button
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
          {savingSettings ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ── Invite Code Section (private parties only) ── */}
      {vis === "private" && (
        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <Copy className="h-4 w-4" />
            Invite Code
          </h4>

          {currentCode ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800">
                {currentCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
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
            <p className="text-xs text-zinc-500">No invite code generated yet.</p>
          )}

          {regenError && <p className="text-xs text-red-500">{regenError}</p>}
          {regenSuccess && <p className="text-xs text-green-600 dark:text-green-400">{regenSuccess}</p>}

          {confirmRegen ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 dark:text-amber-400">
                This will invalidate the current code. Continue?
              </span>
              <button
                onClick={handleRegenerateCode}
                disabled={regenerating}
                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {regenerating && <Loader2 className="h-3 w-3 animate-spin" />}
                Confirm
              </button>
              <button
                onClick={() => setConfirmRegen(false)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleRegenerateCode}
              disabled={regenerating}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating…" : "Regenerate Code"}
            </button>
          )}
        </div>
      )}

      {/* ── Member Management Section ── */}
      {members.length > 0 && (
        <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <UserMinus className="h-4 w-4" />
            Manage Members
          </h4>

          {removeError && <p className="text-xs text-red-500">{removeError}</p>}
          {removeSuccess && <p className="text-xs text-green-600 dark:text-green-400">{removeSuccess}</p>}

          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {member.displayName}
                </span>

                {removeConfirmId === member.userId ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500">Remove?</span>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={removingId === member.userId}
                      className="inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {removingId === member.userId && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      Confirm
                    </button>
                    <button
                      onClick={() => setRemoveConfirmId(null)}
                      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={removingId === member.userId}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
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
      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <h4 className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h4>

        {disbandError && <p className="text-xs text-red-500">{disbandError}</p>}

        {disbandStep === 0 && (
          <button
            onClick={handleDisband}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          >
            <Trash2 className="h-4 w-4" />
            Disband Party
          </button>
        )}

        {disbandStep === 1 && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <p className="text-xs text-red-700 dark:text-red-300">
              Are you sure? This will remove all members and permanently close the party.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleDisband}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Yes, continue
              </button>
              <button
                onClick={() => setDisbandStep(0)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {disbandStep === 2 && (
          <div className="rounded-md border border-red-500 bg-red-100 p-3 dark:border-red-700 dark:bg-red-900">
            <p className="text-xs font-medium text-red-800 dark:text-red-200">
              Final confirmation: This action cannot be undone.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleDisband}
                disabled={disbanding}
                className="inline-flex items-center gap-1 rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {disbanding && <Loader2 className="h-3 w-3 animate-spin" />}
                {disbanding ? "Disbanding…" : "Disband permanently"}
              </button>
              <button
                onClick={() => setDisbandStep(0)}
                disabled={disbanding}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
