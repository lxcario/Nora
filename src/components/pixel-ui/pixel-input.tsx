"use client";

import { useId } from "react";
import { IconSprite } from "./icon-sprite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PixelInputProps {
  type?: "text" | "textarea" | "select" | "search" | "toggle";
  label?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  onChange?: (value: string | boolean) => void;
  options?: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const BASE_INPUT_CLASSES = [
  "w-full",
  "border-2 border-solid",
  "rounded-sm",
  "font-sans text-sm",
  "transition-shadow duration-150",
  "outline-none",
  "focus:shadow-[0_0_0_2px_var(--pixel-accent)]",
].join(" ");

// ---------------------------------------------------------------------------
// PixelInput Component
// ---------------------------------------------------------------------------

/**
 * Pixel-art styled form input component.
 *
 * Supports text, textarea, select, search, and toggle input types,
 * each styled to match the pixel-art Color_Palette theme.
 *
 * Labels render in the pixel font; input values render in Geist sans-serif.
 */
export function PixelInput({
  type = "text",
  label,
  name,
  value,
  checked,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  error,
  className,
}: PixelInputProps) {
  const id = useId();

  const dataState = disabled ? "disabled" : error ? "error" : undefined;

  return (
    <div
      className={`flex flex-col gap-1 ${className ?? ""}`}
      data-state={dataState}
    >
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="font-pixel text-xs tracking-wide"
          style={{ color: "var(--pixel-text-primary)" }}
        >
          {label}
        </label>
      )}

      {/* Input variant rendering */}
      {type === "toggle" ? (
        <ToggleSwitch
          id={id}
          checked={checked ?? false}
          disabled={disabled}
          onChange={onChange}
        />
      ) : type === "textarea" ? (
        <TextareaInput
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          error={error}
          onChange={onChange}
        />
      ) : type === "select" ? (
        <SelectInput
          id={id}
          name={name}
          value={value}
          options={options}
          disabled={disabled}
          required={required}
          error={error}
          onChange={onChange}
        />
      ) : type === "search" ? (
        <SearchInput
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          error={error}
          onChange={onChange}
        />
      ) : (
        <TextInput
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          error={error}
          onChange={onChange}
        />
      )}

      {/* Error message */}
      {error && (
        <span
          className="font-pixel text-[10px]"
          style={{ color: "var(--pixel-error)" }}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextInput
// ---------------------------------------------------------------------------

function TextInput({
  id,
  name,
  value,
  placeholder,
  disabled,
  required,
  error,
  onChange,
}: {
  id: string;
  name?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (value: string | boolean) => void;
}) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      onChange={(e) => onChange?.(e.target.value)}
      className={BASE_INPUT_CLASSES}
      style={{
        backgroundColor: "var(--pixel-bg-surface)",
        borderColor: error ? "var(--pixel-error)" : "var(--pixel-border)",
        color: "var(--pixel-text-primary)",
        padding: "8px 12px",
      }}
      aria-invalid={!!error}
    />
  );
}

// ---------------------------------------------------------------------------
// TextareaInput
// ---------------------------------------------------------------------------

function TextareaInput({
  id,
  name,
  value,
  placeholder,
  disabled,
  required,
  error,
  onChange,
}: {
  id: string;
  name?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (value: string | boolean) => void;
}) {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      onChange={(e) => onChange?.(e.target.value)}
      rows={4}
      className={BASE_INPUT_CLASSES}
      style={{
        backgroundColor: "var(--pixel-bg-surface)",
        borderColor: error ? "var(--pixel-error)" : "var(--pixel-border)",
        color: "var(--pixel-text-primary)",
        padding: "8px",
        resize: "vertical",
      }}
      aria-invalid={!!error}
    />
  );
}

// ---------------------------------------------------------------------------
// SelectInput
// ---------------------------------------------------------------------------

function SelectInput({
  id,
  name,
  value,
  options,
  disabled,
  required,
  error,
  onChange,
}: {
  id: string;
  name?: string;
  value?: string;
  options?: { label: string; value: string }[];
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (value: string | boolean) => void;
}) {
  if (process.env.NODE_ENV !== "production" && (!options || options.length === 0)) {
    console.warn("[PixelInput] type='select' rendered with no options.");
  }

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${BASE_INPUT_CLASSES} appearance-none pr-10`}
        style={{
          backgroundColor: "var(--pixel-bg-surface)",
          borderColor: error ? "var(--pixel-error)" : "var(--pixel-border)",
          color: "var(--pixel-text-primary)",
          padding: "8px 12px",
        }}
        aria-invalid={!!error}
      >
        {options?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Pixel-art dropdown arrow */}
      <span
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <IconSprite name="arrow-down" size={1} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchInput
// ---------------------------------------------------------------------------

function SearchInput({
  id,
  name,
  value,
  placeholder,
  disabled,
  required,
  error,
  onChange,
}: {
  id: string;
  name?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange?: (value: string | boolean) => void;
}) {
  return (
    <div className="relative">
      {/* Magnifying glass icon prefix */}
      <span
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <IconSprite name="search" size={1} />
      </span>

      <input
        id={id}
        name={name}
        type="search"
        value={value}
        placeholder={placeholder ?? "Search..."}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${BASE_INPUT_CLASSES} pl-8`}
        style={{
          backgroundColor: "var(--pixel-bg-surface)",
          borderColor: error ? "var(--pixel-error)" : "var(--pixel-border)",
          color: "var(--pixel-text-primary)",
          padding: "8px 12px",
          paddingLeft: "32px",
        }}
        aria-invalid={!!error}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToggleSwitch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  id,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: string | boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-150 focus:outline-none focus:shadow-[0_0_0_2px_var(--pixel-accent)]"
      style={{
        backgroundColor: checked
          ? "var(--pixel-success)"
          : "var(--pixel-disabled)",
        borderColor: checked
          ? "var(--pixel-success)"
          : "var(--pixel-border-light)",
        imageRendering: "pixelated",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {/* Thumb */}
      <span
        className="inline-block h-4 w-4 rounded-full border transition-transform duration-150"
        style={{
          backgroundColor: "var(--pixel-text-primary)",
          borderColor: "var(--pixel-border)",
          transform: checked ? "translateX(20px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}
