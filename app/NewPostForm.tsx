'use client'

import { useState } from 'react'
import { supabase } from './supabase'

export default function NewPostForm() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError(null)

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    setError('投稿するにはログインしてください')
    return
  }

  const trimmed = content.trim()
  if (!trimmed) return

  setLoading(true)
  const { error } = await supabase.from('posts').insert({ content: trimmed })
  setLoading(false)

  if (error) {
    setError(error.message)
    return
  }

  setContent('')
  window.location.reload()
}

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
      <textarea
        rows={3}
        placeholder="いま何してる？"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 12,
        }}
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={loading}
          style={{ border: '1px solid #ddd', borderRadius: 8, padding: '8px 14px' }}
        >
          {loading ? '投稿中…' : '投稿'}
        </button>
        {error && <span style={{ color: 'crimson', fontSize: 12 }}>{error}</span>}
      </div>
    </form>
  )
}