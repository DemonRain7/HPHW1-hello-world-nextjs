'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignInButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSignIn = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {isLoading ? 'Redirecting to Google...' : 'Sign in with Google'}
      </button>
      {errorMessage && <p className="mt-3 text-red-600">{errorMessage}</p>}
    </>
  )
}
