'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
      router.replace('/')
    }
    run()
  }, [router])

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <p>Signing in...</p>
    </main>
  )
}