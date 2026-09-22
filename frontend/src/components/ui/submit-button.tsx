"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUBMIT_CLASS =
  "btn-shine relative h-11 w-full bg-linear-to-r from-brand-600 to-violet-600 hover:from-brand-600 hover:to-violet-600 hover:opacity-90 active:scale-[0.98] hover:shadow-[0_0_28px_rgba(139,92,246,0.45)]";

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
      className={`${SUBMIT_CLASS}${className ? ` ${className}` : ""}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && loadingLabel ? (
        <>
          <Loader2 className="animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export { SubmitButton }