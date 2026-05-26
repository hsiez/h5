import { redirect } from "next/navigation";
import { fetchLatestDate } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PapersPage() {
  const date = await fetchLatestDate();

  if (!date) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16 bg-(--color-background)">
        <p className="text-(--color-text-tertiary)">No papers yet.</p>
      </main>
    );
  }

  redirect(`/papers/${date}`);
}
