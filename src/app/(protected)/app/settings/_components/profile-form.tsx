"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm() {
  const [displayName, setDisplayName] = useState("");
  const [adhdMode, setAdhdMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, adhd_mode")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setAdhdMode(profile.adhd_mode ?? false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        adhd_mode: adhdMode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Set a display name"
          className="mt-1 block w-full max-w-sm rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={adhdMode}
          onChange={(e) => setAdhdMode(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label className="text-sm text-zinc-700 dark:text-zinc-300">
          ADHD Mode (simplified focus flows)
        </label>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600 dark:text-green-400">Profile saved!</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
