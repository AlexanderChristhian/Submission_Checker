"use client";

import { useState } from "react";

export default function UploadFile() {
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-10 text-center">
      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-3xl mb-6">
        Upload File
      </p>

      <label
        htmlFor="file-upload"
        className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
      >
        Choose File
      </label>

      <input
        id="file-upload"
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        {fileName ? `Selected: ${fileName}` : "No file selected"}
      </p>
    </div>
  );
}
