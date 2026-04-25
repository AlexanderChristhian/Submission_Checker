type InsightTone = "neutral" | "success" | "warning";

interface SubmissionInsightCardProps {
  title: string;
  value: string;
  description: string;
  tone?: InsightTone;
}

const toneClasses: Record<InsightTone, string> = {
  neutral:
    "border-sky-200 bg-gradient-to-br from-sky-50 to-white text-sky-900 dark:border-sky-900/60 dark:from-sky-950/50 dark:to-zinc-950 dark:text-sky-100",
  success:
    "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-900 dark:border-emerald-900/60 dark:from-emerald-950/50 dark:to-zinc-950 dark:text-emerald-100",
  warning:
    "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-900 dark:border-amber-900/60 dark:from-amber-950/50 dark:to-zinc-950 dark:text-amber-100",
};

export default function SubmissionInsightCard({
  title,
  value,
  description,
  tone = "neutral",
}: SubmissionInsightCardProps) {
  return (
    <article className={`rounded-xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm opacity-80">{description}</p>
    </article>
  );
}
