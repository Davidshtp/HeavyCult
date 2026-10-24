import { Suspense } from "react";
import { ConversacionesPanel } from "@/components/dashboard/conversaciones/conversaciones-panel";

export default function ConversacionesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100svh-6.8rem)] min-h-[40rem] flex-col gap-3">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-white/5" />
          <div className="flex-1 animate-pulse rounded-2xl border border-white/10 bg-white/[0.015]" />
        </div>
      }
    >
      <div className="flex min-h-0 flex-none flex-col overflow-hidden">
        <ConversacionesPanel />
      </div>
    </Suspense>
  );
}
