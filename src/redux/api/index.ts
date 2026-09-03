import { ProjectApi } from "./project"
import { BillingApi } from "./billing"
import { styleGuideApi } from "./style-guide"
import { generationApi } from "./generation"

// generationApi added alongside the other 3 -- same registration
// pattern already used here, required for its reducer/middleware to
// actually be wired into the store (not shown in any screenshot, but
// mechanically necessary the same way the other 3 entries are).
export const apis= [ProjectApi, BillingApi, styleGuideApi, generationApi]
