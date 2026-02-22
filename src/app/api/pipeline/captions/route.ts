import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const API_BASE_URL = 'https://api.almostcrackd.ai'

const SUPPORTED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
])

type PresignedUrlResponse = {
  presignedUrl?: string
  cdnUrl?: string
}

type RegisterImageResponse = {
  imageId?: string
}

function getSafeStatus(status: number, fallback = 502) {
  return status >= 400 && status <= 599 ? status : fallback
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing file field. Use multipart form-data with key "file".' },
        { status: 400 }
      )
    }

    const contentType = file.type.toLowerCase()

    if (!SUPPORTED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          error: `Unsupported content type: ${contentType || 'unknown'}`,
          supportedContentTypes: Array.from(SUPPORTED_CONTENT_TYPES),
        },
        { status: 400 }
      )
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        { error: 'Missing valid JWT access token. Please sign in again.' },
        { status: 401 }
      )
    }

    const accessToken = session.access_token

    const presignedUrlResponse = await fetch(`${API_BASE_URL}/pipeline/generate-presigned-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contentType }),
      cache: 'no-store',
    })

    const presignedUrlBody = (await readJsonSafe(
      presignedUrlResponse
    )) as PresignedUrlResponse | null

    if (
      !presignedUrlResponse.ok ||
      !presignedUrlBody?.presignedUrl ||
      !presignedUrlBody?.cdnUrl
    ) {
      return NextResponse.json(
        {
          step: 'generate-presigned-url',
          error: 'Failed to generate presigned upload URL.',
          details: presignedUrlBody,
        },
        { status: getSafeStatus(presignedUrlResponse.status) }
      )
    }

    const uploadResponse = await fetch(presignedUrlBody.presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
      cache: 'no-store',
    })

    if (!uploadResponse.ok) {
      const uploadResponseText = await uploadResponse.text().catch(() => '')
      return NextResponse.json(
        {
          step: 'upload-bytes-to-presigned-url',
          error: 'Failed to upload image bytes to storage.',
          details: uploadResponseText || null,
        },
        { status: getSafeStatus(uploadResponse.status) }
      )
    }

    const registerImageResponse = await fetch(`${API_BASE_URL}/pipeline/upload-image-from-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: presignedUrlBody.cdnUrl,
        isCommonUse: false,
      }),
      cache: 'no-store',
    })

    const registerImageBody = (await readJsonSafe(
      registerImageResponse
    )) as RegisterImageResponse | null

    if (!registerImageResponse.ok || !registerImageBody?.imageId) {
      return NextResponse.json(
        {
          step: 'register-image-url',
          error: 'Failed to register image URL in pipeline.',
          details: registerImageBody,
        },
        { status: getSafeStatus(registerImageResponse.status) }
      )
    }

    const captionsResponse = await fetch(`${API_BASE_URL}/pipeline/generate-captions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageId: registerImageBody.imageId,
      }),
      cache: 'no-store',
    })

    const captionsBody = await readJsonSafe(captionsResponse)

    if (!captionsResponse.ok || !Array.isArray(captionsBody)) {
      return NextResponse.json(
        {
          step: 'generate-captions',
          error: 'Failed to generate captions.',
          details: captionsBody,
        },
        { status: getSafeStatus(captionsResponse.status) }
      )
    }

    return NextResponse.json({
      imageId: registerImageBody.imageId,
      cdnUrl: presignedUrlBody.cdnUrl,
      captions: captionsBody,
    })
  } catch (error) {
    console.error('Unexpected pipeline route failure:', error)
    return NextResponse.json(
      {
        error: 'Unexpected server error while processing image caption pipeline.',
      },
      { status: 500 }
    )
  }
}
