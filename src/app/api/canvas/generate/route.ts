import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Not from a screenshot -- the video hasn't gotten to this part yet and
// Elissa asked me to build it myself so she doesn't have to keep
// watching. This is the missing other end of handleGenerateDesign's
// FormData post (src/hooks/use-canvas.ts): takes the frame snapshot
// image, sends it to Claude with vision, gets back a self-contained
// HTML mockup, spends one credit, and returns the HTML for the client
// to drop onto the canvas as a `generatedui` shape (its `uiSpecData`
// field is already typed/commented as "HTML markup as string").
export async function POST(req: NextRequest) {
  try {
    const token = await convexAuthNextjsToken();
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const me = await fetchQuery(api.user.getCurrentUser, {}, { token });
    if (!me) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get("image");
    const frameNumber = formData.get("frameNumber");
    const projectId = formData.get("projectId");

    if (!(image instanceof Blob)) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    const balance = await fetchQuery(
      api.subscriptions.getCreditsBalance,
      { userId: me._id as Id<"users"> },
      { token }
    );
    if (!balance || balance <= 0) {
      return NextResponse.json(
        { error: "insufficient-credits", message: "You're out of credits." },
        { status: 402 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = image.type || "image/png";

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/png"
                  | "image/jpeg"
                  | "image/webp"
                  | "image/gif",
                data: base64,
              },
            },
            {
              type: "text",
              text: [
                "This is a rough UI sketch/wireframe. Turn it into a single",
                "self-contained HTML document that renders a polished,",
                "modern version of this design.",
                "",
                "Rules:",
                "- Output ONLY raw HTML, starting with <!DOCTYPE html> -- no",
                "  markdown code fences, no commentary before or after.",
                "- Include <script src=\"https://cdn.tailwindcss.com\"></script>",
                "  in <head> and style everything with Tailwind utility",
                "  classes.",
                "- Make it visually complete (colors, spacing, typography)",
                "  even where the sketch is rough -- use your best judgment",
                "  to fill gaps.",
                "- No external images -- use CSS/SVG/emoji/placeholder",
                "  colored boxes instead.",
                "- The document should be self-contained and render",
                "  correctly inside a sandboxed iframe with no network",
                "  access besides the Tailwind CDN script above.",
              ].join("\n"),
            },
          ],
        },
      ],
    });

    const textBlock = completion.content.find((block) => block.type === "text");
    let html = textBlock && "text" in textBlock ? textBlock.text.trim() : "";

    // Strip ```html ... ``` fences in case the model wraps its output
    // despite being told not to.
    html = html.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "").trim();

    if (!html) {
      return NextResponse.json(
        { error: "generation-failed", message: "No design was generated." },
        { status: 502 }
      );
    }

    const spend = await fetchMutation(
      api.subscriptions.consumeCredit,
      { userId: me._id as Id<"users">, reason: "ai-generation" },
      { token }
    );

    return NextResponse.json({
      uiSpecData: html,
      frameNumber: frameNumber ? String(frameNumber) : null,
      projectId: projectId ? String(projectId) : null,
      creditsRemaining: spend.ok ? spend.balance : balance,
    });
  } catch (error) {
    console.error("Canvas generation error:", error);
    return NextResponse.json(
      { error: "generation-failed", message: "Failed to generate design." },
      { status: 500 }
    );
  }
}
