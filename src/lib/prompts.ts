// Not from a screenshot -- your route.ts screenshot referenced
// `prompts.styleGuide.system` but never showed where `prompts` comes
// from or what's in it. This is my own addition: a place for it to
// live, with a system prompt that sets up the style-guide-generation
// task (the per-request specifics -- image count, "return ONLY JSON" --
// stay in route.ts's own `userPrompt`, matching what was confirmed
// there). Replace this if you find the real file.
export const prompts = {
  styleGuide: {
    system: [
      "You are a senior product designer creating a design system from",
      "mood board reference images. Look at the colors, contrast,",
      "spacing, and overall mood of the images and translate them into",
      "a cohesive, usable style guide: a primary/secondary/accent color",
      "palette, UI component colors, form/utility colors, and status",
      "colors, plus a small typography system (headings, body text, UI",
      "text) that matches the aesthetic. Prefer real, specific hex",
      "colors and font choices over vague descriptions. Keep names",
      "short and usable as design-token labels (e.g. 'Deep Ocean',",
      "'Warm Sand').",
    ].join(" "),
  },
  // Not from a screenshot either -- your route.ts screenshot referenced
  // `prompts.generativeUi.system` the same way it referenced
  // `prompts.styleGuide.system` above (a system prompt, with the
  // per-request specifics living in the route's own userPrompt). Same
  // deal: my own addition so the code compiles and runs, replace if you
  // find the real one.
  generativeUi: {
    system: [
      "You are a senior front-end engineer turning a rough UI",
      "sketch/wireframe into a polished, self-contained HTML document.",
      "Output ONLY raw HTML starting with <!DOCTYPE html> -- no markdown",
      "code fences, no commentary before or after, and never JSON even",
      "if other instructions mention a schema. Include",
      "<script src=\"https://cdn.tailwindcss.com\"></script> in <head> and",
      "style everything with Tailwind utility classes. Follow the",
      "user-provided styleGuide for all colors and typography, use any",
      "inspiration images only for mood, and make the result visually",
      "complete even where the sketch is rough.",
    ].join(" "),
  },
}
