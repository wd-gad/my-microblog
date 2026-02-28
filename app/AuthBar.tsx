'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

type Profile = {
  display_name: string | null
  avatar_url: string | null
}

export default function AuthBar() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', uid)
      .single()
    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      setEmail(session?.user?.email ?? null)
      if (session?.user?.id) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
      setEmail(session?.user?.email ?? null)
      if (session?.user?.id) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const fallback = (profile?.display_name || email || 'U').slice(0, 1).toUpperCase()

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="text-sm font-semibold text-zinc-100 tracking-tight">
          My Microblog
        </Link>

        {userId ? (
          <div className="flex items-center gap-3">
            <Link href="/me" className="flex items-center gap-2.5 hover:opacity-75 transition-opacity">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-zinc-700"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold text-white">
                  {fallback}
                </div>
              )}
              <span className="text-sm text-zinc-300">
                {profile?.display_name || email}
              </span>
            </Link>
            <button
              onClick={signOut}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={signIn}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors px-3 py-1.5 text-xs font-medium text-white"
          >
            Google でログイン
          </button>
        )}
      </div>
    </header>
  )
}
