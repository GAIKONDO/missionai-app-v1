/**
 * CSVファイルから組織データをインポートするスクリプト
 * 
 * 使用方法（ブラウザコンソールから）:
 * 1. 組織データのインポート:
 *    window.importOrganizationsFromCSV()
 * 
 * 2. 特定のCSVファイルを指定:
 *    window.importOrganizationsFromCSV('/data/organizations.csv')
 * 
 * または、Tauriアプリ内のブラウザコンソールで実行:
 * - アプリを起動後、開発者ツールのコンソールで実行
 */

import { createOrg } from '../lib/orgApi';
import { callTauriCommand } from '../lib/localFirebase';

/**
 * CSVファイルを読み込んでパース
 */
async function readCSVFile(filePath: string): Promise<string[][]> {
  try {
    // 相対パスの場合、プロジェクトルートからのパスに変換
    let actualPath = filePath;
    if (!filePath.startsWith('/') && !filePath.match(/^[A-Z]:/)) {
      // 相対パスの場合、プロジェクトルートからのパスとして扱う
      // 実際のパス解決はTauri側で行う
      actualPath = filePath;
    }
    
    // Tauriコマンドでファイルを読み込む
    const result = await callTauriCommand('read_file', {
      filePath: actualPath,
    });
    
    if (!result || !result.success || !result.data) {
      const errorMsg = result?.error || 'ファイルの読み込みに失敗しました';
      throw new Error(errorMsg);
    }
    
    const text = result.data;
    const lines = text.split('\n').filter((line: string) => line.trim());
    
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
    
    return rows;
  } catch (error: any) {
    throw new Error(`CSVファイルの読み込みに失敗しました: ${error.message}`);
  }
}

/**
 * CSVファイルから組織データをインポート
 */
