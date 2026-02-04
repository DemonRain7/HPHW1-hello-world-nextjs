import { supabase } from '@/lib/supabase'

type Image = {
  id: number
  url?: string
  image_url?: string
  title?: string
  description?: string
  created_at?: string
  [key: string]: unknown
}

export default async function Home() {
  const { data: images, error } = await supabase
    .from('images')
    .select('*')
    .limit(20)

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold mb-6 text-red-500">Error</h1>
        <p>{error.message}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Images Gallery</h1>

      {/* Layout of the images */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images?.map((image: Image) => (
          <div
            key={image.id}
            className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            {(image.url || image.image_url) && (
              <img
                src={image.url || image.image_url}
                alt={image.title || `Image ${image.id}`}
                className="w-full h-48 object-cover rounded mb-2"
              />
            )}
            <p className="font-semibold">ID: {image.id}</p>
            {image.title && <p>{image.title}</p>}
            {image.description && (
              <p className="text-gray-600 text-sm">{image.description}</p>
            )}
          </div>
        ))}
      </div>

      {images?.length === 0 && (
        <p className="text-gray-500">No images found.</p>
      )}
    </main>
  )
}
