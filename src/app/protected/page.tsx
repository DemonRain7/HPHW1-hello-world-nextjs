import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signOut } from './actions'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">Protected Route</h1>
      <div className="rounded-xl border border-green-400 bg-green-50 p-5">
        <p className="text-sm uppercase text-green-700">Gated UI</p>
        <p className="mt-2 text-lg font-medium text-green-900">
          You are authenticated.
        </p>
        <p className="mt-1 text-green-900">
          Email: <span className="font-semibold">{user.email}</span>
        </p>
      </div>
      <div className="flex items-center gap-4">
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
