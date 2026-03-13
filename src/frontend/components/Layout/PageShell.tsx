interface PageShellProps {
  children: React.ReactNode;
}

export default function PageShell({ children }: PageShellProps) {
  return (
    <main className="flex flex-1 flex-col gap-8 px-8 py-12 bg-white dark:bg-zinc-950">
      {children}
    </main>
  );
}
