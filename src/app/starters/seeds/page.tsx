import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSeedTypesForUser } from "../seed-types/actions";
import { SeedBankTable } from "./seed-bank-table";

export default async function SeedBankPage() {
  const seedTypes = await getSeedTypesForUser();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Link
        href="/starters"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to starters
      </Link>
      <SeedBankTable seedTypes={seedTypes} />
    </div>
  );
}
