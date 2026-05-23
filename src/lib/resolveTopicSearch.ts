import { searchUnified } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";
import type { SearchTopic } from "@/lib/searchTopics";

/** Search by topic label; backend expands concepts via thematic layer. */
export async function resolveTopicSearch(topic: SearchTopic): Promise<SearchResponse> {
  const data = await searchUnified(topic.label, 10);
  if ((data.results?.length ?? 0) > 0) {
    return { ...data, query: topic.label, intent_hint: data.intent_hint ?? topic.label };
  }
  for (const q of topic.queries.slice(1)) {
    const fallback = await searchUnified(q, 10);
    if ((fallback.results?.length ?? 0) > 0) {
      return { ...fallback, query: topic.label, intent_hint: topic.label };
    }
  }
  return data;
}