'use client';

import type { KnowledgeGraphSearchResult } from '@/lib/knowledgeGraphRAG';
import SearchResultItem from './SearchResultItem';

interface SearchResultsListProps {
  results: KnowledgeGraphSearchResult[];
  selectedResult: KnowledgeGraphSearchResult | null;
  onSelectResult: (result: KnowledgeGraphSearchResult) => void;
  onFeedback: (resultId: string, resultType: 'entity' | 'relation' | 'topic', relevant: boolean) => void;
  feedbackRatings: Record<string, boolean>;
  entityTypeLabels: Record<string, string>;
  relationTypeLabels: Record<string, string>;
}

export default function SearchResultsList({
  results,
  selectedResult,
  onSelectResult,
  onFeedback,
  feedbackRatings,
  entityTypeLabels,
  relationTypeLabels,
}: SearchResultsListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {results.map((result, index) => (
        <SearchResultItem
          key={`${result.type}-${result.id}-${index}`}
          result={result}
          index={index}
          isSelected={selectedResult?.id === result.id}
          onSelect={onSelectResult}
          onFeedback={onFeedback}
          feedbackRating={feedbackRatings[result.id]}
          entityTypeLabels={entityTypeLabels}
          relationTypeLabels={relationTypeLabels}
          searchResults={results}
        />
      ))}
    </div>
  );
}

