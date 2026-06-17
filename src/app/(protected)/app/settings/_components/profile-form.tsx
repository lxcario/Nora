"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Halifax",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface ProfileData {
  displayName: string;
  timezone: string;
  adhdMode: boolean;
  focusAudio: string;
}

export function ProfileForm() {
  const [data, setData] = useState<ProfileData>({
    displayName: "",
    timezone: "UTC",
    adhdMode: false,
    focusAudio: "lofi",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, timezone, adhd_mode, focus_audio")
        .eq("id", user.id)
        .single();
      if (profile) {
        setData({
          displayName: profile.display_name ?? "",
          timezone: profile.timezone ?? "UTC",
          adhdMode: profile.adhd_mode ?? false,
          focusAudio: profile.focus_audio ?? "lofi",
        });
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setSaving(false); return; }

    const { error: err } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName.trim() || null,
        timezone: data.timezone,
        adhd_mode: data.adhdMode,
        focus_audio: data.focusAudio,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      {/* Display name */}
      <div className="space-y-1.5">
        <label className="font-pixel text-xs tracking-wide" style={{ color: "var(--pixel-text-primary)" }}>
          Display Name
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={(e) => setData((d) => ({ ...d, displayName: e.target.value }))}
          placeholder="Enter a display name"
          maxLength={40}
          className="w-full max-w-sm"
        />
        <p className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
          Shown in the top bar and party.
        </p>
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <label className="font-pixel text-xs tracking-wide" style={{ color: "var(--pixel-text-primary)" }}>
          Timezone
        </label>
        <select
          value={data.timezone}
          onChange={(e) => setData((d) => ({ ...d, timezone: e.target.value }))}
          className="w-full max-w-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
          ))}
        </select>
        <p className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
          Used to schedule review due dates at your local midnight.
        </p>
      </div>

      {/* ADHD Mode toggle */}
      <div className="flex items-center justify-between max-w-sm rounded-md p-3" style={{ backgroundColor: "var(--pixel-bg-secondary)" }}>
        <div>
          <p className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
            ADHD Mode
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--pixel-text-muted)" }}>
            Shorter sessions, more breaks, reduced distractions.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.adhdMode}
          onClick={() => setData((d) => ({ ...d, adhdMode: !d.adhdMode }))}
          className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors"
          style={{
            backgroundColor: data.adhdMode ? "var(--pixel-success)" : "var(--pixel-disabled)",
            borderColor: data.adhdMode ? "var(--pixel-success)" : "var(--pixel-border)",
            outline: "none",
          }}
        >
          <span
            className="inline-block h-4 w-4 rounded-full border transition-transform"
            style={{
              backgroundColor: "var(--pixel-bg-surface)",
              borderColor: "var(--pixel-border)",
              transform: data.adhdMode ? "translateX(20px)" : "translateX(2px)",
            }}
          />
        </button>
      </div>

      {/* Focus audio */}
      <div className="space-y-1.5">
        <label className="font-pixel text-xs tracking-wide" style={{ color: "var(--pixel-text-primary)" }}>
          Default Focus Audio
        </label>
        <select
          value={data.focusAudio}
          onChange={(e) => setData((d) => ({ ...d, focusAudio: e.target.value }))}
          className="w-full max-w-sm"
        >
          <option value="lofi">Lo-fi hip hop</option>
          <option value="jazz">Lo-fi jazz</option>
          <option value="ambient">Ambient / nature</option>
          <option value="classical">Classical</option>
          <option value="none">None (silent)</option>
        </select>
      </div>

      {/* Error / success feedback */}
      {error && (
        <p className="text-sm" style={{ color: "var(--pixel-error)" }}>{error}</p>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 !bg-[var(--pixel-accent)] !text-[var(--pixel-bg-primary)] hover:!brightness-110 font-pixel text-xs"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : success ? (
          <Check className="h-3.5 w-3.5" />
        ) : null}
        {saving ? "Saving..." : success ? "Saved!" : "Save Profile"}
      </button>
    </div>
  );
}
