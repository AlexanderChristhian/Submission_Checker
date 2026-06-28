"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/UI/PageHeader";
import PageShell from "@/components/Layout/PageShell";

interface GradingRule {
  id: number;
  name: string;
  content: string;
  courseId: number | null;
  course: { id: number; code: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: number;
  code: string;
  name: string;
}

function simpleMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 class='text-sm font-semibold mt-3 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-base font-semibold mt-4 mb-1'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-lg font-bold mt-4 mb-2'>$1</h1>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/`([^`]+)`/g, "<code class='bg-zinc-200 dark:bg-zinc-700 px-1 rounded text-xs'>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p class='mb-2'>")
    .replace(/\n/g, "<br/>");
  return `<p class='mb-2'>${html}</p>`;
}

export default function AdminPage() {
  const [rules, setRules] = useState<GradingRule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCourseId, setEditCourseId] = useState<number | "">("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/grading-rules");
      const data = await res.json();
      setRules(data.data ?? []);
    } catch {
      setError("Failed to load grading rules");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/courses`);
      const data = await res.json();
      setCourses(data.data ?? []);
    } catch {
      // courses non-critical
    }
  }, []);

  useEffect(() => { fetchRules(); fetchCourses(); }, [fetchRules, fetchCourses]);

  function startCreate() {
    setEditingId(null);
    setEditName("");
    setEditContent("");
    setEditCourseId("");
    setEditIsActive(true);
    setShowPreview(false);
  }

  function startEdit(rule: GradingRule) {
    setEditingId(rule.id);
    setEditName(rule.name);
    setEditContent(rule.content);
    setEditCourseId(rule.courseId ?? "");
    setEditIsActive(rule.isActive);
    setShowPreview(false);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave() {
    if (!editName.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: editName.trim(),
        content: editContent.trim(),
        courseId: editCourseId === "" ? null : Number(editCourseId),
        isActive: editIsActive,
      };
      const res = editingId === null
        ? await fetch("/api/grading-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch(`/api/grading-rules/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Save failed");
      setEditingId(null);
      await fetchRules();
    } catch {
      setError("Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this grading rule?")) return;
    try {
      await fetch(`/api/grading-rules/${id}`, { method: "DELETE" });
      await fetchRules();
    } catch {
      setError("Failed to delete rule");
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Grading Rules"
        description="Manage rules that guide the LLM when grading submissions."
      />

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Editor */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId === null ? "New Rule" : "Edit Rule"}
            </h2>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {showPreview ? "Edit" : "Preview"}
              </button>
            </div>
          </div>

          <div className="mb-3 flex gap-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Rule name (e.g. CPU Microarchitecture Rubric)"
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            />
            <select
              value={editCourseId}
              onChange={(e) => setEditCourseId(e.target.value === "" ? "" : Number(e.target.value))}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            >
              <option value="">Global (all courses)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>

          {showPreview ? (
            <div
              className="min-h-[300px] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-sm text-zinc-800 dark:text-zinc-200 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: simpleMarkdown(editContent) }}
            />
          ) : (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={18}
              placeholder="Write your grading rules in markdown...&#10;&#10;## Deductions&#10;- Points off for missing sections&#10;- Points off for incorrect logic&#10;&#10;## Requirements&#10;1. Must include X&#10;2. Must handle Y"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim() || !editContent.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId === null ? "Create Rule" : "Update Rule"}
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Rule List */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Rules</h2>
            <button
              onClick={startCreate}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            >
              + New
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-zinc-500">No rules yet.</p>
          ) : (
            <ul className="space-y-2">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className={`rounded-lg border p-3 text-sm ${
                    editingId === rule.id
                      ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {rule.name}
                        {!rule.isActive && (
                          <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-700">inactive</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {rule.course ? `${rule.course.code} — ${rule.course.name}` : "Global"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(rule)}
                        className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
