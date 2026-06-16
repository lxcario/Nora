"use client";

import { useState } from "react";
import {
  createSubject,
  deleteSubject,
  createTopic,
  deleteTopic,
} from "@/app/(protected)/app/_actions/subjects";
import { Plus, Trash2, BookOpen, Tag } from "lucide-react";

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

  return (
    <div className="space-y-4">
      {/* Existing subjects */}
      {subjects.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No subjects yet. Add one to start studying.
        </p>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="text-sm font-medium">{subject.name}</span>
                  <span className="text-xs text-zinc-400">
                    ({subject.topics.length} topics)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setAddingTopicFor(
                        addingTopicFor === subject.id ? null : subject.id
                      )
                    }
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                    title="Add topic"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <form
                    action={async () => {
                      await deleteSubject(subject.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Delete subject"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Topics list */}
              {subject.topics.length > 0 && (
                <div className="mt-2 space-y-1 pl-5">
                  {subject.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between rounded px-2 py-1 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-zinc-400" />
                        <span>{topic.name}</span>
                        {topic.exam_date && (
                          <span className="text-xs text-zinc-400">
                            (exam: {topic.exam_date})
                          </span>
                        )}
                      </div>
                      <form
                        action={async () => {
                          await deleteTopic(topic.id);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded p-0.5 text-zinc-300 hover:text-red-500 dark:text-zinc-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </form>
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
                  className="mt-2 flex items-end gap-2 pl-5"
                >
                  <input type="hidden" name="subject_id" value={subject.id} />
                  <input
                    name="name"
                    placeholder="Topic name"
                    required
                    className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <input
                    name="exam_date"
                    type="date"
                    className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Add
                  </button>
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
            <input
              name="name"
              placeholder="Subject name (e.g., Computer Science)"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <input
            name="color"
            type="color"
            defaultValue="#6366f1"
            className="h-9 w-9 cursor-pointer rounded-md border border-zinc-300"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowAddSubject(false)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowAddSubject(true)}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <BookOpen className="h-4 w-4" />
          Add Subject
        </button>
      )}
    </div>
  );
}
