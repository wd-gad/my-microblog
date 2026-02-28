import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function createClient(): Promise<SupabaseClient> {
  // Next.js 15系では cookies() が Promise の場合があるため await します
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // Server Components では cookie の set が許可されない状況があるため握りつぶします
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Next の型定義差異を吸収するため any で通します
            ;(cookieStore as any).set(name, value, options)
          })
        } catch {
          // ignore
        }
      },
    },
  })
}