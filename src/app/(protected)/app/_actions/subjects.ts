"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/material-type";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", subjectId)
    .eq("user_id", user.id);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("topics")
    .delete()
    .eq("id", topicId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app");
  return { success: true };
}

/** Valid material types for Study Mix classification (spec Req 4.1). */
/** Valid material types for Study Mix classification (spec Req 4.1). */

/**
 * Update a topic's material type.
 * Used by the Settings → Subjects tab to let students tag each topic.
 */
export async function setTopicMaterialType(
  topicId: string,
  materialType: MaterialType
): Promise<{ success?: boolean; error?: string }> {
  if (!topicId) return { error: "Topic id is required." };
  if (!Object.keys(MATERIAL_TYPE_LABELS).includes(materialType)) {
    return { error: "Invalid material type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("topics")
    .update({ material_type: materialType })
    .eq("id", topicId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/settings");
  return { success: true };
}
