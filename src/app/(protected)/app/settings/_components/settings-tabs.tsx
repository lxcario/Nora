"use client";

import { useState } from "react";
import { playClick } from "@/lib/sfx";
import { AvatarUpload } from "../../_components/avatar-upload";
import { ProfileForm } from "./profile-form";
import { PetSelector } from "./pet-selector";
import { SubjectsManager } from "./subjects-manager";
import {
  DialogFrame,
  PreferencesPanel,
  CursorPicker,
} from "@/components/pixel-ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SettingsTab =
  | "profile"
  | "customization"
  | "pet"
  | "preferences"
  | "subjects"
  | "account";

interface Subject {
  id: string;
  name: string;
  color: string;
  topics: { id: string; name: string; exam_date: string | null }[];
}

export interface SettingsTabsProps {
  avatarUrl: string | null;
  currentPetType: string | null;
  subjects: Subject[];
  userEmail: string;
  userId: string;
  userCreatedAt: string;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "profile",       label: "Profile",       icon: "/sprites/travel-book/icons/CatHead.png" },
  { id: "customization", label: "Customization",  icon: "/sprites/travel-book/icons/PaintBrush.png" },
  { id: "pet",           label: "Pet",            icon: "/sprites/travel-book/icons/PetBowl.png" },
  { id: "preferences",   label: "Preferences",    icon: "/sprites/travel-book/icons/Gear.png" },
  { id: "subjects",      label: "Subjects",       icon: "/sprites/travel-book/icons/Book.png" },
  { id: "account",       label: "Account",        icon: "/sprites/travel-book/icons/Key.png" },
];

// ---------------------------------------------------------------------------
// SettingsTabs — client component, manages active tab and renders content
// ---------------------------------------------------------------------------

