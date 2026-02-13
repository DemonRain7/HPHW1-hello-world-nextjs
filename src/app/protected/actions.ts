'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function rateCaption(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const captionId = String(formData.get('captionId') ?? '').trim()
  const voteValue = Number(formData.get('voteValue'))

  if (!captionId || !Number.isInteger(voteValue) || ![-1, 1].includes(voteValue)) {
    redirect('/protected?vote=invalid')
  }

  const nowIso = new Date().toISOString()

  const { error } = await supabase.from('caption_votes').insert({
    caption_id: captionId,
    vote_value: voteValue,
    profile_id: user.id,
    created_datetime_utc: nowIso,
    modified_datetime_utc: nowIso,
  })

  if (!error) {
    revalidatePath('/protected')
    redirect('/protected?vote=created')
  }

  if (error.code === '23505') {
    const { error: updateError } = await supabase
      .from('caption_votes')
      .update({
        vote_value: voteValue,
        modified_datetime_utc: new Date().toISOString(),
      })
      .eq('caption_id', captionId)
      .eq('profile_id', user.id)

    if (!updateError) {
      revalidatePath('/protected')
      redirect('/protected?vote=updated')
    }
  }

  console.error('Failed to mutate vote:', error.message)
  redirect('/protected?vote=error')
}
