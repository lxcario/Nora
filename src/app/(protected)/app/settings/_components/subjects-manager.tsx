"use client";

import { useState } from "react";
import {
  createSubject,
  deleteSubject,
  createTopic,
  deleteTopic,
} from "@/app/(protected)/app/_actions/subjects";
import { PixelButton, PixelInput, PixelConfirmDialog, EmptyState } from "@/components/pixel-ui";

interface Topic {
  id: string;
  name: string;
  exam_date: string | null;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}

export function SubjectsManager({ subjects }: { subjects: Subject[] }) {
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "subject" | "topic"; id: string; name: string } | null>(null);

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
            <div key={subject.id} className="pixel-panel pixel-panel-inset" style={{ padding: "12px" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3"
                    style={{ backgroundColor: subject.color, border: "1px solid var(--pixel-border)" }}
                  />
                  <span className="text-sm font-medium" style={{ color: "var(--pixel-text-primary)" }}>
                    {subject.name}
                  </span>
                  <span className="font-pixel text-[9px]" style={{ color: "var(--pixel-text-muted)" }}>
                    ({subject.topics.length} topics)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <PixelButton
                    variant="secondary"
                    size="small"
                    onClick={() => setAddingTopicFor(addingTopicFor === subject.id ? null : subject.id)}
                  >
                    + Topic
                  </PixelButton>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: "subject", id: subject.id, name: subject.name })}
                    className="font-pixel text-[9px] px-2 py-1"
                    style={{ color: "var(--pixel-error)", border: "none", background: "none" }}
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
                      className="flex items-center justify-between py-1 px-2"
                      style={{ borderBottom: "1px solid var(--pixel-border)" }}
                    >
                      <div className="flex items-center gap-2">
                        <img src="/sprites/travel-book/icons/Book.png" alt="" width={10} height={10} className="pixel-art" />
                        <span className="text-sm" style={{ color: "var(--pixel-text-primary)" }}>{topic.name}</span>
                        {topic.exam_date && (
                          <span className="font-pixel text-[8px]" style={{ color: "var(--pixel-text-muted)" }}>
                            (exam: {topic.exam_date})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ type: "topic", id: topic.id, name: topic.name })}
                        className="font-pixel text-[8px] px-1"
                        style={{ color: "var(--pixel-error)", border: "none", background: "none" }}
                      >
                        ✕
                      </button>
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
                    {/* Hidden native input for form submission */}
                    <input name="name" placeholder="Topic name" required className="sr-only" />
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
            <input name="name" placeholder="Subject name" required className="sr-only" />
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
          <PixelButton variant="secondary" size="small" onClick={() => setShowAddSubject(false)}>
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
