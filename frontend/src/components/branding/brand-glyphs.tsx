import type { ReactElement } from "react";

type GlyphProps = { className?: string };

function MetaGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#0866FF"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M5 13.5C3 11.5 3 8 5 6.2c2.2-2 5-1 6.4 1l4 5.6c1.2 1.7 3.2 2.6 5.2 2" />
      <path d="M19 10.5c2 2 2 5.5 0 7.3-2.2 2-5 1-6.4-1l-4-5.6c-1.2-1.7-3.2-2.6-5.2-2" />
    </svg>
  );
}

function TikTokGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#25F4EE"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.8 16.4V7.2l6.4-1.6v9" />
      <circle cx="8.4" cy="16.4" r="2.4" />
      <circle cx="14.8" cy="14.6" r="2.2" />
    </svg>
  );
}

function InstagramGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#E1306C"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.3" fill="#E1306C" stroke="none" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#25D366"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.6c4.7 0 8.4 3.7 8.4 8.2 0 4.5-3.7 8.2-8.4 8.2-1.3 0-2.5-.3-3.6-.8L4 20.4l1.3-4C4.9 15.2 4.6 14.2 4.6 13.1c0-4.5 3.4-6.9 7.4-9.5Z" />
    </svg>
  );
}

function DropiGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M5 4h9.4c3.2 0 5.6 2.4 5.6 5.6v.1c0 3.2-2.4 5.7-5.6 5.7H8V20H5V4Zm3 3v6.8h6.4c1.5 0 2.6-1.1 2.6-2.7v-.1c0-1.6-1.1-2.7-2.6-2.7l-6.4-.8V7Z"
        fill="#8B5CF6"
      />
    </svg>
  );
}

function ServientregaGlyph({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="#F7901E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h11v9H3z" />
      <path d="M14 9h3.5L21 12.5V15h-7z" />
      <circle cx="7" cy="16.8" r="1.8" />
      <circle cx="16.5" cy="16.8" r="1.8" />
    </svg>
  );
}

function InterRapidisimoGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#FACC15" aria-hidden>
      <path d="M13 2 4.5 13.5h5L9 22l8.5-11.5h-5L13 2Z" />
    </svg>
  );
}

function CoordinadoraGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#3B82F6" aria-hidden>
      <path d="M2 6h11v9H2V6Zm12 2.5h3.5L21 12v3h-7V8.5ZM6 16.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm9.5 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" />
    </svg>
  );
}

export type EcosystemNode = {
  label: string;
  desc: string;
  color: string;
  Glyph: (props: GlyphProps) => ReactElement;
};

export const ECOSYSTEM_NODES: EcosystemNode[] = [
  {
    label: "Meta Ads",
    desc: "Anuncios de tu catálogo en Facebook e Instagram",
    color: "#0866FF",
    Glyph: MetaGlyph,
  },
  {
    label: "TikTok",
    desc: "Campañas que conectan con tu público",
    color: "#25F4EE",
    Glyph: TikTokGlyph,
  },
  {
    label: "Instagram",
    desc: "Tu vitrina social sincronizada",
    color: "#E1306C",
    Glyph: InstagramGlyph,
  },
  {
    label: "WhatsApp Business",
    desc: "Chats y pedidos en un solo hilo",
    color: "#25D366",
    Glyph: WhatsAppGlyph,
  },
  {
    label: "Dropi",
    desc: "Logística que entrega por ti",
    color: "#8B5CF6",
    Glyph: DropiGlyph,
  },
  {
    label: "Servientrega",
    desc: "Cobertura de envío en todo Colombia",
    color: "#F7901E",
    Glyph: ServientregaGlyph,
  },
  {
    label: "Inter Rapidísimo",
    desc: "Envíos exprés sin complicaciones",
    color: "#FACC15",
    Glyph: InterRapidisimoGlyph,
  },
  {
    label: "Coordinadora",
    desc: "Gestión de guías y entregas",
    color: "#3B82F6",
    Glyph: CoordinadoraGlyph,
  },
];