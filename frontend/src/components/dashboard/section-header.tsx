export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-brand-500/30 bg-brand-500/10 font-mono text-[0.85rem] font-semibold text-brand-300">
          {"//"}
        </span>
        <div>
          <h2 className="font-heading text-base font-semibold tracking-wide text-foreground uppercase">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action}
    </header>
  );
}