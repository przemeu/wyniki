"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle, AlertCircle, Loader2, Copy, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface UploadResult {
  filename: string
  url: string
  status: "success" | "error"
  error?: string
  cleanFilename?: string
}

export default function UploadSoundsPage() {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  const uploadSoundFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Please select sound files first!")
      return
    }

    setUploading(true)
    setResults([])

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        // Only process audio files
        if (!file.type.startsWith("audio/")) {
          setResults((prev) => [
            ...prev,
            {
              filename: file.name,
              url: "",
              status: "error",
              error: "Not an audio file",
            },
          ])
          continue
        }

        const formData = new FormData()
        formData.append("file", file)

        try {
          const uploadResponse = await fetch("/api/upload-sound", {
            method: "POST",
            body: formData,
          })

          const result = await uploadResponse.json()

          setResults((prev) => [
            ...prev,
            {
              filename: file.name,
              url: result.url || "",
              status: uploadResponse.ok ? "success" : "error",
              error: result.error,
              cleanFilename: result.cleanFilename,
            },
          ])
        } catch (error) {
          setResults((prev) => [
            ...prev,
            {
              filename: file.name,
              url: "",
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
            },
          ])
        }
      }
    } catch (error) {
      console.error("Upload process failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const generateCodeSnippet = () => {
    const successfulUploads = results.filter((r) => r.status === "success")
    if (successfulUploads.length === 0) return ""

    const commentaryFile = successfulUploads.find(
      (r) => r.filename.toLowerCase().includes("commentary") || r.filename.toLowerCase().includes("komentarz"),
    )

    const hornFile = successfulUploads.find(
      (r) => r.filename.toLowerCase().includes("horn") || r.filename.toLowerCase().includes("klakson"),
    )

    return `export const AVAILABLE_SOUNDS: { id: SoundType; name: string; files: string[] }[] = [
  { id: "none", name: "Brak dźwięku", files: [] },
  {
    id: "commentary",
    name: "Komentarz",
    files: [
      "${commentaryFile?.url || "YOUR_COMMENTARY_BLOB_URL"}",
      "/sounds/goal-commentary.mp3", // Fallback
    ],
  },
  {
    id: "horn",
    name: "Żółci Klakson",
    files: [
      "${hornFile?.url || "YOUR_HORN_BLOB_URL"}",
      "/sounds/goal-horn.mp3", // Fallback
    ],
  },
]`
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-yellow-50 to-yellow-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Upload Sounds to Vercel Blob</h1>
          <p className="text-gray-600 mt-2">
            Upload your sound files to Vercel Blob storage for reliable hosting in production.
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Select and Upload Sound Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Select your MP3 sound files (goal-commentary.mp3, goal-horn.mp3, etc.)
            </div>

            <div className="space-y-4">
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              {selectedFiles && selectedFiles.length > 0 && (
                <div className="text-sm text-gray-600">
                  Selected {selectedFiles.length} file(s):
                  <ul className="list-disc list-inside mt-1">
                    {Array.from(selectedFiles).map((file, index) => (
                      <li key={index}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={uploadSoundFiles}
                disabled={uploading || !selectedFiles || selectedFiles.length === 0}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload to Vercel Blob
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {result.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{result.filename}</div>
                    {result.status === "success" ? (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600 break-all font-mono bg-white p-2 rounded border">
                          {result.url}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(result.url)}
                          className="text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy URL
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-red-600">{result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Code Generation */}
        {results.some((r) => r.status === "success") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>✅ Generated Code</span>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(generateCodeSnippet())}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-green-700 bg-green-50 p-3 rounded">
                  <strong>Success!</strong> Your files have been uploaded to Vercel Blob storage. Copy the code below
                  and replace the AVAILABLE_SOUNDS in <code>lib/sounds.ts</code>
                </div>

                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code>{generateCodeSnippet()}</code>
                </pre>

                <div className="text-sm text-gray-600">
                  <strong>Next steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Copy the code above</li>
                    <li>
                      Replace the AVAILABLE_SOUNDS export in <code>lib/sounds.ts</code>
                    </li>
                    <li>Deploy your app</li>
                    <li>Test the sounds on the published site</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>1. Upload Files:</strong> Select your sound files (MP3 format recommended) and click upload.
            </div>
            <div>
              <strong>2. Copy URLs:</strong> Once uploaded, copy the generated blob URLs.
            </div>
            <div>
              <strong>3. Update Code:</strong> Replace the AVAILABLE_SOUNDS in lib/sounds.ts with the generated code.
            </div>
            <div>
              <strong>4. Deploy:</strong> Deploy your app and test the sounds on the published site.
            </div>
            <div className="text-gray-600 italic">
              The blob URLs will be permanent and work reliably in production, unlike files in the public folder.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
