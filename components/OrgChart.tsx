'use client';

import { useCallback, useState, useEffect } from 'react';

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

// 組織データの型定義
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
}

// プロ仕様のカラーパレット（企業向けデザイン - 95点仕様）
const PROFESSIONAL_COLORS = {
  division: '#0F172A',      // より深いダークグレー（Division）
  divisionGradient: 'linear-gradient(180deg, #0F172A 0%, #1E293B 40%, #334155 70%, #F8FAFC 100%)', // より滑らかな4段階グラデーション（急な変化を緩和）
  department: '#1E40AF',    // Webプロダクトブルー（Department）- 営業資料ブルーから変更
  departmentHover: '#1E3A8A', // Hover時の色（少し深く）
  section: '#34D399',       // 上品な緑フレーム（Section）- 発光感を消した統一色
  sectionHover: '#10B981',  // Hover時の緑（少し明るく）
  sectionBgHover: '#ECFDF5', // Hover時の背景色（薄いグリーン）
  default: '#1F2937',       // デフォルト
};

export default function OrgChart({
  data,
  onNodeClick,
}: OrgChartProps) {
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
    (nodeData: OrgNodeData, event: React.MouseEvent) => {
      if (onNodeClick) {
        onNodeClick(nodeData, event as unknown as MouseEvent);
      }
      setSelectedNodeId(nodeData.id || nodeData.name);
    },
    [onNodeClick]
  );

  // 組織構造を階層ごとに整理
  const departments = data.children || [];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
      backgroundColor: '#F8FAFC', // グラデーション終点に合わせる
    }}>
      {/* Sticky Header（Division）- グラデーション適用（ヘッダーからコンテンツへ自然に連結） */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        minHeight: isMobile ? '80px' : '96px',
        background: PROFESSIONAL_COLORS.divisionGradient,
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        padding: isMobile ? '12px 20px' : '16px 80px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isMobile ? '8px' : '24px',
          width: '100%',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: isMobile ? '1' : '0 0 auto',
          }}>
            <div style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: '600',
              marginBottom: '4px',
              letterSpacing: '-0.01em',
            }}>
              {data.name}
            </div>
            {data.title && (
              <div style={{
                fontSize: isMobile ? '12px' : '14px',
                opacity: 0.9,
                fontWeight: '400',
              }}>
                {data.title}
              </div>
            )}
          </div>
          
          {/* 部門長、部門長代行、部門長補佐を表示 */}
          {data.members && data.members.length > 0 && (
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: isMobile ? '4px' : '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              fontSize: isMobile ? '11px' : '13px',
              opacity: 0.95,
            }}>
              {data.members
                .filter((member: MemberInfo) => 
                  member.title === '部門長' || 
                  member.title === '部門長代行' || 
                  member.title === '部門長補佐'
                )
                .sort((a: MemberInfo, b: MemberInfo) => {
                  const order: { [key: string]: number } = {
                    '部門長': 1,
                    '部門長代行': 2,
                    '部門長補佐': 3,
                  };
                  return (order[a.title || ''] || 99) - (order[b.title || ''] || 99);
                })
                .map((member: MemberInfo, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{member.name}</span>
                    <span style={{ opacity: 0.85 }}>{member.title}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* 横スクロール可能なコンテンツエリア - グラデーション連結（ヘッダーから自然に続く） */}
      <div style={{
        flex: 1,
        overflowX: isMobile ? 'hidden' : 'auto',
        overflowY: isMobile ? 'auto' : 'hidden',
        padding: isMobile ? '20px' : isTablet ? '40px' : '80px',
        paddingTop: isMobile ? '20px' : isTablet ? '40px' : '80px',
        WebkitOverflowScrolling: 'touch',
        background: '#F8FAFC', // グラデーションはヘッダーで完結、コンテンツは統一背景
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '24px' : isTablet ? '40px' : '80px',
          alignItems: 'flex-start',
          minWidth: isMobile ? '100%' : 'fit-content',
        }}>
          {departments.map((department, index) => (
            <DepartmentColumn
              key={department.id || department.name || index}
              department={department}
              index={index}
              onNodeClick={handleNodeClick}
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNodeId}
              onHover={setHoveredNodeId}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Department Column Component
interface DepartmentColumnProps {
  department: OrgNodeData;
  index: number;
  onNodeClick: (node: OrgNodeData, event: React.MouseEvent) => void;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  onHover: (id: string | null) => void;
  isMobile: boolean;
  isTablet: boolean;
}

function DepartmentColumn({
  department,
  index,
  onNodeClick,
  hoveredNodeId,
  selectedNodeId,
  onHover,
  isMobile,
  isTablet,
}: DepartmentColumnProps) {
  const sections = department.children || [];
  const isHovered = hoveredNodeId === (department.id || department.name);
  const isSelected = selectedNodeId === (department.id || department.name);

  return (
    <div style={{
      width: isMobile ? '100%' : isTablet ? '280px' : '320px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px', // 24px → 32pxに変更（高級感アップ）
      flexShrink: 0,
    }}>
      {/* Department Card - 95点仕様（上品なSaaSブルー） */}
      <div
        style={{
          backgroundColor: isHovered ? PROFESSIONAL_COLORS.departmentHover : PROFESSIONAL_COLORS.department, // #1E40AF（上品なブルー）
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: isHovered || isSelected
            ? '0 20px 48px rgba(0,0,0,0.25)' // Hover時の影をさらに強化
            : '0 18px 36px rgba(0, 0, 0, 0.18)', // 部（上位）: 強い影で階層を完全に分離
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          border: isSelected ? '2px solid #ffffff' : 'none',
        }}
        onClick={(e) => onNodeClick(department, e)}
        onMouseEnter={() => onHover(department.id || department.name)}
        onMouseLeave={() => onHover(null)}
      >
        <div style={{
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '4px',
          letterSpacing: '-0.01em',
        }}>
          {department.name}
        </div>
        {department.title && (
          <div style={{
            color: '#ffffff',
            fontSize: '13px', // 12px → 13pxに変更
            opacity: 0.65, // 0.85 → 0.65に調整
            marginBottom: '8px',
          }}>
            {department.title}
          </div>
        )}
        {department.description && (
          <div style={{
            color: '#ffffff',
            fontSize: '11px',
            opacity: 0.75,
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
          }}>
            {department.description}
          </div>
        )}
      </div>

      {/* Section Cards */}
      {sections.map((section, sectionIndex) => (
        <SectionCard
          key={section.id || section.name || sectionIndex}
          section={section}
          parentId={department.id || department.name}
          onNodeClick={onNodeClick}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={selectedNodeId}
          onHover={onHover}
        />
      ))}
    </div>
  );
}

// Section Card Component
interface SectionCardProps {
  section: OrgNodeData;
  parentId: string;
  onNodeClick: (node: OrgNodeData, event: React.MouseEvent) => void;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  onHover: (id: string | null) => void;
}

function SectionCard({
  section,
  parentId,
  onNodeClick,
  hoveredNodeId,
  selectedNodeId,
  onHover,
}: SectionCardProps) {
  const isHovered = hoveredNodeId === (section.id || section.name);
  const isSelected = selectedNodeId === (section.id || section.name);
  const isParentHovered = hoveredNodeId === parentId;

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF', // 常に白背景（全課統一、上品に）
        border: `1.5px solid ${isHovered ? PROFESSIONAL_COLORS.sectionHover : PROFESSIONAL_COLORS.section}`, // 緑フレーム（発光感なし）
        borderRadius: '14px',
        padding: '16px 20px',
        boxShadow: isHovered || isSelected
          ? '0 8px 24px rgba(5, 150, 105, 0.12)' // Hover時の影を控えめに
          : '0 6px 16px rgba(15, 23, 42, 0.08)', // 課（下位）: 控えめな影で階層を完全に分離
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        position: 'relative',
        opacity: isParentHovered || isHovered || isSelected ? 1 : 0.95,
      }}
      onClick={(e) => onNodeClick(section, e)}
      onMouseEnter={() => onHover(section.id || section.name)}
      onMouseLeave={() => onHover(null)}
    >
      {/* 接続線は削除（パターンA：カードの近接で階層を伝える） */}

      <div style={{
        color: '#1F2937',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '4px',
        letterSpacing: '-0.01em',
      }}>
        {section.name}
      </div>
      {section.title && (
        <div style={{
          color: '#6B7280',
          fontSize: '13px', // 11px → 13pxに変更
          opacity: 0.65, // 0.8 → 0.65に調整
          marginBottom: '8px',
        }}>
          {section.title}
        </div>
      )}
      {section.description && (
        <div style={{
          color: '#6B7280',
          fontSize: '10px',
          opacity: 0.7,
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #E5E7EB',
        }}>
          {section.description}
        </div>
      )}
    </div>
  );
}
