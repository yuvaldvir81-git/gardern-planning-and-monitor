"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const GardenMapLoader = dynamic(
  () => import("./garden-map").then((mod) => mod.GardenMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="w-full rounded-lg" style={{ height: "65vh" }} />
    ),
  }
);
