import Link from "next/link";

import { Button } from "@/components/ui/button";

export function PaginationControls({
  basePath,
  olderCursor,
  newerCursor,
}: {
  basePath: string;
  olderCursor: string | null;
  newerCursor: string | null;
}) {
  if (!olderCursor && !newerCursor) return null;

  const hrefFor = (cursor: string, direction: "older" | "newer") =>
    `${basePath}?cursor=${encodeURIComponent(cursor)}&direction=${direction}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {newerCursor ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(newerCursor, "newer")}>Newer</Link>
          </Button>
        ) : null}
      </div>
      <div>
        {olderCursor ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(olderCursor, "older")}>Older</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
