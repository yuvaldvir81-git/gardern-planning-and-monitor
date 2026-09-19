import Link from "next/link";
import { Sprout } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { getStartersForUser } from "./actions";
import { getTraysForUser } from "./trays/actions";
import { StartersTable } from "./starters-table";
import { TraysSection } from "./trays-section";

export default async function StartersPage() {
  const [starters, trays] = await Promise.all([getStartersForUser(), getTraysForUser()]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Garden Planning &amp; Monitoring
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/starters/seeds"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Sprout className="h-4 w-4" />
            Seed bank
          </Link>
          <UserButton />
        </div>
      </div>
      <TraysSection trays={trays} />
      <StartersTable starters={starters} />
    </div>
  );
}
