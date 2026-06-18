/**
 * Topic material-type classification (spec Req 4.1).
 *
 * Lives in a plain module (not a "use server" file) because Next.js 16 only
 * allows async exports from server-action modules — the type and the labels
 * const must live outside subjects.ts. Imported by the Settings UI, the
 * Study Mix builder, and the subjects server action.
 */

/** Valid material types for Study Mix interleaving rules. */
export type MaterialType =
  | "conceptual"
  | "procedural_math"
  | "visual_discrimination"
  | "verbal_vocabulary";

/** Human-readable labels + interleaving guidance for the Settings UI. */
export const MATERIAL_TYPE_LABELS: Record<
  MaterialType,
  { label: string; description: string }
> = {
  conceptual: {
    label: "Conceptual",
    description: "Definitions, theories, cause-and-effect. Interleaved by default.",
  },
  procedural_math: {
    label: "Procedural / Math",
    description:
      "Step-by-step procedures, calculations, proofs. Interleaved within the same subject.",
  },
  visual_discrimination: {
    label: "Visual / Discrimination",
    description:
      "Diagrams, anatomical structures, identify-the-difference. Interleaved.",
  },
  verbal_vocabulary: {
    label: "Verbal / Vocabulary",
    description:
      "Word lists, definitions, foreign language. Presented in blocks, NOT interleaved " +
      "(Brunmair & Richter 2019 — interleaving hurts vocabulary recall).",
  },
};
