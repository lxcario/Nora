"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  errors?: {
    email?: string[];
    password?: string[];
  };
  message?: string;
} | undefined;

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email) {
    return { errors: { email: ["Email is required"] } };
  }
  if (!password) {
    return { errors: { password: ["Password is required"] } };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { message: "Invalid email or password" };
  }

  redirect("/app");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email) {
    return { errors: { email: ["Email is required"] } };
  }
  if (!password || password.length < 6) {
    return {
      errors: { password: ["Password must be at least 6 characters"] },
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { message: error.message };
  }

  redirect("/app");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
