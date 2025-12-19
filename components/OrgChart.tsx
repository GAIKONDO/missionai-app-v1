'use client';

import { useMemo, useCallback, useRef } from 'react';
import { convertOrgToPlantUML } from '@/lib/orgToPlantUML';
import PlantUMLDiagram from '@/components/pages/component-test/test-concept/PlantUMLDiagram';
import type { OrgNodeData } from './OrgChart';

// メンバー情報の詳細型定義
export interface MemberInfo {
  name: string;
  title?: string; // 役職（position）
  nameRomaji?: string; // ローマ字名
  department?: string; // 部署
  extension?: string; // 内線番号
  companyPhone?: string; // 会社電話番号
  mobilePhone?: string; // 携帯電話番号
  email?: string; // メールアドレス
  itochuEmail?: string; // 伊藤忠メールアドレス
  teams?: string; // Teams
  employeeType?: string; // 社員区分
  roleName?: string; // 役割名
  indicator?: string; // インディケータ
  location?: string; // 勤務地
  floorDoorNo?: string; // フロア／ドアNo.
  previousName?: string; // 旧姓
}

// 組織データの型定義（再エクスポート）
export interface OrgNodeData {
  id?: string;
  name: string;
  title: string;
  logoUrl?: string;
  description?: string;
  color?: string;
  children?: OrgNodeData[];
  members?: MemberInfo[];
  [key: string]: any;
}

export interface OrgChartProps {
  data: OrgNodeData;
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSpacing?: number;
  levelSpacing?: number;
  onNodeClick?: (node: OrgNodeData, event: MouseEvent) => void;
  nodeColor?: (node: OrgNodeData, depth: number) => string;
  showLogo?: boolean;
  logoSize?: number;
  selectedNodeId?: string | null; // 選択されたノードのID
}

export default function OrgChart({
  data,
  onNodeClick,
  selectedNodeId,
}: OrgChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = useMemo(() => `org-chart-${data.id || data.name}-${Date.now()}`, [data.id, data.name]);

  // 組織データをPlantUML構文に変換
  const plantUMLCode = useMemo(() => {
    const code = convertOrgToPlantUML(data);
    // デバッグ用：生成されたPlantUMLコードをコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [OrgChart] 生成されたPlantUMLコード:', code);
    }
    return code;
  }, [data]);

  // 組織名からIDへのマッピングを作成（SVGレンダリング後にrect要素にIDを保存するために使用）
  const orgNameToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    
    const traverse = (node: OrgNodeData) => {
      if (node.id && node.name) {
        // 完全な名前でマッピング
        map.set(node.name, node.id);
        // 省略された名前でもマッピング（長い名前の場合）
        if (node.name.length > 30) {
          const shortName = `${node.name.substring(0, 27)}...`;
          map.set(shortName, node.id);
        }
      }
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };
    
    traverse(data);
    return map;
  }, [data]);

  // 組織IDから組織データを取得する関数（再帰関数なので通常の関数として定義）
  const findOrgById = (node: OrgNodeData, id: string): OrgNodeData | null => {
    // IDで完全一致
    if (node.id === id) {
      return node;
    }
    // 省略されたIDの場合（...で終わる）
    if (id.endsWith('...')) {
      const prefix = id.substring(0, id.length - 3);
      if (node.id && node.id.startsWith(prefix)) {
        return node;
      }
    }
    // 部分一致（IDの一部が一致する場合）
    if (node.id && (node.id.includes(id) || id.includes(node.id))) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = findOrgById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  // PlantUMLDiagramのノードクリックハンドラー
  const handlePlantUMLNodeClick = useCallback((nodeId: string, event: MouseEvent) => {
    if (!onNodeClick) return;
    
    // ノードIDから組織データを取得
    const foundOrg = findOrgById(data, nodeId);
    if (foundOrg) {
      console.log('🔗 [OrgChart] PlantUMLDiagramからノードクリック:', { id: nodeId, foundOrg });
      onNodeClick(foundOrg, event);
    } else {
      console.warn('⚠️ [OrgChart] 組織が見つかりませんでした:', nodeId);
    }
  }, [data, onNodeClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
        backgroundColor: '#F8FAFC',
        overflow: 'auto',
      }}
    >
      {/* PlantUML図を表示 */}
      <div style={{
        flex: 1,
        width: '100%',
        minHeight: '400px',
        padding: '20px',
      }}>
        <PlantUMLDiagram
          diagramCode={plantUMLCode}
          diagramId={diagramId}
          format="svg"
          onNodeClick={handlePlantUMLNodeClick}
          selectedNodeId={selectedNodeId}
          orgNameToIdMap={orgNameToIdMap}
        />
      </div>
    </div>
  );
}
