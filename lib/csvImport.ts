/**
 * CSVインポート機能
 * 組織、メンバー、事業会社のCSVファイルを読み込んで、プレビューと編集を提供
 */

export type ImportDataType = 'organizations' | 'members' | 'companies';

export interface ImportPreviewRow {
  id: string;
  data: Record<string, any>;
  errors?: string[];
  warnings?: string[];
}

export interface ImportPreview {
  type: ImportDataType;
  headers: string[];
  rows: ImportPreviewRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
}

export interface MultiSectionImportPreview {
  sections: Array<{
    type: ImportDataType;
    title: string;
    preview: ImportPreview;
  }>;
}

/**
 * CSVファイルを読み込んでパース
 */
export function parseCSVFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // CSVをパース（カンマ区切り、ダブルクォート対応）
        const rows: string[][] = [];
        for (const line of lines) {
          const row: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                // エスケープされたダブルクォート
                current += '"';
                i++;
              } else {
                // クォートの開始/終了
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // フィールドの区切り
              row.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          
          // 最後のフィールドを追加
          row.push(current.trim());
          rows.push(row);
        }
        
        resolve(rows);
      } catch (error) {
        reject(new Error(`CSVファイルのパースに失敗しました: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * CSVファイルのタイプを判定
 */
export function detectCSVType(headers: string[]): ImportDataType | null {
  const headerStr = headers.join(',').toLowerCase();
  
  // 組織データの判定（組織名、親組織ID、階層レベルなど）
  if (headerStr.includes('組織名') || headerStr.includes('組織id') || headerStr.includes('親組織id') || 
      headerStr.includes('階層レベル') || headerStr.includes('階層名称')) {
    return 'organizations';
  }
  
  // メンバーデータの判定（名前、組織ID、役職など）
  if (headerStr.includes('名前') && (headerStr.includes('組織id') || headerStr.includes('組織id'))) {
    return 'members';
  }
  
  // 事業会社データの判定（会社名、コード、カテゴリなど）
  if (headerStr.includes('会社名') || headerStr.includes('コード') || headerStr.includes('カテゴリ') ||
      headerStr.includes('事業会社')) {
    return 'companies';
  }
  
  return null;
}

/**
 * 組織データのCSVをパースしてプレビュー用データに変換
 */
export function parseOrganizationsCSV(rows: string[][]): ImportPreview {
  if (rows.length === 0) {
    return {
      type: 'organizations',
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
    };
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) => {
    const data: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    
    headers.forEach((header, colIndex) => {
      const value = row[colIndex] || '';
      data[header] = value;
    });
    
    // バリデーション
    const id = data['ID'] || data['id'] || '';
    const name = data['組織名'] || data['name'] || '';
    
    if (!id) {
      errors.push('IDが必須です');
    }
    if (!name) {
      errors.push('組織名が必須です');
    }
    
    return {
      id: id || `row-${index}`,
      data,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  });
  
  const validRows = previewRows.filter(row => !row.errors || row.errors.length === 0).length;
  const errorRows = previewRows.length - validRows;
  
  return {
    type: 'organizations',
    headers,
    rows: previewRows,
    totalRows: previewRows.length,
    validRows,
    errorRows,
  };
}

/**
 * メンバーデータのCSVをパースしてプレビュー用データに変換
 */
export function parseMembersCSV(rows: string[][]): ImportPreview {
  if (rows.length === 0) {
    return {
      type: 'members',
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
    };
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) => {
    const data: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    
    headers.forEach((header, colIndex) => {
      const value = row[colIndex] || '';
      data[header] = value;
    });
    
    // バリデーション
    const id = data['ID'] || data['id'] || '';
    const name = data['メンバー名'] || data['名前'] || data['name'] || '';
    const orgId = data['組織ID'] || data['organizationId'] || data['組織id'] || '';
    
    if (!id) {
      errors.push('IDが必須です');
    }
    if (!name) {
      errors.push('メンバー名が必須です');
    }
    if (!orgId) {
      errors.push('組織IDが必須です');
    }
    
    return {
      id: id || `row-${index}`,
      data,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  });
  
  const validRows = previewRows.filter(row => !row.errors || row.errors.length === 0).length;
  const errorRows = previewRows.length - validRows;
  
  return {
    type: 'members',
    headers,
    rows: previewRows,
    totalRows: previewRows.length,
    validRows,
    errorRows,
  };
}

/**
 * 事業会社データのCSVをパースしてプレビュー用データに変換
 */
export function parseCompaniesCSV(rows: string[][]): ImportPreview {
  if (rows.length === 0) {
    return {
      type: 'companies',
      headers: [],
      rows: [],
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
    };
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  const previewRows: ImportPreviewRow[] = dataRows.map((row, index) => {
    const data: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    
    headers.forEach((header, colIndex) => {
      const value = row[colIndex] || '';
      data[header] = value;
    });
    
    // バリデーション
    const id = data['ID'] || data['id'] || '';
    const name = data['会社名'] || data['name'] || '';
    
    if (!id) {
      errors.push('IDが必須です');
    }
    if (!name) {
      errors.push('会社名が必須です');
    }
    
    return {
      id: id || `row-${index}`,
      data,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  });
  
  const validRows = previewRows.filter(row => !row.errors || row.errors.length === 0).length;
  const errorRows = previewRows.length - validRows;
  
  return {
    type: 'companies',
    headers,
    rows: previewRows,
    totalRows: previewRows.length,
    validRows,
    errorRows,
  };
}

/**
 * CSVファイルを読み込んでプレビュー用データに変換（複数セクション対応）
 */
export async function loadCSVPreview(file: File): Promise<ImportPreview | MultiSectionImportPreview> {
  const rows = await parseCSVFile(file);
  
  if (rows.length === 0) {
    throw new Error('CSVファイルが空です');
  }
  
  // セクションを検出（「===」で始まる行をセクションタイトルとして扱う）
  const sections: Array<{ title: string; startIndex: number; type?: ImportDataType }> = [];
  
  for (let i = 0; i < rows.length; i++) {
    const firstCell = rows[i][0] || '';
    if (firstCell.includes('===')) {
      const title = firstCell.replace(/===/g, '').trim();
      sections.push({ title, startIndex: i });
    }
  }
  
  // セクションが見つかった場合、複数セクションとして処理
  if (sections.length > 0) {
    const sectionPreviews: Array<{ type: ImportDataType; title: string; preview: ImportPreview }> = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const nextSectionStart = i + 1 < sections.length ? sections[i + 1].startIndex : rows.length;
      
      // セクション内のヘッダー行を探す（セクションタイトルの次の行）
      let headerRowIndex = section.startIndex + 1;
      while (headerRowIndex < nextSectionStart && (rows[headerRowIndex][0] || '').includes('===')) {
        headerRowIndex++;
      }
      
      if (headerRowIndex >= nextSectionStart) {
        continue; // ヘッダーが見つからない場合はスキップ
      }
      
      const headers = rows[headerRowIndex];
      const dataRows = rows.slice(headerRowIndex + 1, nextSectionStart);
      
      const detectedType = detectCSVType(headers);
      if (!detectedType) {
        continue; // タイプが判定できない場合はスキップ
      }
      
      let preview: ImportPreview;
      switch (detectedType) {
        case 'organizations':
          preview = parseOrganizationsCSV([headers, ...dataRows]);
          break;
        case 'members':
          preview = parseMembersCSV([headers, ...dataRows]);
          break;
        case 'companies':
          preview = parseCompaniesCSV([headers, ...dataRows]);
          break;
        default:
          continue;
      }
      
      sectionPreviews.push({
        type: detectedType,
        title: section.title,
        preview,
      });
    }
    
    if (sectionPreviews.length > 0) {
      return { sections: sectionPreviews };
    }
  }
  
  // セクションが見つからない場合、単一セクションとして処理
  let headerRowIndex = 0;
  for (let i = 0; i < rows.length; i++) {
    const firstCell = rows[i][0] || '';
    if (firstCell.includes('===') || firstCell.trim() === '') {
      headerRowIndex = i + 1;
    } else {
      break;
    }
  }
  
  if (headerRowIndex >= rows.length) {
    throw new Error('CSVファイルにヘッダーが見つかりません');
  }
  
  const headers = rows[headerRowIndex];
  const dataRows = rows.slice(headerRowIndex + 1);
  
  const detectedType = detectCSVType(headers);
  
  if (!detectedType) {
    throw new Error('CSVファイルのタイプを判定できませんでした。ヘッダーを確認してください。');
  }
  
  switch (detectedType) {
    case 'organizations':
      return parseOrganizationsCSV([headers, ...dataRows]);
    case 'members':
      return parseMembersCSV([headers, ...dataRows]);
    case 'companies':
      return parseCompaniesCSV([headers, ...dataRows]);
    default:
      throw new Error('不明なCSVタイプです');
  }
}

















