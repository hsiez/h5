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
    <div
      className={`flex items-center justify-center ${className ?? ""}`}
    >
      <div className="inline-flex flex-col items-center leading-none gap-1">
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
    </div>
  );
}
