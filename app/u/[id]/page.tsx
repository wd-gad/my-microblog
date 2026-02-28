'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../supabase'

type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type Post = {
  id: number
  content: string
  created_at: string
}

export default function UserPage() {
  const params = useParams()
  const userId = params?.id as string | undefined

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setError('Invalid URL: user id is missing.')
        return
      }

      setError(null)

      const { data: profileData, error: pe } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId)
        .single()

      if (pe) setError(`Profile error: ${pe.message}`)
      setProfile(profileData as any)

      const { data: postsData, error: poe } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (poe) setError((prev) => prev ? `${prev}\nPosts error: ${poe.message}` : `Posts error: ${poe.message}`)
      setPosts((postsData ?? []) as any)
    }

    run()
  }, [userId])

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: 16, fontSize: 14 }}>
        ← Home
      </a>

      {error && <p style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            border: '1px solid #ddd',
            overflow: 'hidden',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            'No Img'
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            {profile?.display_name ?? 'Unknown User'}
          </h1>
          <div style={{ fontSize: 12, opacity: 0.6 }}>{userId ?? ''}</div>
        </div>
      </div>

      {!posts.length ? (
        <p>まだ投稿がありません。</p>
      ) : (
        <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0 }}>
          {posts.map((p) => (
            <li key={p.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{p.content}</div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
                {new Date(p.created_at).toLocaleString('ja-JP')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}