'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../supabase'

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

type Post = {
  id: number
  content: string
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UserPage() {
  const params = useParams()
  const userId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setError('Invalid URL')
        setLoading(false)
        return
      }

      setLoading(true)

      const { data: p, error: pe } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .eq('id', userId)
        .single()

      if (pe) {
        setError(pe.message)
      } else {
        setProfile((p as any) ?? null)
      }

      const { data: ps, error: pse } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!pse) setPosts((ps ?? []) as any)

      setLoading(false)
    }

    run()
  }, [userId])

  const name = profile?.display_name ?? 'Unknown User'
  const fallback = name.slice(0, 1).toUpperCase()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← ホームに戻る
      </Link>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 flex items-center gap-4">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="avatar"
            className="h-14 w-14 rounded-full object-cover ring-1 ring-zinc-700"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-semibold text-white">
            {fallback}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-100 truncate">{name}</p>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{userId}</p>
        </div>
      </div>

      {profile?.bio && (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
          {profile.bio}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-600 text-center py-8">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">まだ投稿がありません。</p>
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="block bg-zinc-900 border border-zinc-800/60 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{p.content}</p>
              <p className="mt-2 text-xs text-zinc-500">{formatDate(p.created_at)}</p>
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
