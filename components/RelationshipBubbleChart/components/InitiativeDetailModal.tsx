import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FocusInitiative } from '@/lib/orgApi';
import { markdownComponents } from '../utils/markdownComponents';

interface InitiativeDetailModalProps {
  initiative: FocusInitiative;
  onClose: () => void;
}

export default function InitiativeDetailModal({ initiative, onClose }: InitiativeDetailModalProps) {
  const router = useRouter();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(44, 62, 80, 0.4) 0%, rgba(30, 41, 59, 0.35) 100%)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            {initiative.title}
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                router.push(`/organization/initiative?organizationId=${initiative.organizationId}&initiativeId=${initiative.id}`);
              }}
              style={{
                background: 'transparent',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#374151',
                padding: '6px 12px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.borderColor = '#9CA3AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              詳細を見る
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#6B7280',
                padding: '4px 8px',
                lineHeight: 1,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1a1a1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              ×
            </button>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
          {/* 説明 */}
          {initiative.description ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                説明
              </div>
              <div className="markdown-content" style={{ 
                padding: '20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#374151',
                wordBreak: 'break-word',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {initiative.description}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600, marginBottom: '12px' }}>
                説明
              </div>
              <div style={{ 
                padding: '20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '15px',
                color: '#9CA3AF',
                fontStyle: 'italic',
                textAlign: 'center',
              }}>
                （説明なし）
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

