import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch some quick stats for the landing page
  const { count: captionCount } = await supabase
    .from('captions')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  const { count: voteCount } = await supabase
    .from('caption_votes')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Caption Cracker</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
          AI-Powered Caption Generator & Rating
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          Upload any image and let AI generate hilarious captions for it. Then rate captions
          from the community to find the funniest ones. Sign in with Google to get started!
        </p>
      </div>

      {/* Community stats */}
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-600">{captionCount ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">Captions Created</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-600">{voteCount ?? 0}</p>
          <p className="mt-1 text-sm text-gray-500">Votes Cast</p>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400">How it works</h2>
        <div className="space-y-2">
          {[
            { step: 'Upload an image', desc: 'Drag & drop or click to choose any photo' },
            { step: 'AI generates captions', desc: 'Our pipeline creates multiple funny captions' },
            { step: 'Rate & discover', desc: 'Vote on the best captions and see the leaderboard' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{item.step}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {user ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm text-green-700">
            Signed in as <span className="font-semibold">{user.email}</span>
          </p>
          <Link
            href="/protected"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:bg-green-800"
          >
            Open Caption Dashboard
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-600">Sign in to start generating and rating captions.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800"
          >
            Sign in with Google
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </main>
  )
}
