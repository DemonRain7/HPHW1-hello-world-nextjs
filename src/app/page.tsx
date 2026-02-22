import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">HW5</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
          Caption Pipeline
        </h1>
        <p className="mt-3 text-base leading-relaxed text-gray-600">
          Authenticated users can upload images into the 4-step caption pipeline and view
          AI-generated caption records. The{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">/protected</code> route
          requires Google sign-in.
        </p>
      </div>

      <div className="space-y-2">
        {[
          'Generate presigned upload URL',
          'Upload image bytes to storage',
          'Register image in the pipeline',
          'Generate captions via AI',
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              {i + 1}
            </span>
            <p className="text-sm text-gray-700">{step}</p>
          </div>
        ))}
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
            Open Caption Pipeline
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm text-gray-600">You are not signed in.</p>
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
