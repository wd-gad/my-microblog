'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function AuthBar() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email ?? null)
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 12 }}>
      {loading ? (
        <span style={{ fontSize: 12, opacity: 0.7 }}>...</span>
      ) : email ? (
        <>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{email}</span>
          <button onClick={signOut} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px' }}>
            Logout
          </button>
        </>
      ) : (
        <button onClick={signIn} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px' }}>
          Login with Google
        </button>
      )}
    </div>
  )
}