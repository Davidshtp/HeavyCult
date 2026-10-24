import { Suspense } from "react";
import { WhatsappConfigPanel } from "@/components/dashboard/configuraciones/whatsapp-config-panel";

export default function WhatsappConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-white/5" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-40 animate-pulse rounded-2xl border border-white/10" />
            <div className="h-40 animate-pulse rounded-2xl border border-white/10" />
            <div className="h-40 animate-pulse rounded-2xl border border-white/10" />
          </div>
        </div>
      }
    >
      <WhatsappConfigPanel />
    </Suspense>
  );
}

