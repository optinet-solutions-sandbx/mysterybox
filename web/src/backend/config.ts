/**
 * Which backend the app runs on. "supabase" needs NEXT_PUBLIC_BACKEND=supabase plus the project
 * URL and anon key (web/.env.example); anything else runs the browser mock.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const backendMode: "supabase" | "mock" =
  process.env.NEXT_PUBLIC_BACKEND === "supabase" && SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : "mock";

export const isSupabase = backendMode === "supabase";
