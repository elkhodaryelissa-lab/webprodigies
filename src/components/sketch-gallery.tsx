"use client"

import { useMutation, useQuery } from "convex/react"
import { ImageOffIcon, Trash2Icon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
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

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Queued",
  processing: "Generating…",
  completed: "Ready",
  failed: "Failed",
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  uploaded: "secondary",
  processing: "outline",
  completed: "default",
  failed: "destructive",
}

export function SketchGallery() {
  const sketches = useQuery(api.sketches.listSketches)
  const removeSketch = useMutation(api.sketches.removeSketch)

  if (sketches === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Spinner /> Loading your sketches…
      </div>
    )
  }

  if (sketches.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageOffIcon />
          </EmptyMedia>
          <EmptyTitle>No sketches yet</EmptyTitle>
          <EmptyDescription>
            Upload a sketch above and it will show up here once it&apos;s
            processed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <AttachmentGroup className="flex-wrap">
      {sketches.map((sketch) => (
        <Attachment key={sketch._id} orientation="vertical" state="done">
          <AttachmentMedia variant="image">
            {sketch.imageUrl ? (
              <img src={sketch.imageUrl} alt={sketch.title} />
            ) : (
              <ImageOffIcon />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{sketch.title}</AttachmentTitle>
            <AttachmentDescription className="flex items-center gap-1.5">
              <Badge variant={STATUS_VARIANT[sketch.status]}>
                {STATUS_LABEL[sketch.status] ?? sketch.status}
              </Badge>
              <span>
                {formatDistanceToNow(new Date(sketch._creationTime), {
                  addSuffix: true,
                })}
              </span>
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label="Delete sketch"
              onClick={() => removeSketch({ sketchId: sketch._id as Id<"sketches"> })}
            >
              <Trash2Icon />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  )
}
