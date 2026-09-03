'use client'

import React from 'react'
import { Type, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Props = {
  typographyGuide: any
}

// NOTE: this whole component was rebuilt off your screenshot of the
// rendered browser preview, not source code -- the boxed/card layout I
// had before (borders, glass background, always-visible Font/Size/Weight
// list) didn't match what you showed me. Now: plain vertical stack, no
// card, and the font details moved into a hover tooltip behind an info
// icon (built with the project's existing `@/components/ui/tooltip`,
// which was already there -- no new UI primitive needed). Flag it if any
// spacing/sizing is off since I'm matching a photo, not exact CSS values.
const StyleGuideTypography = ({ typographyGuide }: Props) => {
  return (
    <>
      {typographyGuide.length === 0 ? (
        <div className="text-center py-20">
          <Type className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No typography generated yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a style guide to see typography recommendations.
          </p>
        </div>
      ) : (
        <TooltipProvider>
          <div className="flex flex-col gap-12">
            {typographyGuide.map((section: any, index: number) => (
              <div key={index} className="flex flex-col gap-8">
                <h3 className="text-lg font-medium text-foreground/50">
                  {section.title}
                </h3>
                <div className="flex flex-col gap-8">
                  {section.styles?.map((style: any, styleIndex: number) => (
                    <div key={styleIndex} className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-medium text-foreground">
                          {style.name}
                        </h4>
                        {style.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-0.5">
                                <div>Font: {style.fontFamily}</div>
                                <div>Size: {style.fontSize}</div>
                                <div>Weight: {style.fontWeight}</div>
                                <div>Line Height: {style.lineHeight}</div>
                                {style.letterSpacing && (
                                  <div>
                                    Letter Spacing: {style.letterSpacing}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {style.description && (
                        <p className="text-xs text-muted-foreground">
                          {style.description}
                        </p>
                      )}
                      <div
                        className="text-foreground"
                        style={{
                          fontFamily: style.fontFamily,
                          fontSize: style.fontSize,
                          fontWeight: style.fontWeight,
                          lineHeight: style.lineHeight,
                          letterSpacing: style.letterSpacing || 'normal',
                        }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      )}
    </>
  )
}

export default StyleGuideTypography
