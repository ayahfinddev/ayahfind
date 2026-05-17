"use client";

import { cn } from "@/lib/utils";

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-panel animate-pulse overflow-hidden p-5", className)}>
      <div className="mb-3 h-4 w-24 rounded bg-neutral-200" />
      <div className="mb-4 h-10 w-full rounded bg-neutral-200" />
      <div className="h-4 w-3/4 rounded bg-neutral-100" />
    </div>
  );
}
