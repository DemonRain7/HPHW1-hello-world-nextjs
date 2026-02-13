import Link from 'next/link'
import { redirect } from 'next/navigation'
import { rateCaption, signOut } from './actions'
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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold">Protected Route: Caption Rating</h1>
      <div className="rounded-xl border border-green-400 bg-green-50 p-5">
        <p className="text-sm uppercase text-green-700">Gated UI</p>
        <p className="mt-2 text-lg font-medium text-green-900">
          You are authenticated.
        </p>
        <p className="mt-1 text-green-900">
          Email: <span className="font-semibold">{user.email}</span>
        </p>
      </div>

      {voteStatus === 'created' && (
        <p className="rounded border border-green-300 bg-green-50 px-4 py-3 text-green-800">
          Vote saved successfully.
        </p>
      )}
      {voteStatus === 'updated' && (
        <p className="rounded border border-blue-300 bg-blue-50 px-4 py-3 text-blue-800">
          Existing vote updated successfully.
        </p>
      )}
      {voteStatus === 'invalid' && (
        <p className="rounded border border-orange-300 bg-orange-50 px-4 py-3 text-orange-800">
          Invalid vote payload. Please try again.
        </p>
      )}
      {voteStatus === 'error' && (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800">
          Vote failed. This is usually an Auth/RLS policy issue in Supabase.
        </p>
      )}

      <section className="rounded-xl border border-gray-300 bg-white p-5">
        <h2 className="text-xl font-semibold">Rate Captions</h2>
        <p className="mt-1 text-gray-700">
          Click +1 or -1 to write a row into <code>caption_votes</code>.
        </p>

        {captionsError && (
          <p className="mt-3 text-red-700">Failed to load captions: {captionsError.message}</p>
        )}

        {!captionsError && (!captions || captions.length === 0) && (
          <p className="mt-3 text-gray-700">No captions found.</p>
        )}

        <div className="mt-4 grid gap-4">
          {captions?.map((caption) => (
            <article key={caption.id} className="rounded-lg border border-gray-300 p-4">
              <p className="text-gray-900">{caption.content}</p>
              <p className="mt-2 text-sm text-gray-700">
                Caption ID: <code>{caption.id}</code>
              </p>
              <p className="mt-1 text-sm text-gray-700">
                Existing like_count: {caption.like_count ?? 0}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={rateCaption}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="1" />
                  <button
                    type="submit"
                    className="rounded bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
                  >
                    Vote +1 (Funny)
                  </button>
                </form>
                <form action={rateCaption}>
                  <input type="hidden" name="captionId" value={caption.id} />
                  <input type="hidden" name="voteValue" value="-1" />
                  <button
                    type="submit"
                    className="rounded bg-orange-700 px-3 py-2 text-sm font-medium text-white hover:bg-orange-800"
                  >
                    Vote -1 (Not Funny)
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-5">
        <h2 className="text-xl font-semibold">Your Recent Votes</h2>
        {votesError && (
          <p className="mt-2 text-red-700">Failed to load your votes: {votesError.message}</p>
        )}
        {!votesError && (
          <ul className="mt-3 space-y-2">
            {(recentVotes ?? []).map((vote) => (
              <li key={vote.id} className="rounded border border-gray-200 p-3 text-sm text-gray-800">
                Vote ID: {vote.id} | Value: {vote.vote_value} | Caption: {vote.caption_id}
              </li>
            ))}
            {(recentVotes ?? []).length === 0 && (
              <li className="text-gray-700">No votes yet. Submit one above.</li>
            )}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-4 pb-4">
        <form action={signOut}>
          <button
            type="submit"
            className="rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800"
          >
            Sign out
          </button>
        </form>
        <Link href="/" className="text-blue-700 hover:underline">
          Back to Home
        </Link>
      </div>
    </main>
  )
}
