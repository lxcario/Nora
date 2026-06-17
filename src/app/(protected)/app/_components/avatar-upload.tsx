"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { playClick } from "@/lib/sfx";

interface AvatarUploadProps {
  currentUrl?: string | null;
  size?: number;
  /** Show a small "Change photo" caption below (settings view) */
  showCaption?: boolean;
}

/**
 * Clickable pixel avatar that uploads a profile photo from the user's PC to the
 * Supabase "avatars" bucket and saves the public URL to profiles.avatar_url.
 * Falls back to the CatHead sprite when no photo is set, and degrades
 * gracefully if storage/column aren't provisioned yet.
 */
export function AvatarUpload({
  currentUrl,
  size = 48,
  showCaption = false,
}: AvatarUploadProps) {
  const [url, setUrl] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in");
        return;
      }

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        setError(
          upErr.message.includes("Bucket not found")
            ? "Run migration 003 to enable avatar uploads."
            : upErr.message
        );
        return;
      }

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`; // cache-bust

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) {
        setError(updErr.message);
        return;
      }

      setUrl(publicUrl);
      playClick();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Change profile photo"
        className="relative flex items-center justify-center overflow-hidden rounded-full border-3 border-[var(--pixel-accent)] bg-[var(--pixel-bg-primary)]"
        style={{ width: size, height: size }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Profile"
            width={size}
            height={size}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <img
            src="/sprites/travel-book/icons/CatHead.png"
            alt="Profile"
            width={size * 0.75}
            height={size * 0.75}
            className="pixel-art"
            draggable={false}
          />
        )}
        {/* hover hint */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity hover:opacity-100">
          <img
            src="/sprites/travel-book/icons/PaintBrush.png"
            alt=""
            width={16}
            height={16}
            className="pixel-art"
          />
        </span>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="font-pixel animate-pixel-blink text-[9px] text-white">
              ...
            </span>
          </span>
        )}
      </button>

      {showCaption && (
        <span className="font-pixel text-[10px] text-[var(--pixel-text-secondary)]">
          Change photo
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />

      {error && (
        <p className="max-w-[140px] text-center text-[9px] text-[var(--pixel-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
