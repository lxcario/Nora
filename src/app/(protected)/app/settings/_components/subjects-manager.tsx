"use client";

import { useState, useTransition } from "react";
import {
  createSubject,
  deleteSubject,
  createTopic,
  deleteTopic,
  setTopicMaterialType,
} from "@/app/(protected)/app/_actions/subjects";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/material-type";
import { PixelButton, PixelInput, PixelConfirmDialog, EmptyState } from "@/components/pixel-ui";

interface Topic {
  id: string;
  name: string;
  exam_date: string | null;
  material_type: MaterialType;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}

// ---------------------------------------------------------------------------
// Topic material-type badge colours
// ---------------------------------------------------------------------------
const MATERIAL_BADGE_COLOR: Record<MaterialType, string> = {
  conceptual: "var(--pixel-accent)",
  procedural_math: "var(--pixel-success)",
  visual_discrimination: "#a855f7", // purple — not used for status so safe
  verbal_vocabulary: "var(--pixel-warning)",
};

// ---------------------------------------------------------------------------
// MaterialTypeSelector — inline dropdown for a single topic
// ---------------------------------------------------------------------------
function MaterialTypeSelector({
  topicId,
  current,
}: {
  topicId: string;
  current: MaterialType;
}) {
  const [value, setValue] = useState<MaterialType>(current);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: MaterialType) {
    setValue(next);
    startTransition(async () => {
      await setTopicMaterialType(topicId, next);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Colour badge */}
      <span
        className="inline-block h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: MATERIAL_BADGE_COLOR[value] }}
      />
      <select
        value={value}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as MaterialType)}
        className="font-pixel text-[9px] px-1 py-0.5 max-w-[130px]"
        style={{
          border: "1px solid var(--pixel-border)",
          backgroundColor: "var(--pixel-bg-surface)",
          color: "var(--pixel-text-secondary)",
          opacity: isPending ? 0.5 : 1,
        }}
        title={MATERIAL_TYPE_LABELS[value].description}
        aria-label={`Material type for topic`}
      >
        {(Object.keys(MATERIAL_TYPE_LABELS) as MaterialType[]).map((mt) => (
          <option key={mt} value={mt}>
            {MATERIAL_TYPE_LABELS[mt].label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubjectsManager
// ---------------------------------------------------------------------------
export function SubjectsManager({ subjects }: { subjects: Subject[] }) {
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "subject" | "topic";
    id: string;
    name: string;
  } | null>(null);

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.type === "subject") {
      await deleteSubject(confirmDelete.id);
    } else {
      await deleteTopic(confirmDelete.id);
    }
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-4">
      {/* Confirm delete dialog */}
      <PixelConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.type === "subject" ? "Delete subject?" : "Delete topic?"}
        message={`"${confirmDelete?.name ?? ""}" and all its data will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Existing subjects */}
      {subjects.length === 0 ? (
        <EmptyState
          icon="book"
          message="No subjects yet. Add one to start organizing your studies."
          actionLabel="Add Subject"
          onAction={() => setShowAddSubject(true)}
        />
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="pixel-panel pixel-panel-inset"
              style={{ padding: "12px" }}
            >
              {/* Subject header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3"
                    style={{
                      backgroundColor: subject.color,
                      border: "1px solid var(--pixel-border)",
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--pixel-text-primary)" }}
                  >
                    {subject.name}
                  </span>
                  <span
                    className="font-pixel text-[9px]"
                    style={{ color: "var(--pixel-text-muted)" }}
                  >
                    ({subject.topics.length} topics)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <PixelButton
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      setAddingTopicFor(
                        addingTopicFor === subject.id ? null : subject.id
                      )
                    }
                  >
                    + Topic
                  </PixelButton>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDelete({
                        type: "subject",
                        id: subject.id,
                        name: subject.name,
                      })
                    }
                    className="font-pixel text-[9px] px-2 py-1"
                    style={{
                      color: "var(--pixel-error)",
                      border: "none",
                      background: "none",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Topics list */}
              {subject.topics.length > 0 && (
                <div className="mt-2 space-y-1 pl-5">
                  {subject.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between py-1.5 px-2"
                      style={{ borderBottom: "1px solid var(--pixel-border)" }}
                    >
                      {/* Topic name + exam date */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src="/sprites/travel-book/icons/Book.png"
                          alt=""
                          width={10}
                          height={10}
                          className="pixel-art shrink-0"
                        />
                        <span
                          className="text-sm truncate"
                          style={{ color: "var(--pixel-text-primary)" }}
                        >
                          {topic.name}
                        </span>
                        {topic.exam_date && (
                          <span
                            className="font-pixel text-[8px] shrink-0"
                            style={{ color: "var(--pixel-text-muted)" }}
                          >
                            (exam: {topic.exam_date})
                          </span>
                        )}
                      </div>

                      {/* Material type selector + delete */}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <MaterialTypeSelector
                          topicId={topic.id}
                          current={topic.material_type}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDelete({
                              type: "topic",
                              id: topic.id,
                              name: topic.name,
                            })
                          }
                          className="font-pixel text-[8px] px-1"
                          style={{
                            color: "var(--pixel-error)",
                            border: "none",
                            background: "none",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add topic form */}
              {addingTopicFor === subject.id && (
                <form
                  action={async (formData) => {
                    await createTopic(formData);
                    setAddingTopicFor(null);
                  }}
                  className="mt-3 flex items-end gap-2 pl-5"
                >
                  <input type="hidden" name="subject_id" value={subject.id} />
                  <div className="flex-1">
                    <PixelInput
                      type="text"
                      label="Topic name"
                      placeholder="e.g. Quantum Mechanics"
                      onChange={() => {}}
                    />
                    <input
                      name="name"
                      placeholder="Topic name"
                      required
                      className="sr-only"
                    />
                  </div>
                  <input
                    name="exam_date"
                    type="date"
                    className="text-sm px-2 py-1"
                    style={{
                      border: "2px solid var(--pixel-border)",
                      backgroundColor: "var(--pixel-bg-surface)",
                      color: "var(--pixel-text-primary)",
                    }}
                  />
                  <PixelButton type="submit" variant="primary" size="small">
                    Add
                  </PixelButton>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add subject form */}
      {showAddSubject ? (
        <form
          action={async (formData) => {
            await createSubject(formData);
            setShowAddSubject(false);
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <PixelInput
              type="text"
              label="Subject name"
              placeholder="e.g. Computer Science"
              onChange={() => {}}
            />
            <input
              name="name"
              placeholder="Subject name"
              required
              className="sr-only"
            />
          </div>
          <input
            name="color"
            type="color"
            defaultValue="#d4a526"
            className="h-9 w-9 cursor-pointer"
            style={{ border: "2px solid var(--pixel-border)" }}
          />
          <PixelButton type="submit" variant="primary" size="small">
            Add
          </PixelButton>
          <PixelButton
            variant="secondary"
            size="small"
            onClick={() => setShowAddSubject(false)}
          >
            Cancel
          </PixelButton>
        </form>
      ) : (
        <PixelButton variant="secondary" onClick={() => setShowAddSubject(true)}>
          + Add Subject
        </PixelButton>
      )}
    </div>
  );
}
