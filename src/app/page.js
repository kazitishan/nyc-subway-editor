export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">NYC Subway Editor</h1>
        <p className="mt-3 text-base text-neutral-500 dark:text-neutral-400">
          Start from the current subway map or upload your own file.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            className="flex-1 rounded-lg bg-foreground px-5 py-3 font-medium text-background transition-opacity hover:opacity-85"
          >
            Use Current Subway Map
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-neutral-300 px-5 py-3 font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Upload File
          </button>
        </div>
      </div>
    </main>
  );
}
