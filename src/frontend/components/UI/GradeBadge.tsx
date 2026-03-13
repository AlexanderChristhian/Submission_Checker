function getGradeStyle(grade: number): string {
  if (grade >= 80) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (grade >= 60) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (grade >= 40) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
}

interface GradeBadgeProps {
  grade: string;
}

export default function GradeBadge({ grade }: GradeBadgeProps) {
  const numeric = Number(grade);
  const isNumeric = !isNaN(numeric);

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isNumeric
          ? getGradeStyle(numeric)
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {grade}
    </span>
  );
}
