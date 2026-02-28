'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'

type Profile = {
  display_name: string | null
  avatar_url: string | null
}

export default function AuthBar() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [open, setOpen] = useState(false)

  const loadProfile = async (uid: string) => {
    const { data: p, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', uid)
      .single()

    if (error) {
      console.error('profiles fetch error', error)
      setProfile(null)
      return
    }
    setProfile((p as any) ?? null)
  }

  const loadUser = async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.error('auth.getUser error', error)

      const user = data.user
      setEmail(user?.email ?? null)
      setUserId(user?.id ?? null)

      if (user) await loadProfile(user.id)
      else setProfile(null)
    } catch (e) {
      console.error('AuthBar load fatal', e)
      setEmail(null)
      setUserId(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setLoading(true)
      loadUser()
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    location.href = '/'
  }

  if (loading) return <div className="text-xs text-muted-foreground">...</div>

  if (!email || !userId) {
    return <Button onClick={signIn}>Login with Google</Button>
  }

  const name = profile?.display_name ?? email
  const fallback = name.slice(0, 1).toUpperCase()

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="outline"
        className="gap-2"
        onClick={async () => {
          setOpen((v) => !v)
          // ★開くたびに profiles を取り直す（ここが今回の目的）
          await loadProfile(userId)
        }}
        aria-expanded={open}
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={profile?.avatar_url ?? ''} alt="avatar" />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <span className="max-w-[160px] truncate text-xs">{email}</span>
      </Button>

      {open && (
        <Card className="w-56 p-2">
          <div className="px-2 py-1.5">
            <div className="text-sm font-medium truncate">{profile?.display_name ?? 'User'}</div>
            <div className="text-xs text-muted-foreground truncate">{email}</div>
          </div>
          <div className="mt-2 grid gap-1">
            <Button variant="ghost" className="justify-start" onClick={() => (location.href = '/me')}>
              Profile
            </Button>
            <Button variant="ghost" className="justify-start" onClick={signOut}>
              Logout
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}