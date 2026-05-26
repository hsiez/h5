const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const insetPill =
  "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm font-medium tabular-nums text-(--color-text-tertiary) shadow-[inset_0_2px_4px_rgba(20,20,20,0.07),inset_0_1px_1px_rgba(20,20,20,0.04),0_1px_0_rgba(255,255,255,0.9)]" as const;

export function InlineDate({
  date,
  className,
}: {
  date: string;
  className?: string;
}) {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const spoken = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <time
      dateTime={date}
      aria-label={spoken}
      className={`inline-flex items-center gap-0.5 ${className ?? ""}`}
    >
      <span className={insetPill} style={{ backgroundColor: "rgba(20,20,20,0.04)" }}>
        {MONTHS[month - 1]}
      </span>
      <span className="text-sm" style={{ color: "rgba(20,20,20,0.2)" }}>/</span>
      <span className={insetPill} style={{ backgroundColor: "rgba(20,20,20,0.04)" }}>
        {String(day).padStart(2, "0")}
      </span>
      <span className="text-sm" style={{ color: "rgba(20,20,20,0.2)" }}>/</span>
      <span className={insetPill} style={{ backgroundColor: "rgba(20,20,20,0.04)" }}>
        {year}
      </span>
    </time>
  );
}
