import AuthBar from './AuthBar'
import NewPostForm from './NewPostForm'
import { supabase } from './supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
  <main className="mx-auto max-w-2xl px-4 py-8">
    {/* Fixed Header */}
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background">
      <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My Microblog</h1>
        <AuthBar />
      </div>
    </header>

    {/* Body (push down to avoid overlap with fixed header) */}
    <div className="pt-20 space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <NewPostForm />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">Supabase error: {error.message}</p>}

      {!posts || posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ投稿がありません。</p>
      ) : (
        <div className="space-y-3">
          {posts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <a href={`/u/${p.user_id}`} className="shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.profiles?.avatar_url ?? ''} alt="avatar" />
                      <AvatarFallback>
                        {(p.profiles?.display_name ?? 'U').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </a>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a href={`/u/${p.user_id}`} className="text-sm font-medium hover:underline">
                        {p.profiles?.display_name ?? 'Unknown'}
                      </a>
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      {p.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  </main>
)
}