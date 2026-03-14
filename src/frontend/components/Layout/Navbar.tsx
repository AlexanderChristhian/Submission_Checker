import Link from "next/link";
import DarkModeButton from "@/components/UI/DarkModeButton";

const navLinks = [
  { href: "/routes/HomePage", label: "Dashboard" },
  { href: "/routes/Submissions", label: "Submissions" },
  { href: "/routes/Reports", label: "Reports" },
  { href: "/routes/Settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/routes/HomePage"
          className="text-xl font-bold text-zinc-900 dark:text-white"
        >
          DigiChecker
        </Link>

        {/* Nav Links */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          <DarkModeButton />
          <button className="text-sm px-4 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
