import { supabase } from './supabase'
import NewPostForm from './NewPostForm'
import AuthBar from './AuthBar'
export const dynamic = 'force-dynamic'
export default async function Home() {
  const { data: posts, error } = await supabase
  .from('posts')
  .select(`
    id,
    content,
    created_at,
    user_id,
    profiles (
      id,
      display_name,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <AuthBar />
      <NewPostForm />
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
        My Microblog
      </h1>

      {error && (
        <p style={{ color: 'crimson' }}>
          Supabase error: {error.message}
        </p>
      )}

      {!posts || posts.length === 0 ? (
        <p>まだ投稿がありません（または取得できていません）。</p>
      ) : (
        <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0 }}>
          {posts.map((p: any) => (
            <li
              key={p.id}
              style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {p.profiles?.display_name ?? 'Unknown'}
              </div>
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