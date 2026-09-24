import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-base text-foreground shadow-none transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground placeholder:text-white/30 focus-visible:border-brand-400/60 focus-visible:ring-[3px] focus-visible:ring-brand-500/25 dark:aria-invalid:border-brand-400/70 dark:aria-invalid:ring-brand-500/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }