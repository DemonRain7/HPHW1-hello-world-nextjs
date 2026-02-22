'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'

const SUPPORTED_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
] as const

const PIPELINE_STEPS = [
  {
    id: 1,
    label: 'Generate presigned URL',
    description: 'Requesting a secure upload endpoint from the API',
  },
  {
    id: 2,
    label: 'Upload image bytes',
    description: 'Sending image data directly to storage',
  },
  {
    id: 3,
    label: 'Register image in pipeline',
    description: 'Linking the uploaded image to the caption system',
  },
  {
    id: 4,
    label: 'Generate captions',
    description: 'AI is analyzing your image and crafting captions',
  },
] as const

type CaptionPipelineResponse = {
  imageId: string
  cdnUrl: string
  captions: unknown[]
}

type StepStatus = 'pending' | 'active' | 'done' | 'error'

function getCaptionText(captionRecord: unknown): string | null {
  if (typeof captionRecord === 'string' && captionRecord.trim()) {
    return captionRecord
  }
  if (!captionRecord || typeof captionRecord !== 'object') return null
  for (const field of ['content', 'caption', 'text'] as const) {
    const value = (captionRecord as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export default function CaptionPipelineForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<CaptionPipelineResponse | null>(null)
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([
    'pending',
    'pending',
    'pending',
    'pending',
  ])
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const selectedFileInfo = useMemo(() => {
    if (!selectedFile) return null
    const sizeInKb = (selectedFile.size / 1024).toFixed(1)
    return `${selectedFile.name} (${selectedFile.type || 'unknown'}, ${sizeInKb} KB)`
  }, [selectedFile])

  function clearStepTimeouts() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function handleFileSelect(file: File | null) {
    setSelectedFile(file)
    setErrorMessage(null)
    setResult(null)
    setStepStatuses(['pending', 'pending', 'pending', 'pending'])
    clearStepTimeouts()
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  function startStepAnimation() {
    clearStepTimeouts()
    setStepStatuses(['active', 'pending', 'pending', 'pending'])
    const advances = [
      { delay: 1200, fromStep: 0 },
      { delay: 2800, fromStep: 1 },
      { delay: 4800, fromStep: 2 },
    ]
    for (const { delay, fromStep } of advances) {
      const t = setTimeout(() => {
        setStepStatuses((prev) => {
          if (prev[fromStep] !== 'active') return prev
          const next = [...prev] as StepStatus[]
          next[fromStep] = 'done'
          next[fromStep + 1] = 'active'
          return next
        })
      }, delay)
      timeoutsRef.current.push(t)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedFile) {
      setErrorMessage('Please select an image file first.')
      return
    }

    if (
      !SUPPORTED_CONTENT_TYPES.includes(
        selectedFile.type as (typeof SUPPORTED_CONTENT_TYPES)[number]
      )
    ) {
      setErrorMessage(`Unsupported file type: ${selectedFile.type || 'unknown'}`)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setResult(null)
    startStepAnimation()

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/pipeline/captions', {
        method: 'POST',
        body: formData,
      })

      const responseBody = await response.json().catch(() => ({}))
      clearStepTimeouts()

      if (!response.ok) {
        const message =
          typeof responseBody?.error === 'string'
            ? responseBody.error
            : 'Caption pipeline request failed.'
        setStepStatuses((prev) => {
          const next = [...prev] as StepStatus[]
          const activeIdx = next.findIndex((s) => s === 'active')
          if (activeIdx >= 0) next[activeIdx] = 'error'
          return next
        })
        setErrorMessage(message)
        return
      }

      setStepStatuses(['done', 'done', 'done', 'done'])
      setResult(responseBody as CaptionPipelineResponse)
    } catch (error) {
      console.error('Failed to call caption pipeline route:', error)
      clearStepTimeouts()
      setStepStatuses((prev) => {
        const next = [...prev] as StepStatus[]
        const activeIdx = next.findIndex((s) => s === 'active')
        if (activeIdx >= 0) next[activeIdx] = 'error'
        return next
      })
      setErrorMessage('Network error while calling caption pipeline. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasStarted = stepStatuses.some((s) => s !== 'pending')

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drop zone */}
        <div
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            handleFileSelect(e.dataTransfer.files?.[0] ?? null)
          }}
          onClick={() => document.getElementById('hw5-file-input')?.click()}
        >
          <input
            id="hw5-file-input"
            type="file"
            accept={SUPPORTED_CONTENT_TYPES.join(',')}
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          {previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Selected image preview"
                className="max-h-52 max-w-full rounded-lg object-contain shadow-md"
              />
              <p className="text-sm font-medium text-green-700">{selectedFileInfo}</p>
              <p className="text-xs text-gray-400">Click to change image</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
                <svg
                  className="h-7 w-7 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Drop an image here, or click to browse
                </p>
                <p className="mt-1 text-xs text-gray-500">JPEG · PNG · WebP · GIF · HEIC</p>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !selectedFile}
          className="w-full rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Upload & Generate Captions'
          )}
        </button>
      </form>

      {/* Step progress tracker */}
      {hasStarted && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Pipeline Progress
          </p>
          <ol className="space-y-4">
            {PIPELINE_STEPS.map((step, index) => {
              const status = stepStatuses[index]
              return (
                <li key={step.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {status === 'done' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                        <svg
                          className="h-3.5 w-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                    {status === 'active' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-blue-500">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                      </div>
                    )}
                    {status === 'error' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                        <svg
                          className="h-3.5 w-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                    )}
                    {status === 'pending' && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-200">
                        <span className="text-xs font-semibold text-gray-300">{step.id}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        status === 'done'
                          ? 'text-green-700'
                          : status === 'active'
                            ? 'text-blue-700'
                            : status === 'error'
                              ? 'text-red-700'
                              : 'text-gray-300'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${
                        status === 'pending' ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Upload summary */}
          <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-green-800">Upload complete!</p>
              <p className="text-xs text-green-700">
                Image ID:{' '}
                <code className="rounded bg-green-100 px-1 py-0.5 font-mono text-xs">
                  {result.imageId}
                </code>
              </p>
              <p className="break-all text-xs text-green-700">
                CDN URL:{' '}
                <a
                  href={result.cdnUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono underline hover:text-green-900"
                >
                  {result.cdnUrl}
                </a>
              </p>
            </div>
          </div>

          {/* Caption cards */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">Generated Captions</h3>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {result.captions.length}
              </span>
            </div>

            {result.captions.length === 0 ? (
              <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500">
                No captions were returned by the API.
              </p>
            ) : (
              <div className="space-y-3">
                {result.captions.map((captionRecord, index) => {
                  const captionText = getCaptionText(captionRecord)
                  return (
                    <article
                      key={`caption-${index}`}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {captionText ? (
                            <p className="text-sm leading-relaxed text-gray-900">{captionText}</p>
                          ) : (
                            <p className="text-sm italic text-gray-400">Caption #{index + 1}</p>
                          )}
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                              View raw data
                            </summary>
                            <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                              {JSON.stringify(captionRecord, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
