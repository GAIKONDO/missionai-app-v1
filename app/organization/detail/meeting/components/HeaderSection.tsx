'use client';

import { useRouter } from 'next/navigation';
import { SaveIcon, DownloadIcon, BackIcon } from './Icons';

interface HeaderSectionProps {
  title: string;
  savingStatus: 'idle' | 'saving' | 'saved';
  downloadingJson: boolean;
  downloadingHtml: boolean;
  hasUnsavedChanges: boolean;
  organizationId: string;
  onSave: () => void;
  onDownloadJson: () => void;
  onDownloadHtml: () => void;
}

export default function HeaderSection({
  title,
  savingStatus,
  downloadingJson,
  downloadingHtml,
  hasUnsavedChanges,
  organizationId,
  onSave,
  onDownloadJson,
  onDownloadHtml,
}: HeaderSectionProps) {
  const router = useRouter();

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      padding: '24px 32px',
      marginBottom: '32px',
      borderBottom: '1px solid #E5E7EB',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '4px',
              height: '32px',
              backgroundColor: '#0066CC',
              borderRadius: '2px',
            }} />
            <h1 style={{ 
              margin: 0, 
              fontSize: '28px', 
              fontWeight: 600,
              color: '#1F2937',
              letterSpacing: '-0.01em',
              lineHeight: '1.3',
            }}>
              {title}
            </h1>
          </div>
          <p style={{ 
            margin: 0,
            marginLeft: '20px',
            fontSize: '14px', 
            color: '#6B7280',
            lineHeight: '1.5',
          }}>
            議事録アーカイブ
          </p>
        </div>
        
        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {savingStatus !== 'idle' && (
            <div style={{
              padding: '8px 12px',
              fontSize: '12px',
              color: savingStatus === 'saving' ? '#6B7280' : '#10B981',
              backgroundColor: savingStatus === 'saving' ? '#F3F4F6' : '#D1FAE5',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {savingStatus === 'saving' ? '💾 保存中...' : '✅ 保存完了'}
            </div>
          )}
          <button
            onClick={onSave}
            disabled={savingStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: savingStatus === 'saving' ? '#9CA3AF' : '#10B981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: savingStatus === 'saving' ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: savingStatus === 'saving' ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (savingStatus !== 'saving') {
                e.currentTarget.style.backgroundColor = '#10B981';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title="編集内容を保存します"
          >
            <SaveIcon size={18} color="white" />
          </button>
          <button
            onClick={onDownloadJson}
            disabled={downloadingJson}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: downloadingJson ? '#9CA3AF' : '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingJson ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: downloadingJson ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!downloadingJson) {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingJson) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={downloadingJson ? 'JSONファイルをダウンロード中...' : 'JSONファイルをダウンロード'}
          >
            {downloadingJson ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <DownloadIcon size={18} color="white" />
            )}
          </button>
          <button
            onClick={onDownloadHtml}
            disabled={downloadingHtml}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: downloadingHtml ? '#9CA3AF' : '#8B5CF6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: downloadingHtml ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: downloadingHtml ? 0.7 : 1,
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (!downloadingHtml) {
                e.currentTarget.style.backgroundColor = '#7C3AED';
                e.currentTarget.style.opacity = '1';
              }
            }}
            onMouseLeave={(e) => {
              if (!downloadingHtml) {
                e.currentTarget.style.backgroundColor = '#8B5CF6';
                e.currentTarget.style.opacity = '1';
              }
            }}
            title={downloadingHtml ? 'HTMLファイルをダウンロード中...' : 'HTMLファイルをダウンロード'}
          >
            {downloadingHtml ? (
              <div style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <DownloadIcon size={18} color="white" />
            )}
          </button>
          <button
            onClick={async () => {
              try {
                if (hasUnsavedChanges) {
                  const { tauriConfirm } = await import('@/lib/orgApi');
                  const confirmed = await tauriConfirm('保存されていない変更があります。このページを離れますか？', 'ページを離れる確認');
                  if (!confirmed) {
                    return;
                  }
                }
                router.push(`/organization/detail?id=${organizationId}&tab=meetingNotes`);
              } catch (error) {
                console.error('❌ [戻るボタン] エラーが発生しましたが、ページ遷移を続行します:', error);
                router.push(`/organization/detail?id=${organizationId}&tab=meetingNotes`);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#6B7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: 0.9,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280';
              e.currentTarget.style.opacity = '0.9';
            }}
            title="戻る"
          >
            <BackIcon size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}

