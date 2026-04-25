import PageHeader from "@/components/UI/PageHeader";
import PageShell from "@/components/Layout/PageShell";
import DarkModeButton from "@/components/UI/DarkModeButton";

interface SettingsGroup {
  title: string;
  description: string;
  value: string;
}

const settingsGroups: SettingsGroup[] = [
  {
    title: "Default Review SLA",
    description: "Time target before a pending submission is highlighted.",
    value: "24 Hours",
  },
  {
    title: "Similarity Threshold",
    description: "Flag submissions once this percentage threshold is exceeded.",
    value: "65%",
  },
  {
    title: "Notification Channel",
    description: "Primary destination for plagiarism review alerts.",
    value: "Email + Dashboard",
  },
];

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Configure dashboard preferences and review behavior."
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Theme Preference
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Toggle between light and dark mode to review submissions in your preferred contrast.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <DarkModeButton />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Theme selection is saved for your current browser session.
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {settingsGroups.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {item.title}
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">
              {item.value}
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </article>
        ))}
      </section>
    </PageShell>
  );
}
