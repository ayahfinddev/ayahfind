import { Suspense } from "react";
import { SearchExperience } from "@/components/home/SearchExperience";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <SearchExperience />
    </Suspense>
  );
}
