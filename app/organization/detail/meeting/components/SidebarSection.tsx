'use client';

import type { MonthContent, MonthTab, TabType } from '../types';
import type { Topic } from '@/types/topicMetadata';

interface SidebarSectionProps {
  currentTabData: MonthContent | undefined;
  activeSection: string;
  currentSummaryId: string | undefined;
  expandedNavItems: Set<string>;
  activeTab: TabType;
  meetingId: string;
  isAddingItem: boolean;
  onSetActiveSection: (section: string) => void;
  onSetExpandedNavItems: (expanded: Set<string>) => void;
  onAddItem: (tab: MonthTab, e: React.MouseEvent) => void;
}

export default function SidebarSection({
  currentTabData,
  activeSection,
  currentSummaryId,
  expandedNavItems,
  activeTab,
  meetingId,
  isAddingItem,
  onSetActiveSection,
  onSetExpandedNavItems,
  onAddItem,
}: SidebarSectionProps) {
  return (
    <aside style={{
      position: 'sticky',
      top: '20px',
      flexBasis: '300px',
      flexShrink: 0,
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      backgroundColor: '#FFFFFF',
      padding: '28px 24px',
      borderRadius: '14px',
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
      border: '1px solid #E5E7EB',
    }}>
      {currentTabData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h4 style={{
              margin: 0,
              fontSize: '1.15em',
              color: '#1E293B',
              borderBottom: '3px solid #0066CC',
              paddingBottom: '12px',
              flex: 1,
              fontWeight: '600',
              letterSpacing: '0.3px',
            }}>
              ナビゲーション
            </h4>
            <button
              onClick={(e) => onAddItem(activeTab as MonthTab, e)}
              type="button"
              disabled={isAddingItem}
              style={{
                padding: '8px 14px',
                background: isAddingItem 
                  ? 'linear-gradient(135deg, #64748B 0%, #475569 50%, #334155 100%)'
                  : 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: isAddingItem ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                marginLeft: '12px',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.2)',
                transition: 'all 0.2s ease',
                opacity: isAddingItem ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(15, 23, 42, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #1E293B 0%, #334155 50%, #475569 100%)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(15, 23, 42, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="新しい議事録を追加"
            >
              + 追加
            </button>
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
            <li>
                <a
                  href={`#${currentSummaryId || 'summary'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentSummaryId) {
                      onSetActiveSection(currentSummaryId);
                    }
                  }}
                  style={{
                    display: 'block',
                    padding: '12px 16px 12px 32px',
                    textDecoration: 'none',
                    color: activeSection === currentSummaryId ? '#FFFFFF' : '#475569',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    fontWeight: activeSection === currentSummaryId ? '600' : '500',
                    marginBottom: '6px',
                    backgroundColor: activeSection === currentSummaryId ? '#0066CC' : 'transparent',
                    fontSize: '14px',
                    letterSpacing: '0.2px',
                  }}
                  onMouseEnter={(e) => {
                    if (activeSection !== currentSummaryId) {
                      e.currentTarget.style.backgroundColor = '#EFF6FF';
                      e.currentTarget.style.color = '#0066CC';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSection !== currentSummaryId) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#475569';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  サマリ
                </a>
            </li>
            {currentTabData.items?.map((item) => (
              <li key={item.id}>
                <div>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSetActiveSection(item.id);
                      // トピックの展開/折りたたみを切り替え
                      if (item.topics && item.topics.length > 0) {
                        const newExpanded = new Set(expandedNavItems);
                        if (newExpanded.has(item.id)) {
                          newExpanded.delete(item.id);
                        } else {
                          newExpanded.add(item.id);
                        }
                        onSetExpandedNavItems(newExpanded);
                      }
                    }}
                    style={{
                      position: 'relative',
                      display: 'block',
                      padding: '12px 16px 12px 32px',
                      textDecoration: 'none',
                      color: activeSection === item.id ? '#FFFFFF' : '#475569',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      fontWeight: activeSection === item.id ? '600' : '500',
                      marginBottom: '6px',
                      backgroundColor: activeSection === item.id ? '#0066CC' : 'transparent',
                      fontSize: '14px',
                      letterSpacing: '0.2px',
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection !== item.id) {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.color = '#0066CC';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection !== item.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#475569';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    {item.topics && item.topics.length > 0 && (
                      <span style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: `translateY(-50%) ${expandedNavItems.has(item.id) ? 'rotate(90deg)' : 'rotate(0deg)'}`,
                        fontSize: '12px',
                        transition: 'transform 0.2s ease',
                        display: 'inline-block',
                      }}>
                        ▶
                      </span>
                    )}
                    {item.title}
                  </a>
                  {/* 個別トピックリンク */}
                  {item.topics && item.topics.length > 0 && expandedNavItems.has(item.id) && (
                    <ul style={{ listStyleType: 'none', padding: 0, margin: '4px 0 0 0', paddingLeft: '24px' }}>
                      {item.topics.map((topic) => {
                        const topicId = `${item.id}-topic-${topic.id}`;
                        return (
                          <li key={topic.id}>
                            <a
                              href={`#${topicId}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onSetActiveSection(item.id);
                                setTimeout(() => {
                                  const topicElement = document.getElementById(topicId);
                                  if (topicElement) {
                                    topicElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    topicElement.style.backgroundColor = '#fff9e6';
                                    setTimeout(() => {
                                      topicElement.style.backgroundColor = '';
                                    }, 2000);
                                  }
                                }, 100);
                              }}
                              style={{
                                display: 'block',
                                padding: '8px 12px',
                                textDecoration: 'none',
                                color: '#666',
                                fontSize: '0.95em',
                                borderRadius: '4px',
                                marginBottom: '2px',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#F3F4F6';
                                e.currentTarget.style.color = '#0066CC';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#666';
                              }}
                            >
                              └ {topic.title}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

