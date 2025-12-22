'use client';

import { useState } from 'react';
import type { ImportPreview, MultiSectionImportPreview } from '@/lib/csvImport';
import { createOrg } from '@/lib/orgApi';
import { addOrgMember } from '@/lib/orgApi';
import DeleteConfirmModal from './DeleteConfirmModal';

interface CsvImportPreviewModalProps {
  isOpen: boolean;
  importPreview: ImportPreview | null;
  multiSectionPreview: MultiSectionImportPreview | null;
  onClose: () => void;
  onPreviewUpdate: (preview: ImportPreview | MultiSectionImportPreview | null) => void;
}

export default function CsvImportPreviewModal({
  isOpen,
  importPreview,
  multiSectionPreview,
  onClose,
  onPreviewUpdate,
}: CsvImportPreviewModalProps) {
  const [editingRowIndex, setEditingRowIndex] = useState<{ sectionIndex?: number; rowIndex: number } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [deleteTargetRowIndex, setDeleteTargetRowIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleDeleteRow = () => {
    if (deleteTargetRowIndex !== null) {
      if (multiSectionPreview) {
        const newSections = [...multiSectionPreview.sections];
        const newRows = newSections[selectedSectionIndex].preview.rows.filter((_, idx) => idx !== deleteTargetRowIndex);
        newSections[selectedSectionIndex].preview = {
          ...newSections[selectedSectionIndex].preview,
          rows: newRows,
          totalRows: newRows.length,
          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
        };
        onPreviewUpdate({ sections: newSections });
      } else if (importPreview) {
        const newRows = importPreview.rows.filter((_, idx) => idx !== deleteTargetRowIndex);
        onPreviewUpdate({
          ...importPreview,
          rows: newRows,
          totalRows: newRows.length,
          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
        });
      }
    }
    setShowDeleteConfirmModal(false);
    setDeleteTargetRowIndex(null);
  };

  const handleImport = async () => {
    if (multiSectionPreview) {
      setIsImporting(true);
      const totalValidRows = multiSectionPreview.sections.reduce((sum, s) => sum + s.preview.validRows, 0);
      setImportProgress({ current: 0, total: totalValidRows });
      
      try {
        const BATCH_SIZE = 10;
        let totalSuccessCount = 0;
        let totalErrorCount = 0;
        
        for (const section of multiSectionPreview.sections) {
          const preview = section.preview;
          const validRows = preview.rows.filter(row => !row.errors || row.errors.length === 0);
          
          for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, validRows.length);
            const batch = validRows.slice(batchStart, batchEnd);
            
            const results = await Promise.allSettled(
              batch.map(async (row) => {
                try {
                  if (preview.type === 'organizations') {
                    const parentId = row.data['親組織ID'] || row.data['parentId'] || null;
                    const name = row.data['組織名'] || row.data['name'] || '';
                    const title = row.data['タイトル'] || row.data['title'] || null;
                    const description = row.data['説明'] || row.data['description'] || null;
                    const level = parseInt(row.data['階層レベル'] || row.data['level'] || '0', 10);
                    const levelName = row.data['階層名称'] || row.data['levelName'] || '部門';
                    const position = parseInt(row.data['表示順序'] || row.data['position'] || '0', 10);
                    
                    await createOrg(parentId, name, title, description, level, levelName, position);
                    return { success: true };
                  } else if (preview.type === 'members') {
                    const organizationId = row.data['組織ID'] || row.data['organizationId'] || '';
                    const name = row.data['メンバー名'] || row.data['名前'] || row.data['name'] || '';
                    const position = row.data['役職'] || row.data['position'] || null;
                    
                    await addOrgMember(organizationId, {
                      name,
                      title: position,
                      nameRomaji: row.data['名前（ローマ字）'] || row.data['nameRomaji'] || null,
                      department: row.data['部署'] || row.data['部門'] || row.data['department'] || null,
                      extension: row.data['内線番号'] || row.data['内線'] || row.data['extension'] || null,
                      companyPhone: row.data['会社電話番号'] || row.data['会社電話'] || row.data['companyPhone'] || null,
                      mobilePhone: row.data['携帯電話番号'] || row.data['携帯電話'] || row.data['mobilePhone'] || null,
                      email: row.data['メールアドレス'] || row.data['メール'] || row.data['email'] || null,
                      itochuEmail: row.data['伊藤忠メールアドレス'] || row.data['伊藤忠メール'] || row.data['itochuEmail'] || null,
                      teams: row.data['Teams'] || row.data['teams'] || null,
                      employeeType: row.data['雇用形態'] || row.data['社員タイプ'] || row.data['employeeType'] || null,
                      roleName: row.data['ロール名'] || row.data['役割名'] || row.data['roleName'] || null,
                      indicator: row.data['インジケーター'] || row.data['インディケータ'] || row.data['indicator'] || null,
                      location: row.data['所在地'] || row.data['場所'] || row.data['location'] || null,
                      floorDoorNo: row.data['フロア・ドア番号'] || row.data['階・ドア番号'] || row.data['floorDoorNo'] || null,
                      previousName: row.data['以前の名前'] || row.data['旧名'] || row.data['previousName'] || null,
                    });
                    return { success: true };
                  } else if (preview.type === 'companies') {
                    console.warn('事業会社のインポートは未実装です');
                    return { success: false, error: '未実装' };
                  }
                  return { success: false, error: '不明なタイプ' };
                } catch (error: any) {
                  console.error(`行のインポートエラー:`, error);
                  return { success: false, error: error.message };
                }
              })
            );
            
            for (const result of results) {
              if (result.status === 'fulfilled' && result.value.success) {
                totalSuccessCount++;
              } else {
                totalErrorCount++;
              }
            }
            
            setImportProgress({ current: totalSuccessCount + totalErrorCount, total: totalValidRows });
          }
          
          totalErrorCount += preview.rows.length - validRows.length;
        }
        
        alert(`インポートが完了しました。\n成功: ${totalSuccessCount}件\nエラー: ${totalErrorCount}件`);
        onClose();
        onPreviewUpdate(null);
      } catch (error: any) {
        alert(`インポート中にエラーが発生しました: ${error.message}`);
      } finally {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0 });
      }
    } else if (importPreview) {
      setIsImporting(true);
      setImportProgress({ current: 0, total: importPreview.validRows });
      
      try {
        const validRows = importPreview.rows.filter(row => !row.errors || row.errors.length === 0);
        const BATCH_SIZE = 10;
        let successCount = 0;
        let errorCount = 0;
        
        for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, validRows.length);
          const batch = validRows.slice(batchStart, batchEnd);
          
          const results = await Promise.allSettled(
            batch.map(async (row) => {
              try {
                if (importPreview.type === 'organizations') {
                  const parentId = row.data['親組織ID'] || row.data['parentId'] || null;
                  const name = row.data['組織名'] || row.data['name'] || '';
                  const title = row.data['タイトル'] || row.data['title'] || null;
                  const description = row.data['説明'] || row.data['description'] || null;
                  const level = parseInt(row.data['階層レベル'] || row.data['level'] || '0', 10);
                  const levelName = row.data['階層名称'] || row.data['levelName'] || '部門';
                  const position = parseInt(row.data['表示順序'] || row.data['position'] || '0', 10);
                  
                  await createOrg(parentId, name, title, description, level, levelName, position);
                  return { success: true };
                } else if (importPreview.type === 'members') {
                  const organizationId = row.data['組織ID'] || row.data['organizationId'] || '';
                  const name = row.data['メンバー名'] || row.data['名前'] || row.data['name'] || '';
                  const position = row.data['役職'] || row.data['position'] || null;
                  
                  await addOrgMember(organizationId, {
                    name,
                    title: position,
                    nameRomaji: row.data['名前（ローマ字）'] || row.data['nameRomaji'] || null,
                    department: row.data['部署'] || row.data['部門'] || row.data['department'] || null,
                    extension: row.data['内線番号'] || row.data['内線'] || row.data['extension'] || null,
                    companyPhone: row.data['会社電話番号'] || row.data['会社電話'] || row.data['companyPhone'] || null,
                    mobilePhone: row.data['携帯電話番号'] || row.data['携帯電話'] || row.data['mobilePhone'] || null,
                    email: row.data['メールアドレス'] || row.data['メール'] || row.data['email'] || null,
                    itochuEmail: row.data['伊藤忠メールアドレス'] || row.data['伊藤忠メール'] || row.data['itochuEmail'] || null,
                    teams: row.data['Teams'] || row.data['teams'] || null,
                    employeeType: row.data['雇用形態'] || row.data['社員タイプ'] || row.data['employeeType'] || null,
                    roleName: row.data['ロール名'] || row.data['役割名'] || row.data['roleName'] || null,
                    indicator: row.data['インジケーター'] || row.data['インディケータ'] || row.data['indicator'] || null,
                    location: row.data['所在地'] || row.data['場所'] || row.data['location'] || null,
                    floorDoorNo: row.data['フロア・ドア番号'] || row.data['階・ドア番号'] || row.data['floorDoorNo'] || null,
                    previousName: row.data['以前の名前'] || row.data['旧名'] || row.data['previousName'] || null,
                  });
                  return { success: true };
                } else if (importPreview.type === 'companies') {
                  console.warn('事業会社のインポートは未実装です');
                  return { success: false, error: '未実装' };
                }
                return { success: false, error: '不明なタイプ' };
              } catch (error: any) {
                console.error(`行のインポートエラー:`, error);
                return { success: false, error: error.message };
              }
            })
          );
          
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
              successCount++;
            } else {
              errorCount++;
            }
          }
          
          setImportProgress({ current: successCount + errorCount, total: importPreview.validRows });
        }
        
        errorCount += importPreview.rows.length - validRows.length;
        
        alert(`インポートが完了しました。\n成功: ${successCount}件\nエラー: ${errorCount}件`);
        onClose();
        onPreviewUpdate(null);
      } catch (error: any) {
        alert(`インポート中にエラーが発生しました: ${error.message}`);
      } finally {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0 });
      }
    }
  };

  const validateRow = (preview: ImportPreview, rowIndex: number): string[] => {
    const row = preview.rows[rowIndex];
    const errors: string[] = [];
    
    if (preview.type === 'organizations') {
      const id = row.data['ID'] || row.data['id'] || '';
      const name = row.data['組織名'] || row.data['name'] || '';
      if (!id) errors.push('IDが必須です');
      if (!name) errors.push('組織名が必須です');
    } else if (preview.type === 'members') {
      const id = row.data['ID'] || row.data['id'] || '';
      const name = row.data['メンバー名'] || row.data['名前'] || row.data['name'] || '';
      const orgId = row.data['組織ID'] || row.data['organizationId'] || '';
      if (!id) errors.push('IDが必須です');
      if (!name) errors.push('メンバー名が必須です');
      if (!orgId) errors.push('組織IDが必須です');
    } else if (preview.type === 'companies') {
      const id = row.data['ID'] || row.data['id'] || '';
      const name = row.data['会社名'] || row.data['name'] || '';
      if (!id) errors.push('IDが必須です');
      if (!name) errors.push('会社名が必須です');
    }
    
    return errors;
  };

  const renderPreviewTable = (preview: ImportPreview, sectionIndex?: number) => {
    const isEditing = (rowIndex: number) => {
      if (sectionIndex !== undefined) {
        return editingRowIndex?.sectionIndex === sectionIndex && editingRowIndex?.rowIndex === rowIndex;
      }
      return editingRowIndex?.rowIndex === rowIndex && editingRowIndex?.sectionIndex === undefined;
    };

    const handleCellChange = (rowIndex: number, header: string, value: string) => {
      if (sectionIndex !== undefined && multiSectionPreview) {
        const newSections = [...multiSectionPreview.sections];
        const newRows = [...newSections[sectionIndex].preview.rows];
        newRows[rowIndex] = {
          ...newRows[rowIndex],
          data: {
            ...newRows[rowIndex].data,
            [header]: value,
          },
          errors: undefined,
        };
        newSections[sectionIndex].preview = {
          ...newSections[sectionIndex].preview,
          rows: newRows,
          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
        };
        onPreviewUpdate({ sections: newSections });
      } else if (importPreview) {
        const newRows = [...importPreview.rows];
        newRows[rowIndex] = {
          ...newRows[rowIndex],
          data: {
            ...newRows[rowIndex].data,
            [header]: value,
          },
          errors: undefined,
        };
        onPreviewUpdate({
          ...importPreview,
          rows: newRows,
          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
        });
      }
    };

    const handleSaveRow = (rowIndex: number) => {
      const errors = validateRow(preview, rowIndex);
      
      if (sectionIndex !== undefined && multiSectionPreview) {
        const newSections = [...multiSectionPreview.sections];
        const newRows = [...newSections[sectionIndex].preview.rows];
        newRows[rowIndex] = {
          ...newRows[rowIndex],
          errors: errors.length > 0 ? errors : undefined,
        };
        newSections[sectionIndex].preview = {
          ...newSections[sectionIndex].preview,
          rows: newRows,
          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
        };
        onPreviewUpdate({ sections: newSections });
      } else if (importPreview) {
        const newRows = [...importPreview.rows];
        newRows[rowIndex] = {
          ...newRows[rowIndex],
          errors: errors.length > 0 ? errors : undefined,
        };
        onPreviewUpdate({
          ...importPreview,
          rows: newRows,
          validRows: newRows.filter(r => !r.errors || r.errors.length === 0).length,
          errorRows: newRows.filter(r => r.errors && r.errors.length > 0).length,
        });
      }
      
      setEditingRowIndex(null);
    };

    return (
      <div style={{
        maxHeight: '500px',
        overflow: 'auto',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        marginBottom: '24px',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}>
          <thead style={{
            backgroundColor: '#F9FAFB',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            <tr>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: '600',
                color: '#374151',
                minWidth: '80px',
              }}>行番号</th>
              {preview.headers.map((header, index) => (
                <th
                  key={index}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #E5E7EB',
                    fontWeight: '600',
                    color: '#374151',
                    minWidth: '120px',
                  }}
                >
                  {header}
                </th>
              ))}
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderBottom: '2px solid #E5E7EB',
                fontWeight: '600',
                color: '#374151',
                minWidth: sectionIndex !== undefined ? '150px' : '100px',
              }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                style={{
                  backgroundColor: row.errors && row.errors.length > 0 ? '#FEF2F2' : '#FFFFFF',
                  borderBottom: '1px solid #E5E7EB',
                }}
              >
                <td style={{ padding: '12px', color: '#6B7280' }}>
                  {rowIndex + 1}
                  {row.errors && row.errors.length > 0 && (
                    <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                      ⚠️ {row.errors.join(', ')}
                    </div>
                  )}
                </td>
                {preview.headers.map((header, colIndex) => (
                  <td key={colIndex} style={{ padding: '12px' }}>
                    {isEditing(rowIndex) ? (
                      <input
                        type="text"
                        value={row.data[header] || ''}
                        onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    ) : (
                      <div style={{ color: '#374151', wordBreak: 'break-word' }}>
                        {row.data[header] || '-'}
                      </div>
                    )}
                  </td>
                ))}
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {isEditing(rowIndex) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveRow(rowIndex)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRowIndex(null)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#6B7280',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingRowIndex({ sectionIndex, rowIndex })}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#4262FF',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTargetRowIndex(rowIndex);
                            setShowDeleteConfirmModal(true);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: '#EF4444',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderStats = (preview: ImportPreview) => (
    <div style={{
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap',
    }}>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#EFF6FF',
        borderRadius: '8px',
        border: '1px solid #3B82F6',
      }}>
        <div style={{ fontSize: '12px', color: '#1E40AF', marginBottom: '4px' }}>タイプ</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1E40AF' }}>
          {preview.type === 'organizations' ? '組織' : 
           preview.type === 'members' ? 'メンバー' : '事業会社'}
        </div>
      </div>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#F0FDF4',
        borderRadius: '8px',
        border: '1px solid #10B981',
      }}>
        <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>総行数</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#065F46' }}>
          {preview.totalRows}件
        </div>
      </div>
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#F0FDF4',
        borderRadius: '8px',
        border: '1px solid #10B981',
      }}>
        <div style={{ fontSize: '12px', color: '#065F46', marginBottom: '4px' }}>有効な行</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#065F46' }}>
          {preview.validRows}件
        </div>
      </div>
      {preview.errorRows > 0 && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FEF2F2',
          borderRadius: '8px',
          border: '1px solid #EF4444',
        }}>
          <div style={{ fontSize: '12px', color: '#991B1B', marginBottom: '4px' }}>エラー行</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#991B1B' }}>
            {preview.errorRows}件
          </div>
        </div>
      )}
    </div>
  );

  // 単一セクション
  if (importPreview && !multiSectionPreview) {
    return (
      <>
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
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '1200px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
                CSVインポートプレビュー
              </h2>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {renderStats(importPreview)}
            {renderPreviewTable(importPreview)}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPreviewUpdate(null);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || importPreview.validRows === 0}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: isImporting || importPreview.validRows === 0 ? '#9CA3AF' : '#4262FF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isImporting || importPreview.validRows === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isImporting ? (
                  `インポート中... (${importProgress.current}/${importProgress.total})`
                ) : (
                  `インポート実行 (${importPreview.validRows}件)`
                )}
              </button>
            </div>
          </div>
        </div>
        <DeleteConfirmModal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setDeleteTargetRowIndex(null);
          }}
          onConfirm={handleDeleteRow}
        />
      </>
    );
  }

  // 複数セクション
  if (multiSectionPreview) {
    const currentSection = multiSectionPreview.sections[selectedSectionIndex];
    const currentPreview = currentSection?.preview;

    if (!currentPreview) return null;

    return (
      <>
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
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '1400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>
                CSVインポートプレビュー（複数セクション）
              </h2>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPreviewUpdate(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #E5E7EB' }}>
              {multiSectionPreview.sections.map((section, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedSectionIndex(index)}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: selectedSectionIndex === index ? '600' : '400',
                    color: selectedSectionIndex === index ? '#4262FF' : '#6B7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: selectedSectionIndex === index ? '3px solid #4262FF' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  {section.title} ({section.preview.totalRows}件)
                </button>
              ))}
            </div>

            {renderStats(currentPreview)}
            {renderPreviewTable(currentPreview, selectedSectionIndex)}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPreviewUpdate(null);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting || currentPreview.validRows === 0}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: isImporting || currentPreview.validRows === 0 ? '#9CA3AF' : '#4262FF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isImporting || currentPreview.validRows === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isImporting ? (
                  `インポート中... (${importProgress.current}/${importProgress.total})`
                ) : (
                  `インポート実行 (${currentPreview.validRows}件)`
                )}
              </button>
            </div>
          </div>
        </div>
        <DeleteConfirmModal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setDeleteTargetRowIndex(null);
          }}
          onConfirm={handleDeleteRow}
        />
      </>
    );
  }

  return null;
}

