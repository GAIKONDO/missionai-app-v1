'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DetailsTabProps {
  methodOptions: string[];
  localMethod: string[];
  handleMethodToggle: (method: string) => void;
  localMethodOther: string;
  setLocalMethodOther: (other: string) => void;
  meansOptions: string[];
  localMeans: string[];
  handleMeansToggle: (means: string) => void;
  localMeansOther: string;
  setLocalMeansOther: (other: string) => void;
  isEditing: boolean;
  editingContent: string;
  setEditingContent: (content: string) => void;
}

export default function DetailsTab({
  methodOptions,
  localMethod,
  handleMethodToggle,
  localMethodOther,
  setLocalMethodOther,
  meansOptions,
  localMeans,
  handleMeansToggle,
  localMeansOther,
  setLocalMeansOther,
  isEditing,
  editingContent,
  setEditingContent,
}: DetailsTabProps) {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
          手法
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {methodOptions.map((method) => (
            <label
              key={method}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: `1px solid ${localMethod.includes(method) ? 'var(--color-primary)' : '#D1D5DB'}`,
                borderRadius: '6px',
                backgroundColor: localMethod.includes(method) ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <input
                type="checkbox"
                checked={localMethod.includes(method)}
                onChange={() => handleMethodToggle(method)}
                style={{ marginRight: '8px' }}
              />
              {method}
            </label>
          ))}
        </div>
        {localMethod.includes('その他') && (
          <input
            type="text"
            value={localMethodOther}
            onChange={(e) => setLocalMethodOther(e.target.value)}
            placeholder="その他の手法を入力"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              marginTop: '8px',
            }}
          />
        )}
      </div>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
          手段
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {meansOptions.map((means) => (
            <label
              key={means}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                border: `1px solid ${localMeans.includes(means) ? 'var(--color-primary)' : '#D1D5DB'}`,
                borderRadius: '6px',
                backgroundColor: localMeans.includes(means) ? '#EFF6FF' : '#FFFFFF',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <input
                type="checkbox"
                checked={localMeans.includes(means)}
                onChange={() => handleMeansToggle(means)}
                style={{ marginRight: '8px' }}
              />
              {means}
            </label>
          ))}
        </div>
        {localMeans.includes('その他') && (
          <input
            type="text"
            value={localMeansOther}
            onChange={(e) => setLocalMeansOther(e.target.value)}
            placeholder="その他の手段を入力"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              marginTop: '8px',
            }}
          />
        )}
      </div>

      <div style={{ marginTop: '32px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          詳細コンテンツ
        </label>
        {isEditing ? (
          <div>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="詳細コンテンツをマークダウン形式で入力してください..."
              style={{
                width: '100%',
                minHeight: '500px',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
              💡 マークダウン形式で記述できます（例: **太字**, *斜体*, `コード`, # 見出し, - リストなど）
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              minHeight: '400px',
              border: '1px solid #E5E7EB',
            }}
          >
            {editingContent ? (
              <div
                className="markdown-content"
                style={{
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#374151',
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editingContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                詳細コンテンツがありません。編集ボタンから追加してください。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

