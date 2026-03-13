interface DataTableProps {
  title: string;
  children: React.ReactNode;
}

export default function DataTable({ title, children }: DataTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          {title}
        </h2>
      </div>
      <div className="p-5 text-sm text-zinc-500 dark:text-zinc-400">
        {children}
      </div>
    </div>
  );
}
