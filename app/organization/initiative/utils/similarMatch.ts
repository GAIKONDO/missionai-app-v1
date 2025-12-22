/**
 * 類似検索用のヘルパー関数
 * 文字列の類似度を判定する
 */
export const isSimilarMatch = (query: string, text: string): boolean => {
  if (!query || !text) return false;
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // 完全一致または部分一致
  if (textLower.includes(queryLower)) return true;
  
  // 文字列の各文字が順序通りに含まれているかチェック（例: "yam" は "yamada" にマッチ）
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  if (queryIndex === queryLower.length) return true;
  
  // 文字列の類似度を簡易計算（入力文字列の50%以上の文字が含まれているか）
  const queryChars = queryLower.split('');
  const matchedChars = queryChars.filter(char => textLower.includes(char)).length;
  if (matchedChars / queryChars.length >= 0.5) return true;
  
  return false;
};

