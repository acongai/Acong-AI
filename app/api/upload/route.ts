import { NextResponse } from "next/server"

import { COPY } from "@/lib/copy"
import { uploadImageAttachment } from "@/lib/storage/upload"
import { createClient } from "@/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        {
          error: COPY.upload.authRequired,
        },
        { status: 401 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const threadIdValue = formData.get("threadId")

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: COPY.upload.invalidFile,
        },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const attachment = await uploadImageAttachment({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      threadId: typeof threadIdValue === "string" ? threadIdValue : null,
      userId: user.id,
    })

    return NextResponse.json({
      attachment: {
        fileName: attachment.file_name,
        id: attachment.id,
        mimeType: attachment.mime_type,
        url: attachment.public_url,
      },
    })
  } catch (error) {
    console.error("upload_route_error", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : COPY.upload.genericError,
      },
      { status: 500 },
    )
  }
}
