import DataTable from "@/components/UI/DataTable";
import StatusBadge from "@/components/UI/StatusBadge";
import GradeBadge from "@/components/UI/GradeBadge";

export interface Submission {
  id: string;
  name: string;
  date: string;
  status: string;
  fileUrl: string;
  grades: string;
}

interface SubmissionsTableProps {
  title: string;
  submissions: Submission[];
}

export default function SubmissionsTable({ title, submissions }: SubmissionsTableProps) {
  if (submissions.length === 0) {
    return (
      <DataTable title={title}>
        No submissions yet.
      </DataTable>
    );
  }

  return (
    <DataTable title={title}>
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            <th className="pb-3 font-medium">ID</th>
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Grades</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {submissions.map((sub) => (
            <tr key={sub.id} className="text-zinc-700 dark:text-zinc-300">
              <td className="py-3 font-mono text-xs">{sub.id}</td>
              <td className="py-3">
                <a href={sub.fileUrl} className="text-blue-500 hover:text-blue-700" target="_blank" rel="noopener noreferrer">
                    {sub.name}
                </a>
              </td>
              <td className="py-3 text-zinc-500 dark:text-zinc-400">{sub.date}</td>
              <td className="py-3">
                <StatusBadge status={sub.status} />
              </td>
              <td className="py-3">
                <GradeBadge grade={sub.grades} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}
