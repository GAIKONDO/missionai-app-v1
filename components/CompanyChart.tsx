'use client';

import { useCallback, useState, useEffect } from 'react';
// import type { Company } from '@/lib/companiesApi'; // Companiesテーブル削除のためコメントアウト
type Company = any; // Companiesテーブル削除のため、一時的な型定義

export interface CompanyNodeData {
  id: string;
  name: string;
  title: string;
  children?: CompanyNodeData[];
  companies?: Company[];
  [key: string]: any;
}

export interface CompanyChartProps {
  data: CompanyNodeData;
  onNodeClick?: (node: CompanyNodeData, event: MouseEvent) => void;
}

// SaaS × 戦略UI向けカラーパレット（バブルチャートと一致）
const PROFESSIONAL_COLORS = {
  company: '#0F172A',      // 主管カンパニー（最外円）
  division: '#1E40AF',     // 主管部門（大きい青円）
  department: '#10B981',   // 主管部（中の緑円）
  businessCompany: '#F59E0B', // 事業会社（小さいオレンジ円）
  hover: '#3B82F6',
};

export default function CompanyChart({
  data,
  onNodeClick,
}: CompanyChartProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 767);
      setIsTablet(width > 767 && width <= 1199);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleNodeClick = useCallback(
    (nodeData: CompanyNodeData, event: React.MouseEvent) => {
      // イベントの伝播を防ぐ
      event.stopPropagation();
      if (onNodeClick) {
        onNodeClick(nodeData, event as unknown as MouseEvent);
      }
      setSelectedNodeId(nodeData.id || nodeData.name);
    },
    [onNodeClick]
  );

  // 階層構造を整理
  const renderNode = (node: CompanyNodeData, depth: number = 0): JSX.Element => {
    const isHovered = hoveredNodeId === (node.id || node.name);
    const isSelected = selectedNodeId === (node.id || node.name);
    
    // 深さに応じたスタイル
    let backgroundColor = PROFESSIONAL_COLORS.company;
    let textColor = '#FFFFFF';
    let borderColor = '#E5E7EB';
    
    // 最上位の統合会社は表示しないため、depth=0は主管部門として扱う
    if (depth === 0) {
      backgroundColor = PROFESSIONAL_COLORS.division; // 主管部門
    } else if (depth === 1) {
      backgroundColor = PROFESSIONAL_COLORS.department; // 主管部
    } else {
      backgroundColor = PROFESSIONAL_COLORS.businessCompany; // 事業会社
    }

    if (isHovered) {
      backgroundColor = PROFESSIONAL_COLORS.hover;
    }

    const nodeStyle: React.CSSProperties = {
      backgroundColor,
      color: textColor,
      border: `2px solid ${isSelected ? '#3B82F6' : borderColor}`,
      borderRadius: '12px',
      padding: isMobile ? '12px' : '16px',
      marginBottom: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: isSelected
        ? '0 4px 12px rgba(59, 130, 246, 0.3)'
        : isHovered
        ? '0 2px 8px rgba(0, 0, 0, 0.15)'
        : '0 1px 3px rgba(0, 0, 0, 0.1)',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      position: 'relative',
      zIndex: depth + 1, // 深さに応じてz-indexを設定（子要素が親要素の上に表示される）
    };

    return (
      <div
        key={node.id || node.name}
        style={nodeStyle}
        onClick={(e) => handleNodeClick(node, e)}
        onMouseEnter={() => setHoveredNodeId(node.id || node.name)}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        <div style={{ fontWeight: '600', fontSize: isMobile ? '14px' : '16px', marginBottom: '4px' }}>
          {node.name}
        </div>
        {node.title && (
          <div style={{ fontSize: isMobile ? '12px' : '13px', opacity: 0.9 }}>
            {node.title}
          </div>
        )}
        {node.companies && node.companies.length > 0 && (
          <div style={{ fontSize: isMobile ? '11px' : '12px', marginTop: '8px', opacity: 0.8 }}>
            {node.companies.length}社
          </div>
        )}
        {node.children && node.children.length > 0 && (
          <div 
            style={{ 
              marginTop: '12px', 
              paddingLeft: isMobile ? '8px' : '16px',
              position: 'relative',
              zIndex: depth + 2, // 子要素を親要素の上に表示
            }}
            onClick={(e) => e.stopPropagation()} // 子要素のクリックが親に伝播しないようにする
          >
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
        {node.companies && node.companies.length > 0 && depth >= 1 && (
          <div style={{ marginTop: '12px' }}>
            {node.companies.map((company) => (
              <div
                key={company.id}
                onClick={(e) => {
                  // イベントの伝播を防ぐ
                  e.stopPropagation();
                  // クリックされた会社だけを含むノードを作成
                  const companyNode: CompanyNodeData = {
                    id: `company-${company.id}`,
                    name: company.name,
                    title: '事業会社',
                    companies: [company],
                  };
                  handleNodeClick(companyNode, e);
                }}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  fontSize: isMobile ? '12px' : '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  {company.name}
                  {company.nameShort && (
                    <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                      ({company.nameShort})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: isMobile ? '11px' : '12px', opacity: 0.8 }}>
                  {company.code} | {company.category} | {company.region}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', padding: isMobile ? '16px' : '24px' }}>
      {/* 最上位の統合会社は表示せず、その子ノードを直接表示 */}
      {data.children && data.children.length > 0 ? (
        data.children.map((child) => renderNode(child, 0))
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          データがありません
        </div>
      )}
    </div>
  );
}
