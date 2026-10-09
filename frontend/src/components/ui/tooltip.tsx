"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "cn"

/**
 * Tooltip de barra de herramientas: etiqueta + atajo de teclado.
 *
 * `trigger` recibe el elemento que dispara (el botón): Base UI lo compone con
 * `render` en vez de envolverlo en otro `<button>`, así el botón conserva sus
 * props y su foco.
 */
function Tooltip({
  label,
  atajo,
  trigger,
  className,
}: {
  label: string
  atajo?: string
  trigger: React.ReactElement
  className?: string
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={500} render={trigger} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side="bottom" sideOffset={6}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 flex items-center gap-2 rounded-md border border-white/10 bg-black/90 px-2 py-1",
              "font-mono text-[0.7rem] whitespace-nowrap text-white/85 shadow-xl",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:duration-100",
              className,
            )}
          >
            <span>{label}</span>
            {atajo ? (
              <kbd className="rounded border border-white/15 bg-white/5 px-1 py-px text-[0.62rem] text-white/50">
                {atajo}
              </kbd>
            ) : null}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip }
