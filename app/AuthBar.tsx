'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Profile = {
  display_name: string | null
  avatar_url: string | null
}

export default function AuthBar() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const load = async () => {
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) console.error('auth.getUser error', error)

      const user = data.user
      setEmail(user?.email ?? null)

      if (user) {
        const { data: p, error: pe } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (pe) console.error('profiles fetch error', pe)
        setProfile((p as any) ?? null)
      } else {
        setProfile(null)
      }
    } catch (e) {
      console.error('AuthBar load fatal', e)
      setEmail(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // ここも例外で固まらないように
      setLoading(true)
      load()
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

  if (!email) return <Button onClick={signIn}>Login with Google</Button>

  const name = profile?.display_name ?? email
  const fallback = (name ?? 'U').slice(0, 1).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={profile?.avatar_url ?? ''} alt="avatar" />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <span className="max-w-[160px] truncate text-xs">{email}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
  align="end"
  side="bottom"
  sideOffset={8}
  className="w-56 bg-popover text-popover-foreground border shadow-md"
>
        <div className="px-2 py-1.5">
          <div className="text-sm font-medium truncate">{profile?.display_name ?? 'User'}</div>
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => (location.href = '/me')}>Profile</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}