"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const TOAST_VARS = {
  "--normal-bg": "oklch(0.985 0.005 295)",
  "--normal-border": "oklch(0.7 0.08 295 / 0.4)",
  "--normal-text": "oklch(0.38 0.04 295)",
  "--success-bg": "oklch(0.972 0.02 160)",
  "--success-border": "oklch(0.7 0.12 160 / 0.4)",
  "--success-text": "oklch(0.48 0.12 160)",
  "--info-bg": "oklch(0.972 0.02 295)",
  "--info-border": "oklch(0.68 0.12 295 / 0.42)",
  "--info-text": "oklch(0.5 0.15 295)",
  "--warning-bg": "oklch(0.972 0.02 90)",
  "--warning-border": "oklch(0.74 0.11 90 / 0.45)",
  "--warning-text": "oklch(0.52 0.12 70)",
  "--error-bg": "oklch(0.955 0.02 355)",
  "--error-border": "oklch(0.66 0.12 355 / 0.4)",
  "--error-text": "oklch(0.52 0.18 355)",
  "--border-radius": "1.1rem",
} as React.CSSProperties

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={TOAST_VARS}
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:!items-start",
          title: "group-[.toaster]:!text-[14px] group-[.toaster]:!font-semibold group-[.toaster]:!tracking-tight",
          description: "group-[.toaster]:!text-[13px] group-[.toaster]:!opacity-80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }