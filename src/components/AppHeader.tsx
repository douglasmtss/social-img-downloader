import Link from "next/link";

export default function AppHeader() {
  return (
    <header className="flex items-center justify-between w-full px-6 py-4 bg-white dark:bg-zinc-900 shadow">
      <div className="text-2xl font-bold text-blue-700">Social img Downloader</div>
      <a
        href="https://github.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 hover:underline font-medium"
      >
        GitHub
      </a>
    </header>
  );
}
