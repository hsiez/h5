const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

function SpreadChars({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`flex w-full justify-between ${className ?? ""}`}>
      {[...text].map((char, i) => (
        <span key={i}>{char}</span>
      ))}
    </span>
  );
}

function formatSpoken(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DateStamp({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = String(date.getFullYear());

  return (
    <time
      dateTime={`${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
      aria-label={formatSpoken(date)}
      className={`flex items-center justify-center ${className ?? ""}`}
    >
      <div className="inline-flex flex-col items-center leading-none gap-1" aria-hidden="true">
        <SpreadChars
          text={month}
          className="text-sm text-(--color-text-tertiary)"
        />
        <span className="text-3xl font-medium tracking-tight text-(--color-text-primary)">
          {day}
        </span>
        <SpreadChars
          text={year}
          className="text-sm text-(--color-text-tertiary)"
        />
      </div>
    </time>
  );
}
