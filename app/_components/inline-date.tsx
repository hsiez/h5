const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

const border = "1px solid #d1e0de";

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
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-medium tabular-nums ${className ?? ""}`}
      style={{ border, color: "#6e908a" }}
    >
      {MONTHS[month - 1]} {day}, {year}
    </time>
  );
}
