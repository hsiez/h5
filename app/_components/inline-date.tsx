const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const fill = "#d1e0de";
const border = "1px solid rgba(20,20,20,0.08)";
const boxShadow = "0 1px 2px rgba(20,20,20,0.06), 0 1px 0 rgba(255,255,255,0.9)";

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
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium tabular-nums text-(--color-text-tertiary) ${className ?? ""}`}
      style={{ backgroundColor: fill, border, boxShadow }}
    >
      {MONTHS[month - 1]} {day}, {year}
    </time>
  );
}
