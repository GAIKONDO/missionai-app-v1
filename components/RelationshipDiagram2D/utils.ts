import type { RelationshipNode } from './types';

// テキストを折り返す関数
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  nodeType?: 'theme' | 'organization' | 'initiative' | 'topic' | 'company'
): string[] {
  // ノードタイプごとの最大文字数設定
  const maxCharsByType: Record<string, number> = {
    'theme': 10,        // テーマノード: 10文字
    'organization': 8,  // 組織ノード: 8文字
    'initiative': 8,    // 注力施策ノード: 8文字
  };
  
  // 文字幅ベースの最大文字数
  const charWidth = fontSize * 0.6; // 日本語文字の幅（フォントサイズの60%）
  const maxCharsByWidth = Math.floor((maxWidth * 0.85) / charWidth); // 85%の幅を使用（余白を確保）
  
  // ノードタイプに基づく最大文字数と幅ベースの最大文字数の小さい方を採用
  const maxCharsPerLine = nodeType && maxCharsByType[nodeType] 
    ? Math.min(maxCharsByType[nodeType], maxCharsByWidth)
    : maxCharsByWidth;
  
  if (text.length <= maxCharsPerLine) {
    return [text];
  }
  
  const lines: string[] = [];
  let currentLine = '';
  
  // 文字列を文字単位で処理
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    
    // 現在の行の文字数が最大文字数を超える場合
    if (testLine.length > maxCharsPerLine) {
      // 適切な分割点を探す（スペース、句読点、特定の文字の前）
      let splitPoint = currentLine.length;
      const searchStart = Math.max(0, currentLine.length - 8); // 検索範囲を広げる
      
      // 優先順位1: 句読点、スペース
      for (let j = currentLine.length - 1; j >= searchStart; j--) {
        const c = currentLine[j];
        if (c === ' ' || c === '、' || c === '。' || c === '・' || c === '，' || c === '．') {
          splitPoint = j + 1;
          break;
        }
      }
      
      // 優先順位2: 組織関連の文字（分割点が見つかっていない場合）
      if (splitPoint === currentLine.length) {
        for (let j = currentLine.length - 1; j >= searchStart; j--) {
          const c = currentLine[j];
          if (c === '部' || c === '課' || c === '社' || c === '室' || c === 'グループ' || c === 'チーム') {
            splitPoint = j + 1;
            break;
          }
          // 2文字のキーワードをチェック
          if (j < currentLine.length - 1) {
            const twoChar = currentLine.substring(j, j + 2);
            if (twoChar === 'ビジネス' || twoChar === '協業' || twoChar === '部門' || twoChar === '事業') {
              splitPoint = j + 2;
              break;
            }
          }
        }
      }
      
      // 優先順位3: その他の分割候補（分割点が見つかっていない場合）
      if (splitPoint === currentLine.length) {
        for (let j = currentLine.length - 1; j >= searchStart; j--) {
          const c = currentLine[j];
          if (c === 'の' || c === 'と' || c === 'や' || c === '・') {
            splitPoint = j + 1;
            break;
          }
        }
      }
      
      // 分割点が見つかった場合
      if (splitPoint > 0 && splitPoint < currentLine.length) {
        lines.push(currentLine.substring(0, splitPoint));
        currentLine = currentLine.substring(splitPoint) + char;
      } else {
        // 分割点が見つからない場合、強制的に分割（最大文字数で）
        lines.push(currentLine);
        currentLine = char;
      }
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines.length > 0 ? lines : [text];
}

// ノードタイプ別のサイズ設定（シミュレーション用は固定、メリハリをつける）
export function getNodeRadius(node: RelationshipNode): number {
  // 親ノード（情報・通信部門）は最大サイズ
  if (node.data?.isParent) return Math.max(node.label.length * 5, 100); // 親：100px
  if (node.type === 'theme') return Math.max(node.label.length * 3.5, 60); // 大：60px（75px→60px）
  if (node.type === 'organization') return Math.max(node.label.length * 3, 45); // 中：45px
  if (node.type === 'initiative') return 28; // 注力施策は固定サイズ：28px
  if (node.type === 'topic') return 20; // 個別トピックは固定サイズ：20px
  return 40;
}

// ノードタイプ別の衝突半径（固定、ホバー時も変わらない）
export function getCollisionRadius(node: RelationshipNode): number {
  // 親ノード（情報・通信部門）は最大サイズ
  if (node.data?.isParent) return 105; // 親：105px
  if (node.type === 'theme') return 65; // 大：65px（80px→65px）
  if (node.type === 'organization') return 50; // 中：50px
  if (node.type === 'initiative') return 30; // 小：30px
  if (node.type === 'topic') return 24; // 最小：24px
  return 40;
}

// 日付が期間内かチェックするヘルパー関数
export function isDateInRange(
  dateStr: string | null | undefined,
  startDate: string,
  endDate: string
): boolean {
  // topicDateがnullまたはundefinedの場合は全期間に反映（常にtrue）
  if (dateStr === null || dateStr === undefined || dateStr === '') {
    return true;
  }
  
  // 期間フィルターが設定されていない場合は全期間に反映
  if (!startDate && !endDate) {
    return true;
  }
  
  try {
    const topicDate = new Date(dateStr);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // 開始日のみ設定されている場合
    if (start && !end) {
      return topicDate >= start;
    }
    
    // 終了日のみ設定されている場合
    if (!start && end) {
      return topicDate <= end;
    }
    
    // 両方設定されている場合
    if (start && end) {
      return topicDate >= start && topicDate <= end;
    }
    
    return true;
  } catch (error) {
    console.warn('日付のパースエラー:', dateStr, error);
    return true; // エラー時は表示
  }
}

