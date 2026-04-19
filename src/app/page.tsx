import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const PUBLIC_LIST_SIZE = 10

function extractCaptionText(content: string | null): string | null {
  if (!content) return null
  const trimmed = content.trim()
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      const texts: string[] = []
      for (const item of items) {
        if (typeof item === 'string' && item.trim()) {
          texts.push(item.trim())
        } else if (item && typeof item === 'object') {
          const text =
            (item as { content?: unknown; caption?: unknown; text?: unknown }).content ??
            (item as { content?: unknown; caption?: unknown; text?: unknown }).caption ??
            (item as { content?: unknown; caption?: unknown; text?: unknown }).text
          if (typeof text === 'string' && text.trim()) {
            texts.push(text.trim())
          }
        }
      }
      if (texts.length > 0) return texts.join(' | ')
    } catch {
      // not valid JSON, fall through
    }
  }
  return trimmed
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // HW2: list of records from a pre-existing Supabase table, rendered on the home page.
  const { data: publicCaptions, error: publicCaptionsError } = await supabase
    .from('captions')
    .select('id, content, like_count, image_id, images(url)')
    .eq('is_public', true)
    .not('content', 'is', null)
    .neq('content', '')
    .order('created_datetime_utc', { ascending: false })
    .limit(PUBLIC_LIST_SIZE)

  // Fetch some quick stats for the landing page
  const { count: captionCount } = await supabase
    .from('captions')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  const { count: voteCount } = await supabase
    .from('caption_votes')
    .select('*', { count: 'exact', head: true })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
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

      {/* Public captions list (data list from a pre-existing Supabase table) */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            Recent Public Captions
          </h2>
          <span className="text-xs text-gray-400">
            {publicCaptions?.length ?? 0} of {captionCount ?? 0}
          </span>
        </div>

        {publicCaptionsError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Failed to load captions: {publicCaptionsError.message}
          </p>
        )}

        {!publicCaptionsError && (!publicCaptions || publicCaptions.length === 0) && (
          <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            No public captions yet.
          </p>
        )}

        {publicCaptions && publicCaptions.length > 0 && (
          <ul className="space-y-2">
            {publicCaptions.map((caption) => {
              const imageUrl = (caption.images as { url?: string } | null)?.url ?? null
              const text = extractCaptionText(caption.content)
              return (
                <li
                  key={caption.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-12 w-12 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                      <svg
                        className="h-5 w-5 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm text-gray-800">{text}</p>
                  <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                    {caption.like_count ?? 0} ♥
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

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
