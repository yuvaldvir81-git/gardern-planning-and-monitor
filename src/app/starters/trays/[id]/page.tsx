import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTrayWithStarters } from "../actions";
import { TrayDetail } from "./tray-detail";

export default async function TrayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getTrayWithStarters(id);
  if (!result) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/starters"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to starters
      </Link>
      <TrayDetail tray={result.tray} starters={result.starters} />
    </div>
  );
}
