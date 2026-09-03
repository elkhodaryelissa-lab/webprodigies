"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { UploadCloudIcon, XIcon, RotateCcwIcon } from "lucide-react"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment"

type UploadState = "uploading" | "error" | "done"

type PendingUpload = {
  id: string
  file: File
  previewUrl: string
  progress: number
  state: UploadState
  error?: string
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB

export function SketchUpload() {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploads, setUploads] = React.useState<PendingUpload[]>([])

  const generateUploadUrl = useMutation(api.sketches.generateUploadUrl)
  const createSketch = useMutation(api.sketches.createSketch)

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
  }

  const uploadFile = React.useCallback(
    async (upload: PendingUpload) => {
      try {
        const postUrl = await generateUploadUrl()

        const storageId = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", postUrl, true)
          xhr.setRequestHeader("Content-Type", upload.file.type)

          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploads((prev) =>
              prev.map((u) => (u.id === upload.id ? { ...u, progress } : u)),
            )
          }

          xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
              reject(new Error(`Upload failed (${xhr.status})`))
              return
            }
            try {
              const { storageId } = JSON.parse(xhr.responseText)
              resolve(storageId)
            } catch {
              reject(new Error("Unexpected response from upload"))
            }
          }
          xhr.onerror = () => reject(new Error("Network error during upload"))
          xhr.send(upload.file)
        })

        await createSketch({
          title: upload.file.name.replace(/\.[^/.]+$/, ""),
          imageStorageId: storageId as Id<"_storage">,
        })

        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id ? { ...u, state: "done", progress: 100 } : u,
          ),
        )
        setTimeout(() => removeUpload(upload.id), 1200)
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? {
                  ...u,
                  state: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : u,
          ),
        )
      }
    },
    [generateUploadUrl, createSketch],
  )

  const handleFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const next: PendingUpload[] = []
      for (const file of Array.from(fileList)) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue
        if (file.size > MAX_FILE_SIZE) continue
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          state: "uploading",
        })
      }
      if (next.length === 0) return

      setUploads((prev) => [...prev, ...next])
      next.forEach((upload) => uploadFile(upload))
    },
    [uploadFile],
  )

  const retryUpload = (upload: PendingUpload) => {
    setUploads((prev) =>
      prev.map((u) =>
        u.id === upload.id ? { ...u, state: "uploading", progress: 0, error: undefined } : u,
      ),
    )
    uploadFile(upload)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <Empty
          className={cn(
            "border cursor-pointer transition-colors hover:bg-muted/50",
            isDragging && "border-primary bg-muted/50",
          )}
          onClick={() => inputRef.current?.click()}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UploadCloudIcon />
            </EmptyMedia>
            <EmptyTitle>Upload a sketch</EmptyTitle>
            <EmptyDescription>
              Drag and drop a wireframe or sketch image here, or click to browse.
              PNG, JPG, WEBP or GIF, up to 15MB.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
          </EmptyContent>
        </Empty>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {uploads.length > 0 && (
        <AttachmentGroup>
          {uploads.map((upload) => (
            <Attachment key={upload.id} state={upload.state} orientation="vertical">
              <AttachmentMedia variant="image">
                <img src={upload.previewUrl} alt={upload.file.name} />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{upload.file.name}</AttachmentTitle>
                <AttachmentDescription>
                  {upload.state === "uploading" && `Uploading… ${upload.progress}%`}
                  {upload.state === "done" && "Uploaded"}
                  {upload.state === "error" && (upload.error ?? "Upload failed")}
                </AttachmentDescription>
                {upload.state === "uploading" && (
                  <Progress value={upload.progress} className="mt-1.5">
                    <ProgressTrack>
                      <ProgressIndicator />
                    </ProgressTrack>
                  </Progress>
                )}
              </AttachmentContent>
              <AttachmentActions>
                {upload.state === "error" ? (
                  <AttachmentAction
                    aria-label="Retry upload"
                    onClick={() => retryUpload(upload)}
                  >
                    <RotateCcwIcon />
                  </AttachmentAction>
                ) : (
                  <AttachmentAction
                    aria-label="Cancel"
                    onClick={() => removeUpload(upload.id)}
                  >
                    <XIcon />
                  </AttachmentAction>
                )}
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}
    </div>
  )
}
