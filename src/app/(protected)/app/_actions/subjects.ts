"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSubject(formData: FormData) {
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6366f1";

  if (!name?.trim()) return { error: "Subject name is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("subjects")
    .insert({ user_id: user.id, name: name.trim(), color });

  if (error) return { error: error.message };

  revalidatePath("/app");
  return { success: true };
}

export async function deleteSubject(subjectId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId);

  if (error) return { error: error.message };

  revalidatePath("/app");
  return { success: true };
}

export async function createTopic(formData: FormData) {
  const name = formData.get("name") as string;
  const subjectId = formData.get("subject_id") as string;
  const examDate = formData.get("exam_date") as string;

  if (!name?.trim()) return { error: "Topic name is required" };
  if (!subjectId) return { error: "Subject is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("topics").insert({
    user_id: user.id,
    subject_id: subjectId,
    name: name.trim(),
    exam_date: examDate || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/app");
  return { success: true };
}

export async function deleteTopic(topicId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("topics").delete().eq("id", topicId);

  if (error) return { error: error.message };

  revalidatePath("/app");
  return { success: true };
}
