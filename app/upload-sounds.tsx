"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface UploadResult {
  filename: string
  url: string
  status: "success" | "error"
  error?: string
}

export default function UploadSounds() {
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])

  const uploadSoundFiles = async () => {
    setUploading(true)
    setResults([])

    try {
      // Upload the commentary file
      const commentaryResponse = await fetch("/sounds/goal-commentary.mp3")
      const commentaryBlob = await commentaryResponse.blob()

      const commentaryFormData = new FormData()
      commentaryFormData.append("file", commentaryBlob, "goal-commentary.mp3")

      const commentaryUpload = await fetch("/api/upload-sound", {
        method: "POST",
        body: commentaryFormData,
      })

      const commentaryResult = await commentaryUpload.json()

      setResults((prev) => [
        ...prev,
        {
          filename: "goal-commentary.mp3",
          url: commentaryResult.url || "",
          status: commentaryUpload.ok ? "success" : "error",
          error: commentaryResult.error,
        },
      ])

      // Upload the horn file
      const hornResponse = await fetch("/sounds/goal-horn.mp3")
      const hornBlob = await hornResponse.blob()

      const hornFormData = new FormData()
      hornFormData.append("file", hornBlob, "goal-horn.mp3")

      const hornUpload = await fetch("/api/upload-sound", {
        method: "POST",
        body: hornFormData,
      })

      const hornResult = await hornUpload.json()

      setResults((prev) => [
        ...prev,
        {
          filename: "goal-horn.mp3",
          url: hornResult.url || "",
          status: hornUpload.ok ? "success" : "error",
          error: hornResult.error,
        },
      ])
    } catch (error) {
      console.error("Upload failed:", error)
      setResults((prev) => [
        ...prev,
        {
          filename: "Upload Error",
          url: "",
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ])
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Sounds to Vercel Blob
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          This will upload your sound files to Vercel Blob storage for reliable hosting.
        </div>

        <Button onClick={uploadSoundFiles} disabled={uploading} className="w-full">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Sound Files
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Upload Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                {result.status === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">{result.filename}</div>
                  {result.status === "success" ? (
                    <div className="text-xs text-gray-600 break-all">{result.url}</div>
                  ) : (
                    <div className="text-xs text-red-600">{result.error}</div>
                  )}
                </div>
              </div>
            ))}

            {results.every((r) => r.status === "success") && (
              <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                <div className="font-medium text-green-800 mb-2">✅ Upload Successful!</div>
                <div className="text-sm text-green-700">
                  Copy these URLs and update the AVAILABLE_SOUNDS in lib/sounds.ts:
                </div>
                <div className="mt-2 space-y-1 text-xs font-mono bg-white p-2 rounded border">
                  {results.map((result, index) => (
                    <div key={index}>
                      {result.filename.includes("commentary") ? "commentary" : "horn"}: "{result.url}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
