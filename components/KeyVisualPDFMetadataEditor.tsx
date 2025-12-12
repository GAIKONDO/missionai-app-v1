'use client';

import { useState, useEffect, useRef } from 'react';

interface KeyVisualPDFMetadata {
  title: string;
  signature: string;
  date: string;
  position: {
    x: number; // mm
    y: number; // mm
    align: 'left' | 'center' | 'right';
  };
  titleFontSize?: number; // pt
  signatureFontSize?: number; // pt
  dateFontSize?: number; // pt
}

interface KeyVisualPDFMetadataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (metadata: KeyVisualPDFMetadata) => void;
  initialMetadata?: KeyVisualPDFMetadata;
  pageWidth: number; // mm
  pageHeight: number; // mm
}

export default function KeyVisualPDFMetadataEditor({
  isOpen,
  onClose,
  onSave,
  initialMetadata,
  pageWidth,
  pageHeight,
}: KeyVisualPDFMetadataEditorProps) {
  const [title, setTitle] = useState('');
  const [signature, setSignature] = useState('');
  const [date, setDate] = useState('');
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('right');
  const [titleFontSize, setTitleFontSize] = useState<number>(6); // pt
  const [signatureFontSize, setSignatureFontSize] = useState<number>(6); // pt
  const [dateFontSize, setDateFontSize] = useState<number>(6); // pt
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialMetadata) {
        setTitle(initialMetadata.title);
        setSignature(initialMetadata.signature);
        setDate(initialMetadata.date);
        setPositionX(initialMetadata.position.x);
        setPositionY(initialMetadata.position.y);
        setAlign(initialMetadata.position.align);
        setTitleFontSize(initialMetadata.titleFontSize || 6);
        setSignatureFontSize(initialMetadata.signatureFontSize || 6);
        setDateFontSize(initialMetadata.dateFontSize || 6);
      } else {
        // デフォルト値：右下に右揃えで3列（16:9横長に合わせた位置）
        setTitle('');
        setSignature('');
        setDate(new Date().toLocaleDateString('ja-JP'));
        // 右下に配置（右端から10mm、下端から10mm）
        // pageWidth = 254mm, pageHeight = 143mm
        setPositionX(pageWidth - 10); // 244mm（右端から10mm内側）
        setPositionY(pageHeight - 10); // 133mm（下端から10mm上）
        setAlign('right');
        setTitleFontSize(14); // デフォルトを少し大きく（横長なので）
        setSignatureFontSize(6);
        setDateFontSize(6);
      }
    }
  }, [isOpen, initialMetadata, pageWidth, pageHeight]);

  const handleSave = () => {
    onSave({
      title,
      signature,
      date,
      position: {
        x: positionX,
        y: positionY,
        align,
      },
      titleFontSize,
      signatureFontSize,
      dateFontSize,
    });
    onClose();
  };

  if (!isOpen) return null;

  // プレビューのスタイルを計算（16:9の比率を維持）
  // プレビューエリアのサイズ（px単位）
  const previewHeight = 400; // 固定高さ
  const previewWidth = (pageWidth / pageHeight) * previewHeight; // アスペクト比を維持
  
  // mmからpxへの変換率（プレビューエリアのサイズに基づく）
  const mmToPxX = previewWidth / pageWidth;
  const mmToPxY = previewHeight / pageHeight;
  
  const previewStyle: React.CSSProperties = {
    position: 'relative',
    width: `${previewWidth}px`,
    height: `${previewHeight}px`,
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    margin: '20px auto',
  };

  // テキストの位置をmm単位からpx単位に正確に変換
  const textStyle: React.CSSProperties = {
    position: 'absolute',
    // X座標: mm単位のpositionXをpx単位に変換
    // 右揃えの場合は、右端からの距離を計算
    right: align === 'right' ? `${(pageWidth - positionX) * mmToPxX}px` : 'auto',
    // 左揃えの場合は、左端からの距離を計算
    left: align === 'left' ? `${positionX * mmToPxX}px` : align === 'center' ? '50%' : 'auto',
    // Y座標: mm単位のpositionYをpx単位に変換（下端からの距離）
    bottom: `${(pageHeight - positionY) * mmToPxY}px`,
    transform: align === 'center' ? 'translateX(-50%)' : 'none',
    textAlign: align,
    color: '#666',
    lineHeight: '1.5',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>
          キービジュアルPDFメタデータ編集
        </h2>

        {/* プレビュー */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 500 }}>プレビュー</h3>
          <div ref={previewRef} style={previewStyle}>
            {(title || signature || date) && (
              <div style={textStyle}>
                {title && (
                  <div style={{ 
                    fontSize: `${titleFontSize * (mmToPxY * 0.352778)}px`, // ptからpxへの変換（1pt = 0.352778mm）
                    marginBottom: `${titleFontSize * 0.7 * (mmToPxY * 0.352778)}px`
                  }}>
                    {title}
                  </div>
                )}
                {signature && (
                  <div style={{ 
                    fontSize: `${signatureFontSize * (mmToPxY * 0.352778)}px`,
                    marginBottom: `${signatureFontSize * 0.7 * (mmToPxY * 0.352778)}px`
                  }}>
                    {signature}
                  </div>
                )}
                {date && (
                  <div style={{ 
                    fontSize: `${dateFontSize * (mmToPxY * 0.352778)}px`
                  }}>
                    {date}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* フォーム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* テキスト入力セクション */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              テキスト内容
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  placeholder="タイトルを入力"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  署名
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  placeholder="署名を入力"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  作成日
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  placeholder="作成日を入力"
                />
              </div>
            </div>
          </div>

          {/* 位置設定セクション */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                位置設定
              </h3>
              <button
                onClick={() => {
                  // デフォルト値：右下に右揃え（右端から10mm、下端から10mm）
                  setPositionX(pageWidth - 10); // 244mm（右端から10mm内側）
                  setPositionY(pageHeight - 10); // 133mm（下端から10mm上）
                  setAlign('right');
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                デフォルト設定
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  X座標（mm）
                </label>
                <input
                  type="number"
                  value={positionX}
                  onChange={(e) => setPositionX(Number(e.target.value))}
                  min={0}
                  max={pageWidth}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                  Y座標（mm）
                </label>
                <input
                  type="number"
                  value={positionY}
                  onChange={(e) => setPositionY(Number(e.target.value))}
                  min={0}
                  max={pageHeight}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                配置
              </label>
              <select
                value={align}
                onChange={(e) => setAlign(e.target.value as 'left' | 'center' | 'right')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              >
                <option value="left">左揃え</option>
                <option value="center">中央揃え</option>
                <option value="right">右揃え</option>
              </select>
            </div>
          </div>

          {/* フォントサイズ設定セクション */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f9fafb', 
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              フォントサイズ設定
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    タイトル
                  </label>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
                    {titleFontSize}pt
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="range"
                    value={titleFontSize}
                    onChange={(e) => setTitleFontSize(Number(e.target.value))}
                    min={4}
                    max={20}
                    step={1}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e5e7eb',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="number"
                    value={titleFontSize}
                    onChange={(e) => setTitleFontSize(Number(e.target.value))}
                    min={4}
                    max={20}
                    step={1}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'center',
                      backgroundColor: '#fff',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    署名
                  </label>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
                    {signatureFontSize}pt
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="range"
                    value={signatureFontSize}
                    onChange={(e) => setSignatureFontSize(Number(e.target.value))}
                    min={4}
                    max={20}
                    step={1}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e5e7eb',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="number"
                    value={signatureFontSize}
                    onChange={(e) => setSignatureFontSize(Number(e.target.value))}
                    min={4}
                    max={20}
                    step={1}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'center',
                      backgroundColor: '#fff',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                    作成日
                  </label>
                  <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
                    {dateFontSize}pt
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="range"
                    value={dateFontSize}
                    onChange={(e) => setDateFontSize(Number(e.target.value))}
                    min={4}
                    max={20}
                    step={1}
                    style={{
                      flex: 1,
                      height: '6px',
                      borderRadius: '3px',
                      backgroundColor: '#e5e7eb',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="number"
                    value={dateFontSize}
                    onChange={(e) => setDateFontSize(Number(e.target.value))}
                    min={4}
                    max={20}
                    step={1}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'center',
                      backgroundColor: '#fff',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

