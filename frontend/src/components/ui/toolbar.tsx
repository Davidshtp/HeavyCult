"use client"

import { Toolbar as ToolbarPrimitive } from "@base-ui/react/toolbar"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

/**
 * Barra de herramientas del editor de descripción. `Toolbar.Button` trae el
 * roving tabindex de Base UI (flechas/Tab dentro de la barra), así que los
 * botones van con ese primitivo y no con el Button común.
 */

function Toolbar({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Root>) {
  return (
    <ToolbarPrimitive.Root
      data-slot="toolbar"
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] p-1",
        className,
      )}
      {...props}
    />
  )
}

function ToolbarGroup({ className, ...props }: React.ComponentProps<typeof ToolbarPrimitive.Group>) {
  return (
    <ToolbarPrimitive.Group
      data-slot="toolbar-group"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  )
}

function ToolbarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Separator>) {
  return (
    <ToolbarPrimitive.Separator
      data-slot="toolbar-separator"
      className={cn("mx-1 self-stretch bg-white/10", className)}
      {...props}
    />
  )
}

function ToolbarButton({
  className,
  ...props
}: React.ComponentProps<typeof ToolbarPrimitive.Button>) {
  return (
    <ToolbarPrimitive.Button
      data-slot="toolbar-button"
      // aria-pressed marca el formato activo: accesible y estilable a la vez.
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "data-[active]:bg-brand-500/15 data-[active]:text-brand-300 aria-pressed:bg-brand-500/15 aria-pressed:text-brand-300",
        className,
      )}
      {...props}
    />
  )
}

export { Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarButton }
