import Link from 'next/link'
import { redirect } from 'next/navigation'
import SignInButton from './sign-in-button'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/protected')
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">Sign In</h1>
      <p className="text-gray-700">
        Use Google OAuth to access the gated page at <code>/protected</code>.
      </p>
      <div className="rounded-xl border border-gray-300 bg-gray-50 p-4">
        <SignInButton />
      </div>
      <Link href="/" className="text-blue-700 hover:underline">
        Back to Home
      </Link>
    </main>
  )
}
