/**
 * ナレッジグラフRAG検索のユーティリティ関数
 */

/**
 * 出典情報をフォーマット
 */
export function formatSources(
  sources: Array<{
    type: 'entity' | 'relation' | 'topic';
    id: string;
    name: string;
    score: number;
  }>
): string {
  if (!sources || sources.length === 0) {
    return '';
  }

  const sourceParts: string[] = ['\n\n## 参考情報の出典\n'];
  
  // タイプごとにグループ化
  const byType = sources.reduce((acc, source) => {
    if (!acc[source.type]) {
      acc[source.type] = [];
    }
    acc[source.type].push(source);
    return acc;
  }, {} as Record<'entity' | 'relation' | 'topic', typeof sources>);

  // エンティティ
  if (byType.entity && byType.entity.length > 0) {
    sourceParts.push('### エンティティ\n');
    for (const source of byType.entity) {
      sourceParts.push(`- **${source.name}** (関連度: ${(source.score * 100).toFixed(1)}%)`);
    }
    sourceParts.push('');
  }

  // リレーション
  if (byType.relation && byType.relation.length > 0) {
    sourceParts.push('### リレーション\n');
    for (const source of byType.relation) {
      sourceParts.push(`- **${source.name}** (関連度: ${(source.score * 100).toFixed(1)}%)`);
    }
    sourceParts.push('');
  }

  // トピック
  if (byType.topic && byType.topic.length > 0) {
    sourceParts.push('### トピック\n');
    for (const source of byType.topic) {
      sourceParts.push(`- **${source.name}** (関連度: ${(source.score * 100).toFixed(1)}%)`);
    }
    sourceParts.push('');
  }

  return sourceParts.join('\n');
}

