"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * La app es oscura (`html.dark`), así que los toasts se pintan con superficies
 * oscuras y texto claro. Los colores claros de fábrica se oscurecían con
 * `color-mix(... black 45%)` en globals.css y dejaban texto casi negro sobre un
 * fondo marrón sucio: se leía mal y parecía que no salía nada.
 */
const TOAST_VARS = {
  "--normal-bg": "oklch(0.21 0.02 295)",
  "--normal-text": "oklch(0.93 0.01 295)",
  "--normal-border": "oklch(0.38 0.03 295 / 0.9)",
  "--success-bg": "oklch(0.23 0.06 155)",
  "--success-text": "oklch(0.9 0.11 155)",
  "--success-border": "oklch(0.4 0.09 155 / 0.8)",
  "--info-bg": "oklch(0.23 0.05 240)",
  "--info-text": "oklch(0.88 0.07 240)",
  "--info-border": "oklch(0.4 0.07 240 / 0.8)",
  "--warning-bg": "oklch(0.25 0.07 300)",
  "--warning-text": "oklch(0.88 0.11 305)",
  "--warning-border": "oklch(0.42 0.1 305 / 0.8)",
  "--error-bg": "oklch(0.25 0.08 25)",
  "--error-text": "oklch(0.87 0.13 25)",
  "--error-border": "oklch(0.42 0.11 25 / 0.8)",
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