async function importOrganizationsFromCSV(csvPath?: string): Promise<void> {
  try {
    console.log('=== 組織データのインポートを開始します ===\n');
    
    // CSVファイルのパスを決定
    // プロジェクトルートからの相対パスを指定
    const filePath = csvPath || './data/organizations.csv';
    console.log(`📄 CSVファイル: ${filePath}\n`);
    
    // CSVファイルを読み込む
    const rows = await readCSVFile(filePath);
    
    if (rows.length < 2) {
      throw new Error('CSVファイルが空か、ヘッダー行がありません');
    }
    
    // ヘッダー行を取得（1行目が空の場合は2行目）
    let headerRowIndex = 0;
    if (rows[0].every(cell => !cell || cell.trim() === '')) {
      headerRowIndex = 1;
    }
    
    const headers = rows[headerRowIndex];
    const dataRows = rows.slice(headerRowIndex + 1);
    
    console.log(`📊 ヘッダー: ${headers.join(', ')}`);
    console.log(`📊 データ行数: ${dataRows.length}件\n`);
    
    // ヘッダーのインデックスを取得
    const idIndex = headers.findIndex(h => h === 'ID' || h === 'id');
    const parentIdIndex = headers.findIndex(h => h === '親組織ID' || h === 'parentId' || h === 'parent_id');
    const nameIndex = headers.findIndex(h => h === '組織名' || h === 'name');
    const titleIndex = headers.findIndex(h => h === 'タイトル' || h === 'title');
    const descriptionIndex = headers.findIndex(h => h === '説明' || h === 'description');
    const levelIndex = headers.findIndex(h => h === '階層レベル' || h === 'level');
    const levelNameIndex = headers.findIndex(h => h === '階層名称' || h === 'levelName' || h === 'level_name');
    const positionIndex = headers.findIndex(h => h === '表示順序' || h === 'position');
    
    if (idIndex === -1 || nameIndex === -1) {
      throw new Error('CSVファイルに必須の列（ID、組織名）が見つかりません');
    }
    
    // 親子関係を考慮して、親組織から順に作成する必要がある
    // まず、すべての組織データをマップに格納
    const orgMap = new Map<string, {
      id: string;
      parentId: string | null;
      name: string;
      title: string | null;
      description: string | null;
      level: number;
      levelName: string;
      position: number;
      rowIndex: number;
    }>();
    
    const orgIds: string[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    // データ行を解析
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      if (row.every(cell => !cell || cell.trim() === '')) {
        continue; // 空行をスキップ
      }
      
      const id = row[idIndex]?.trim() || '';
      const parentId = row[parentIdIndex]?.trim() || null;
      const name = row[nameIndex]?.trim() || '';
      const title = row[titleIndex]?.trim() || null;
      const description = row[descriptionIndex]?.trim() || null;
      const level = parseInt(row[levelIndex]?.trim() || '0', 10);
      const levelName = row[levelNameIndex]?.trim() || '部門';
      const position = parseInt(row[positionIndex]?.trim() || '0', 10);
      
      if (!id || !name) {
        console.warn(`⚠️ 行 ${i + 1}: IDまたは組織名が空のためスキップ`);
        errorCount++;
        continue;
      }
      
      orgMap.set(id, {
        id,
        parentId: parentId || null,
        name,
        title: title || null,
        description: description || null,
        level,
        levelName,
        position,
        rowIndex: i + 1,
      });
    }
    
    console.log(`📋 解析された組織数: ${orgMap.size}件\n`);
    
    // 親組織から順に作成（階層レベルでソート）
    const sortedOrgs = Array.from(orgMap.values()).sort((a, b) => {
      // 階層レベルでソート（小さい順）
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      // 同じ階層レベルなら表示順序でソート
      return a.position - b.position;
    });
    
    // バッチ処理で並列インポート（10件ずつ）
    const BATCH_SIZE = 10;
    
    for (let batchStart = 0; batchStart < sortedOrgs.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, sortedOrgs.length);
      const batch = sortedOrgs.slice(batchStart, batchEnd);
      
      // バッチ内を並列処理
      const results = await Promise.allSettled(
        batch.map(async (org) => {
          try {
            // 親組織IDが指定されている場合、親組織が既に作成されているか確認
            let actualParentId: string | null = org.parentId;
            
            if (actualParentId && orgMap.has(actualParentId)) {
              // 親組織がマップに存在する場合、そのIDを使用
              // ただし、親組織がまだ作成されていない可能性があるため、
              // この時点では親組織IDをそのまま使用
              // （実際の作成時には、親組織が存在しない場合はnullになる）
            } else if (actualParentId && !orgMap.has(actualParentId)) {
              // 親組織IDが指定されているが、マップに存在しない場合はnullにする
              console.warn(`⚠️ 行 ${org.rowIndex}: 親組織ID "${actualParentId}" が見つかりません。親組織なしで作成します。`);
              actualParentId = null;
            }
            
            const result = await createOrg(
              actualParentId,
              org.name,
              org.title,
              org.description,
              org.level,
              org.levelName,
              org.position
            );
            
            orgIds.push(result.id);
            console.log(`✅ 行 ${org.rowIndex}: 組織を作成しました: ${org.name} (ID: ${result.id})`);
            
            return { success: true, orgId: result.id };
          } catch (error: any) {
            console.error(`❌ 行 ${org.rowIndex}: 組織の作成に失敗しました (${org.name}):`, error);
            return { success: false, error: error.message };
          }
        })
      );
      
      // 結果を集計
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      // プログレスを表示
      const progress = Math.round(((batchEnd / sortedOrgs.length) * 100));
      console.log(`📊 進捗: ${batchEnd}/${sortedOrgs.length} (${progress}%)\n`);
    }
    
    console.log(`\n✅ 組織データのインポートが完了しました`);
    console.log(`成功: ${successCount}件`);
    console.log(`エラー: ${errorCount}件`);
    console.log(`合計: ${orgMap.size}件\n`);
    
    if (orgIds.length > 0) {
      console.log(`作成された組織ID（最初の10件）:`);
      orgIds.slice(0, 10).forEach((id, index) => {
        console.log(`  ${index + 1}. ${id}`);
      });
      if (orgIds.length > 10) {
        console.log(`  ... 他 ${orgIds.length - 10}件`);
      }
    }
  } catch (error: any) {
    console.error('❌ 組織データのインポートに失敗しました:', error);
    throw error;
  }
}

// ブラウザ環境で実行する場合、windowオブジェクトにエクスポート
if (typeof window !== 'undefined') {
  (window as any).importOrganizationsFromCSV = importOrganizationsFromCSV;
  
  console.log('✅ 組織データインポート関数が利用可能になりました:');
  console.log('  - window.importOrganizationsFromCSV()           # デフォルトのCSVファイルからインポート');
  console.log('  - window.importOrganizationsFromCSV("path/to/file.csv")  # 指定したCSVファイルからインポート');
}

// Node.js環境で実行する場合（将来の拡張用）
if (typeof process !== 'undefined' && process.argv) {
  const csvPath = process.argv[2];
  
  if (csvPath) {
    (async () => {
      try {
        await importOrganizationsFromCSV(csvPath);
      } catch (error: any) {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
      }
    })();
  } else {
    (async () => {
      try {
        await importOrganizationsFromCSV();
      } catch (error: any) {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
      }
    })();
  }
}

