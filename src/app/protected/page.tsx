import Link from 'next/link'
import { redirect } from 'next/navigation'
import { rateCaption, signOut } from './actions'
import CaptionPipelineForm from './caption-pipeline-form'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE = 12

/** Extract readable caption text from content that might be raw JSON */
function extractCaptionText(content: string | null): string | null {
  if (!content) return null
  const trimmed = content.trim()
  // If it looks like JSON (starts with [ or {), try to parse it
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      const texts: string[] = []
      for (const item of items) {
        if (typeof item === 'string' && item.trim()) {
          texts.push(item.trim())
        } else if (item && typeof item === 'object') {
          const text = item.content ?? item.caption ?? item.text
          if (typeof text === 'string' && text.trim()) {
            texts.push(text.trim())
          }
        }
      }
      if (texts.length > 0) return texts.join(' | ')
    } catch {
      // not valid JSON, fall through to return as-is
    }
  }
  return trimmed
}

type ProtectedPageProps = {
  searchParams?: Promise<{
    vote?: string
    page?: string
    sort?: string
  }>
}

export default async function ProtectedPage({ searchParams }: ProtectedPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const voteStatus = params?.vote
  const currentPage = Math.max(1, parseInt(params?.page ?? '1', 10) || 1)
  const sortBy = params?.sort === 'popular' ? 'popular' : 'newest'
  const offset = (currentPage - 1) * PAGE_SIZE

  // Build captions query with sort option
  let captionsQuery = supabase
    .from('captions')
    .select('id, content, like_count, image_id, images(url)', { count: 'exact' })
    .eq('is_public', true)
    .not('content', 'is', null)
    .neq('content', '')

  if (sortBy === 'popular') {
    captionsQuery = captionsQuery.order('like_count', { ascending: false, nullsFirst: false })
  } else {
    captionsQuery = captionsQuery.order('created_datetime_utc', { ascending: false })
  }

  const { data: captions, error: captionsError, count: totalCaptions } = await captionsQuery
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = totalCaptions ? Math.ceil(totalCaptions / PAGE_SIZE) : 1

  // Fetch user's votes to show indicators on captions they already voted on
  const { data: userVotes } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value')
    .eq('profile_id', user.id)

  const userVoteMap = new Map<string, number>()
  userVotes?.forEach((v) => userVoteMap.set(v.caption_id, v.vote_value))

  // Fetch recent votes (increased to 20)
  const { data: recentVotes, error: votesError } = await supabase
    .from('caption_votes')
    .select('id, caption_id, vote_value, created_datetime_utc, captions(content)')
    .eq('profile_id', user.id)
    .order('created_datetime_utc', { ascending: false })
    .limit(20)

  // Fetch top 5 captions for leaderboard
  const { data: topCaptions } = await supabase
    .from('captions')
    .select('id, content, like_count, images(url)')
    .eq('is_public', true)
    .not('content', 'is', null)
    .neq('content', '')
    .order('like_count', { ascending: false, nullsFirst: false })
    .limit(5)

  // Stats
  const { count: totalCaptionCount } = await supabase
    .from('captions')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true)

  const { count: totalVoteCount } = await supabase
    .from('caption_votes')
    .select('*', { count: 'exact', head: true })

  const { count: myVoteCount } = await supabase
    .from('caption_votes')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Caption Cracker</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
          Generate & Rate Captions
        </h1>
        <p className="mt-1 text-sm text-gray-500">Upload images, generate AI captions, and vote on the funniest ones.</p>
      </div>

      {/* Auth status card */}
      <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">Authenticated</p>
          <p className="text-sm text-green-700">{user.email}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-blue-600">{totalCaptionCount ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Public Captions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-purple-600">{totalVoteCount ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Total Votes</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{myVoteCount ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Your Votes</p>
        </div>
      </div>

      {/* Vote status toasts */}
      {voteStatus === 'created' && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800">Vote saved successfully.</p>
        </div>
      )}
      {voteStatus === 'updated' && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-sm text-blue-800">Existing vote updated successfully.</p>
        </div>
      )}
      {voteStatus === 'invalid' && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-orange-800">Invalid vote payload. Please try again.</p>
        </div>
      )}
      {voteStatus === 'error' && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="h-4 w-4 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-800">Vote failed. This is usually an Auth/RLS policy issue in Supabase.</p>
        </div>
      )}

      {/* Caption pipeline section */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Captions from an Image</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Upload an image and run the 4-step caption pipeline: generate presigned URL → upload
              bytes → register image → generate captions.
            </p>
          </div>
        </div>
        <CaptionPipelineForm />
      </section>

      {/* Top Captions Leaderboard */}
      {topCaptions && topCaptions.length > 0 && (
        <section className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100">
              <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Top 5 Funniest Captions</h2>
              <p className="mt-0.5 text-sm text-gray-500">The community&apos;s most-loved captions.</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3">
            {topCaptions.map((cap, idx) => {
              const imgUrl = (cap.images as { url?: string } | null)?.url ?? null
              return (
                <li key={cap.id} className="flex items-center gap-3 rounded-lg border border-yellow-100 bg-white/70 px-4 py-3">
                  <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-white' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {idx + 1}
                  </span>
                  {imgUrl && (
                    <img src={imgUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded object-cover" />
                  )}
                  {!imgUrl && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                      <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm text-gray-800">{extractCaptionText(cap.content)}</p>
                  <span className="flex-shrink-0 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
                    {cap.like_count ?? 0} likes
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* Rate captions section */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Rate Captions</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Vote on public captions — your vote is highlighted if you&apos;ve already voted.
              </p>
            </div>
          </div>
          {/* Sort toggle */}
          <div className="flex flex-shrink-0 gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <Link
              href={`/protected?page=1&sort=newest`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sortBy === 'newest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Newest
            </Link>
            <Link
              href={`/protected?page=1&sort=popular`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sortBy === 'popular' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Most Popular
            </Link>
          </div>
        </div>

        {captionsError && (
          <p className="mt-4 text-sm text-red-600">
            Failed to load captions: {captionsError.message}
          </p>
        )}

        {!captionsError && (!captions || captions.length === 0) && (
          <p className="mt-4 text-sm text-gray-500">No public captions found.</p>
        )}

        <div className="mt-5 grid gap-4">
          {captions?.map((caption) => {
            const imageUrl = (caption.images as { url?: string } | null)?.url ?? null
            const existingVote = userVoteMap.get(caption.id)
            const hasVoted = existingVote !== undefined
            return (
            <article
              key={caption.id}
              className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${
                hasVoted ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex gap-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Caption source image"
                    className="h-24 w-24 flex-shrink-0 rounded-lg object-cover border border-gray-200"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100">
                    <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-gray-900">{extractCaptionText(caption.content)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      Likes: <span className="font-semibold text-gray-600">{caption.like_count ?? 0}</span>
                    </span>
                    {hasVoted && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                        You voted {existingVote > 0 ? '+1' : '-1'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <form action={rateCaption}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="1" />
                  <button
                    type="submit"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      existingVote === 1
                        ? 'bg-green-700 text-white ring-2 ring-green-300'
                        : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    Funny +1
                  </button>
                </form>
                <form action={rateCaption}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="-1" />
                  <button
                    type="submit"
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      existingVote === -1
                        ? 'bg-gray-500 text-white ring-2 ring-gray-300'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    Not Funny -1
                  </button>
                </form>
              </div>
            </article>
            )
          })}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          {currentPage > 1 ? (
            <Link
              href={`/protected?page=${currentPage - 1}&sort=${sortBy}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Previous
            </Link>
          ) : (
            <div />
          )}
          <span className="text-xs text-gray-500">
            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
            {totalCaptions !== null && (
              <span className="ml-1 text-gray-400">({totalCaptions} captions)</span>
            )}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={`/protected?page=${currentPage + 1}&sort=${sortBy}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Next
            </Link>
          ) : (
            <div />
          )}
        </div>
      </section>

      {/* Recent votes section */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Recent Votes</h2>
            <p className="mt-0.5 text-sm text-gray-500">Last 20 votes you have submitted.</p>
          </div>
        </div>

        {votesError && (
          <p className="mt-4 text-sm text-red-600">
            Failed to load your votes: {votesError.message}
          </p>
        )}

        {!votesError && (
          <ul className="mt-4 space-y-2">
            {(recentVotes ?? []).length === 0 && (
              <li className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                No votes yet. Submit one above.
              </li>
            )}
            {(recentVotes ?? []).map((vote) => {
              const captionContent = (vote.captions as { content?: string } | null)?.content ?? null
              return (
              <li
                key={vote.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  {captionContent && (
                    <p className="truncate text-sm text-gray-700">{captionContent}</p>
                  )}
                  <p className="min-w-0 truncate font-mono text-xs text-gray-400">
                    ID: {vote.caption_id}
                  </p>
                </div>
                <span
                  className={`ml-3 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    vote.vote_value > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {vote.vote_value > 0 ? '+1' : '-1'}
                </span>
              </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Footer actions */}
      <div className="flex items-center gap-4 pb-4">
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 active:bg-red-200"
          >
            Sign out
          </button>
        </form>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
          Back to Home
        </Link>
      </div>
    </main>
  )
}
