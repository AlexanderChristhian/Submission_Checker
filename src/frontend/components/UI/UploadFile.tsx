export default function UploadFile() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-10 text-center">
      <p className="font-bold text-zinc-900 dark:text-zinc-100 text-3xl mb-6">
        Upload File
      </p>

      {/* The Label acts as the visual button */}
      <label 
        htmlFor="file-upload" 
        className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
      >
        Choose File
      </label>

      {/* The actual input is hidden */}
      <input
        id="file-upload"
        type="file"
        className="hidden"
      />

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        No file selected
      </p>
    </div>
  );
}