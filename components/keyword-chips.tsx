export function KeywordChips({
  keywords,
  variant = "muted",
  max,
}: {
  keywords: string[];
  variant?: "muted" | "card" | "detail";
  max?: number;
}) {
  if (keywords.length === 0) return null;

  const visible = max ? keywords.slice(0, max) : keywords;
  const hiddenCount = max ? keywords.length - visible.length : 0;

  const chipClass =
    variant === "detail"
      ? "rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm"
      : variant === "card"
        ? "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted-foreground"
        : "rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-muted-foreground";

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((kw) => (
        <span key={kw} className={chipClass}>
          {kw}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className={chipClass}>+{hiddenCount} more</span>
      ) : null}
    </div>
  );
}
