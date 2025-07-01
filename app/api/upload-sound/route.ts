import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`📤 Uploading file: ${file.name} (${file.size} bytes)`)

    // Upload to Vercel Blob with a clean filename
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "-")

    const blob = await put(cleanFilename, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    console.log(`✅ Upload successful: ${blob.url}`)

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      cleanFilename,
    })
  } catch (error) {
    console.error("❌ Upload error:", error)
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