export function SettingsTabs({
  avatarUrl,
  currentPetType,
  subjects,
  userEmail,
  userId,
  userCreatedAt,
}: SettingsTabsProps) {
  const [active, setActive] = useState<SettingsTab>("profile");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-1 p-1.5 rounded-lg"
        style={{
          backgroundColor: "var(--pixel-bg-surface)",
          border: "2px solid var(--pixel-border)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => { setActive(tab.id); playClick(); }}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-pixel text-[11px] tracking-wide transition-colors"
              style={{
                backgroundColor: isActive ? "var(--pixel-accent)" : "transparent",
                color: isActive ? "var(--pixel-bg-primary)" : "var(--pixel-text-secondary)",
                border: "none",
                letterSpacing: "0.5px",
              }}
            >
              <img
                src={tab.icon}
                alt=""
                width={14}
                height={14}
                className="pixel-art"
                style={{ filter: isActive ? "brightness(0)" : undefined }}
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div role="tabpanel">

        {/* ── Profile ── */}
        {active === "profile" && (
          <div className="space-y-6">
            <DialogFrame title="PROFILE PHOTO">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
                <AvatarUpload currentUrl={avatarUrl} size={96} showCaption />
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
                    Upload a profile photo — it appears in the top bar and your party.
                  </p>
                  <p className="text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                    JPEG / PNG / WEBP, max 3 MB. Requires migration 003 (Supabase Storage).
                  </p>
                </div>
              </div>
            </DialogFrame>

            <DialogFrame title="DISPLAY NAME & PREFERENCES">
              <ProfileForm />
            </DialogFrame>
          </div>
        )}

        {/* ── Customization ── */}
        {active === "customization" && (
          <div className="space-y-6">
            <DialogFrame title="THEME & APPEARANCE">
              <PreferencesPanel />
            </DialogFrame>
            <DialogFrame title="CURSOR STYLE">
              <CursorPicker />
            </DialogFrame>
          </div>
        )}

        {/* ── Pet ── */}
        {active === "pet" && (
          <DialogFrame title="CHOOSE YOUR PET">
            <PetSelector currentPetType={currentPetType} />
          </DialogFrame>
        )}

        {/* ── Preferences ── */}
        {active === "preferences" && (
          <DialogFrame title="STUDY PREFERENCES">
            <p className="mb-4 text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
              Timezone, ADHD mode, and focus audio are saved under the{" "}
              <button
                type="button"
                onClick={() => setActive("profile")}
                className="font-pixel text-xs"
                style={{
                  color: "var(--pixel-accent)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Profile
              </button>{" "}
              tab. Additional study-behavior settings will appear here as the app grows.
            </p>
            <div className="space-y-3">
              <FeatureRow
                icon="/sprites/travel-book/icons/Book.png"
                label="Spaced Repetition"
                description="SM-2 algorithm — flashcards are scheduled at scientifically optimal intervals."
                badge="Active"
                badgeColor="var(--pixel-success)"
              />
              <FeatureRow
                icon="/sprites/travel-book/icons/Lightbulb.png"
                label="Feynman Technique"
                description="Explain topics in your own words; AI identifies gaps and scores your understanding."
                badge="Active"
                badgeColor="var(--pixel-success)"
              />
              <FeatureRow
                icon="/sprites/travel-book/icons/MagnifyingGlass.png"
                label="AI Research Desk"
                description="Requires GROQ_API_KEY. RAG mode additionally requires OPENAI_API_KEY for embeddings."
                badge="Requires key"
                badgeColor="var(--pixel-warning)"
              />
            </div>
          </DialogFrame>
        )}

        {/* ── Subjects ── */}
        {active === "subjects" && (
          <DialogFrame title="SUBJECTS & TOPICS">
            <SubjectsManager subjects={subjects} />
          </DialogFrame>
        )}

        {/* ── Account ── */}
        {active === "account" && (
          <div className="space-y-6">
            <DialogFrame title="ACCOUNT INFO">
              <div className="space-y-3">
                <InfoRow label="Email" value={userEmail} />
                <InfoRow label="User ID" value={userId.slice(0, 8) + "…"} />
                <InfoRow label="Member since" value={userCreatedAt} />
              </div>
            </DialogFrame>

            <DialogFrame title="CREDITS & LICENSES">
              <ul className="space-y-1.5 text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
                <li>Character sprites — LPC (CC BY-SA 3.0 / GPL 3.0)</li>
                <li>UI — Travel Book by Crusenho (CC BY 4.0)</li>
                <li>UI — Sprout Lands by Cup Nooble (non-commercial)</li>
                <li>Fonts — CC0 / OFL pixel fonts</li>
                <li>Icons — Lucide (ISC license)</li>
              </ul>
              <p className="mt-2 text-xs" style={{ color: "var(--pixel-text-muted)" }}>
                Full credits in docs/ASSETS.md
              </p>
            </DialogFrame>
          </div>
        )}

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between border-b pb-2 last:border-0"
      style={{ borderColor: "var(--pixel-border)" }}
    >
      <span className="text-sm" style={{ color: "var(--pixel-text-secondary)" }}>
        {label}
      </span>
      <span
        className="font-pixel text-[11px]"
        style={{ color: "var(--pixel-text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function FeatureRow({
  icon,
  label,
  description,
  badge,
  badgeColor,
}: {
  icon: string;
  label: string;
  description: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-md p-3"
      style={{ backgroundColor: "var(--pixel-bg-secondary)" }}
    >
      <img src={icon} alt="" width={18} height={18} className="pixel-art mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-pixel text-xs" style={{ color: "var(--pixel-text-primary)" }}>
            {label}
          </p>
          <span
            className="rounded-full px-2 py-0.5 font-pixel"
            style={{
              fontSize: "9px",
              backgroundColor: `color-mix(in srgb, ${badgeColor} 20%, transparent)`,
              color: badgeColor,
            }}
          >
            {badge}
          </span>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "var(--pixel-text-muted)" }}>
          {description}
        </p>
      </div>
    </div>
  );
}
