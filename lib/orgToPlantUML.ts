/**
 * 組織データをPlantUML構文に変換する関数
 */

import type { OrgNodeData } from '@/components/OrgChart';

/**
 * 階層の深さに応じた背景色を返す
 * 親（depthが浅い）ほど濃い色、子（depthが深い）ほど薄い色になる
 * グレー・青系統の色を使用
 */
function getColorByDepth(depth: number): string {
  const colors = [
    '#1976D2', // ルート（depth=0）: 濃い青（最も濃い）
    '#E8F4FD', // 第1階層（depth=1）: 少し薄い青
    '#EDF6FD', // 第2階層（depth=2）: さらに薄い青
    '#F2F8FD', // 第3階層（depth=3）: さらに薄い青
    '#F7FAFD', // 第4階層（depth=4）: 非常に薄い青
    '#FAFBFC', // 第5階層以降（depth>=5）: ほぼ白の薄いグレー
  ];
  
  // depthが5以上の場合は、最後の色を使用
  return colors[Math.min(depth, colors.length - 1)];
}

/**
 * 組織データをPlantUMLのWBS（Work Breakdown Structure）構文に変換
 * 左から右に階層が深くなる樹形図を生成
 * +記号を使って階層を表現し、親ノードから1本の線が出て分岐する形式
 */
export function convertOrgToPlantUML(orgData: OrgNodeData): string {
  const lines: string[] = [];
  
  // WBS構文の開始
  lines.push('@startwbs');
  lines.push('');
  // スタイル定義（ルートノード用の白テキストスタイル）
  lines.push('<style>');
  lines.push('wbsDiagram {');
  lines.push('  .rootNode {');
  lines.push('    FontColor white');
  lines.push('  }');
  lines.push('}');
  lines.push('</style>');
  lines.push('');
  // スタイリング設定（背景色を白に設定）
  lines.push('skinparam backgroundColor white');
  lines.push('skinparam defaultFontName "Noto Sans JP"');
  lines.push('skinparam defaultFontSize 13');
  lines.push('skinparam defaultFontColor black');
  lines.push('skinparam wbsArrowColor #999999');
  lines.push('skinparam wbsArrowThickness 1');
  lines.push('skinparam wbsFontColor black');
  lines.push('skinparam wbsFontSize 13');
  lines.push('skinparam wbsFontStyle normal');
  lines.push('skinparam wbsBackgroundColor white');
  lines.push('skinparam wbsBorderColor #CCCCCC');
  lines.push('skinparam wbsBorderThickness 1');
  lines.push('skinparam shadowing false');
  lines.push('');

  // 再帰的に組織を処理（+記号で階層を表現）
  const processNode = (node: OrgNodeData, depth: number = 0) => {
    // 階層の深さに応じて+記号を追加（depth=0の場合は+、depth=1の場合は++）
    const prefix = '+'.repeat(depth + 1);
    // 表示名（組織名のみを表示、IDは非表示）
    // ノードの大きさは組織名の文字数で調整される
    let displayName = node.name || '組織名なし';
    // 長すぎる場合は省略
    if (displayName.length > 30) {
      displayName = `${displayName.substring(0, 27)}...`;
    }
    // PlantUMLの特殊文字をエスケープ
    displayName = displayName.replace(/[<>{}|]/g, '');
    
    // typeに応じた背景色を取得
    const orgType = (node as any).type || 'organization';
    let backgroundColor: string;
    if (orgType === 'company') {
      // 事業会社は薄い緑色（Finderの背景色を参考）
      backgroundColor = '#D1FAE5';
    } else if (orgType === 'person') {
      // 個人は薄い紫色（Finderの背景色を参考）
      backgroundColor = '#C4B5FD';
    } else {
      // 組織は階層に応じた色
      backgroundColor = getColorByDepth(depth);
    }
    
    // ノード定義（typeに応じた背景色を指定: +[#色]の形式）
    lines.push(`${prefix}[${backgroundColor}] ${displayName}`);

    // 子組織を処理
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        processNode(child, depth + 1);
      }
    }
  };

  // ルート組織を処理
  if (orgData.id === 'virtual-root' && orgData.children) {
    // 仮想的なルートの場合は、ルートノードを作成してから子組織を処理
    // WBS構文ではルートノードが1つ必要
    const rootDisplayName = orgData.name || '全組織';
    // 特殊文字をエスケープ
    const safeRootName = rootDisplayName.replace(/[<>{}|]/g, '');
    // ルートノードの背景色（depth=0、濃い青）
    const rootColor = getColorByDepth(0);
    // ルートノードに白テキストスタイルを適用
    lines.push(`+[${rootColor}] ${safeRootName} <<rootNode>>`);
    // 子組織を処理（depth=1から開始）
    for (const child of orgData.children) {
      processNode(child, 1);
    }
  } else {
    // 通常のルート組織の場合、ルートノードを特別に処理
    const rootDisplayName = orgData.name || '組織名なし';
    const safeRootName = rootDisplayName.replace(/[<>{}|]/g, '');
    // ルートノードのtypeに応じた色を取得
    const rootOrgType = (orgData as any).type || 'organization';
    let rootColor: string;
    if (rootOrgType === 'company') {
      // 事業会社は薄い緑色（Finderの背景色を参考）
      rootColor = '#D1FAE5';
    } else if (rootOrgType === 'person') {
      // 個人は薄い紫色（Finderの背景色を参考）
      rootColor = '#DDD6FE';
    } else {
      // 組織は階層に応じた色
      rootColor = getColorByDepth(0);
    }
    lines.push(`+[${rootColor}] ${safeRootName} <<rootNode>>`);
    // 子組織を処理（depth=1から開始）
    if (orgData.children && orgData.children.length > 0) {
      for (const child of orgData.children) {
        processNode(child, 1);
      }
    }
  }

  lines.push('');
  lines.push('@endwbs');

  return lines.join('\n');
}

/**
 * 組織名から組織データを取得するためのマッピングを生成
 * （PlantUMLのSVGから組織名を取得して、元の組織データを見つけるために使用）
 */
export function createOrgNameMap(orgData: OrgNodeData): Map<string, OrgNodeData> {
  const nameMap = new Map<string, OrgNodeData>();

  const traverse = (node: OrgNodeData) => {
    // 完全な名前でマッピング
    nameMap.set(node.name, node);
    
    // 省略された名前でもマッピング（長い名前の場合）
    if (node.name.length > 30) {
      const shortName = `${node.name.substring(0, 27)}...`;
      nameMap.set(shortName, node);
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  };

  if (orgData.id === 'virtual-root' && orgData.children) {
    for (const child of orgData.children) {
      traverse(child);
    }
  } else {
    traverse(orgData);
  }

  return nameMap;
}
