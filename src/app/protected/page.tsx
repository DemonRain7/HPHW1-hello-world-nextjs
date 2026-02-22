import Link from 'next/link'
import { redirect } from 'next/navigation'
import { rateCaption, signOut } from './actions'
import CaptionPipelineForm from './caption-pipeline-form'
import { createClient } from '@/lib/supabase/server'

type ProtectedPageProps = {
  searchParams?: Promise<{
    vote?: string
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

  const { data: captions, error: captionsError } = await supabase
    .from('captions')
    .select('id, content, like_count')
    .eq('is_public', true)
    .order('created_datetime_utc', { ascending: false })
    .limit(12)

  const { data: recentVotes, error: votesError } = await supabase
    .from('caption_votes')
    .select('id, caption_id, vote_value, created_datetime_utc')
    .eq('profile_id', user.id)
    .order('created_datetime_utc', { ascending: false })
    .limit(8)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">HW5</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
          Caption Pipeline
        </h1>
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

      {/* Rate captions section */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
            <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Rate Captions</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Vote on public captions. Each vote writes a row into{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">caption_votes</code>.
            </p>
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
          {captions?.map((caption) => (
            <article
              key={caption.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition-shadow hover:shadow-sm"
            >
              <p className="text-sm leading-relaxed text-gray-900">{caption.content}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  ID: <code className="font-mono">{caption.id}</code>
                </span>
                <span className="text-xs text-gray-400">
                  Likes: {caption.like_count ?? 0}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <form action={rateCaption}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="1" />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 active:bg-green-800"
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
                    className="flex items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-300 active:bg-gray-400"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    Not Funny -1
                  </button>
                </form>
              </div>
            </article>
          ))}
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
            <p className="mt-0.5 text-sm text-gray-500">Last 8 votes you have submitted.</p>
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
            {(recentVotes ?? []).map((vote) => (
              <li
                key={vote.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <p className="min-w-0 truncate font-mono text-xs text-gray-500">
                  Caption: {vote.caption_id}
                </p>
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
            ))}
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
          ← Back to Home
        </Link>
      </div>
    </main>
  )
}
