import { redirect } from "next/navigation";
import { fetchBlobJson } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PapersPage() {
  const latest = await fetchBlobJson<{ date: string }>("papers/latest.json");

  if (!latest) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16 bg-(--color-background)">
        <p className="text-(--color-text-tertiary)">No papers yet.</p>
      </main>
    );
  }

  redirect(`/papers/${latest.date}`);
}
