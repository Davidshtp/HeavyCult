"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const SUBMIT_CLASS =
  "relative h-12 w-full rounded-xl bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90 active:scale-[0.98]";

function SubmitButton({
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <Button
      type="submit"
      className={cn(
        SUBMIT_CLASS,
        !loading &&
          "btn-shine hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]",
        loading && "cursor-not-allowed",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="relative z-10 inline-flex min-w-[10rem] items-center justify-center gap-2">
          <Loader2
            className="pointer-events-none size-4 animate-spin"
            aria-hidden
          />
          <span className="whitespace-nowrap">
            {loadingLabel ?? "Procesando…"}
          </span>
        </span>
      ) : (
        <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
          {children}
        </span>
      )}
    </Button>
  );
}

export { SubmitButton }