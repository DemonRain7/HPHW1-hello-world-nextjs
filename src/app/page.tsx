import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">HW4: Protected Route + Caption Ratings</h1>
      <p className="text-lg text-gray-700">
        This app protects <code>/protected</code> and lets authenticated users
        add rows to <code>caption_votes</code> by rating captions.
      </p>

      {user ? (
        <div className="rounded-xl border border-green-400 bg-green-50 p-4">
          <p className="font-medium text-green-900">Signed in as: {user.email}</p>
          <Link
            href="/protected"
            className="mt-3 inline-block rounded bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800"
          >
            Go to Rating Page
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
          <p className="font-medium">You are not signed in.</p>
          <Link
            href="/login"
            className="mt-3 inline-block rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
          >
            Sign in with Google
          </Link>
        </div>
      )}
    </main>
  )
}
