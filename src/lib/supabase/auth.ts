import { cache } from "react";
import { createClient } from "./server";

/**
 * Returns the authenticated user, memoized for the lifetime of the current
 * server request via React's cache().
 *
 * Why this exists: `supabase.auth.getUser()` is a NETWORK call to the Supabase
 * Auth server (it revalidates the JWT). Previously the protected layout, every
 * page, and nested server components each called it independently — so a single
 * navigation made several redundant auth round-trips. Wrapping it in cache()
 * means the whole server render shares ONE call. The proxy still refreshes the
 * session cookie separately (different runtime), which is expected.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
