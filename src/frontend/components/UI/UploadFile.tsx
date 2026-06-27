"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type UploadStatus = "idle" | "reading" | "creating" | "indexing" | "done" | "error";

const TEXT_EXTENSIONS = [".txt", ".md"];

function isTextFile(name: string): boolean {
  return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function UploadFile() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ submissionId?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setResult(null);
    setStatus("idle");

    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^.]+$/, ""));
    }

    if (isTextFile(f.name)) {
      setStatus("reading");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setContent(text);
        setManualContent("");
        setStatus("idle");
      };
      reader.onerror = () => {
        setError("Failed to read file content.");
        setStatus("idle");
      };
      reader.readAsText(f);
    } else {
      setContent("");
      setManualContent("Unsupported file type. Please paste the text content below.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      handleFileChange({ target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  const finalContent =
    file && isTextFile(file.name) ? content : manualContent;

  async function handleSubmit() {
    if (!title.trim() || !finalContent.trim()) return;
    if (!session?.user?.id) {
      setError("You must be signed in to upload.");
      return;
    }

    setStatus("creating");
    setError(null);

    try {
      const createRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: finalContent,
          userId: session.user.id,
          fileName: file?.name ?? null,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || createData?.ok === false) {
        throw new Error(createData?.error ?? "Failed to create submission");
      }

      const submissionId = createData.data?.id ?? createData.data?.submissionId;
      if (!submissionId) throw new Error("No submission ID returned");

      setResult({ submissionId });
      setStatus("indexing");

      const indexRes = await fetch("/api/backend/rag/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          content: finalContent,
        }),
      });

      if (!indexRes.ok) {
        const indexData = await indexRes.json().catch(() => null);
        throw new Error(indexData?.error ?? "RAG indexing failed");
      }

      setStatus("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Upload Submission
      </h2>

      {/* Title */}
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Title *
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Lab Report - Physics 201"
        className="mb-4 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={status === "creating" || status === "indexing"}
      />

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-950/30"
      >
        {file ? (
          <>
            <FileText className="mb-2 h-8 w-8 text-blue-500" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {file.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Drop a file here or click to browse
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              Supports .txt / .md (auto-extract) and .pdf (paste content below)
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept=".txt,.md,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Content */}
      {file && !isTextFile(file.name) && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Content *
          </label>
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            rows={8}
            placeholder="Paste the text content of your document here..."
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={status === "creating" || status === "indexing"}
          />
        </div>
      )}

      {file && isTextFile(file.name) && content && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Content Preview
          </label>
          <textarea
            value={content}
            readOnly
            rows={8}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400"
          />
        </div>
      )}

      {/* Status / Error */}
      {status === "error" && error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status === "done" && result && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Submission created (ID: {result.submissionId}) and indexed in RAG.
          </span>
        </div>
      )}

      {/* Submit */}
      {sessionLoading ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-300 dark:bg-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading session...
        </div>
      ) : !session ? (
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-500">
          Sign in to upload
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={
            !title.trim() ||
            !finalContent.trim() ||
            status === "reading" ||
            status === "creating" ||
            status === "indexing" ||
            status === "done"
          }
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {(status === "creating" || status === "indexing") && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {status === "creating" && "Creating submission..."}
          {status === "indexing" && "Indexing in RAG..."}
          {status !== "creating" && status !== "indexing" && "Upload & Index"}
        </button>
      )}
    </div>
  );
}
