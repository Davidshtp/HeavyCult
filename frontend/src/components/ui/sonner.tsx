"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const TOAST_VARS = {
  "--normal-bg": "oklch(0.985 0.01 295)",
  "--normal-text": "oklch(0.25 0.09 295)",
  "--normal-border": "oklch(0.88 0.04 295 / 0.55)",
  "--success-bg": "oklch(0.97 0.03 295)",
  "--success-text": "oklch(0.3 0.13 295)",
  "--success-border": "oklch(0.84 0.07 295 / 0.6)",
  "--info-bg": "oklch(0.97 0.02 275)",
  "--info-text": "oklch(0.32 0.1 280)",
  "--info-border": "oklch(0.86 0.05 280 / 0.55)",
  "--warning-bg": "oklch(0.965 0.06 300)",
  "--warning-text": "oklch(0.35 0.13 305)",
  "--warning-border": "oklch(0.84 0.09 305 / 0.6)",
  "--error-bg": "oklch(0.96 0.04 320)",
  "--error-text": "oklch(0.42 0.19 320)",
  "--error-border": "oklch(0.82 0.1 320 / 0.6)",
} as React.CSSProperties

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={TOAST_VARS}
      {...props}
    />
  )
}

export { Toaster }