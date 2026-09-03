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
}
