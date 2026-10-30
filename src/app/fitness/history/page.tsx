import { HistoryList } from "@/components/fitness/HistoryList";
import { loadHistory } from "@/lib/fitness/history";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const { sessions, nextCursor } = await loadHistory({});

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <h1 className="text-3xl font-bold">History</h1>
        <HistoryList initialSessions={sessions} initialCursor={nextCursor} />
      </div>
    </main>
  );
}
