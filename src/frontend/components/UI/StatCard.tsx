interface StatCardProps {
  label: string;
  value: string | number;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
