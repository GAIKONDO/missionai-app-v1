/**
 * MCPツール詳細モーダル
 */

'use client';

import React, { useState } from 'react';
import type { MCPTool } from '@/lib/mcp/types';
import type { MCPToolWithMetadata } from '@/lib/mcp/toolStorage';
import { MCPToolEditModal } from './MCPToolEditModal';
import { DeleteMCPToolConfirmModal } from './DeleteMCPToolConfirmModal';

interface MCPToolDetailModalProps {
  isOpen: boolean;
  tool: MCPTool | null;
  metadata?: MCPToolWithMetadata | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function MCPToolDetailModal({ isOpen, tool, metadata, onClose, onUpdate }: MCPToolDetailModalProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  if (!isOpen || !tool) return null;

  const isCustom = metadata?.implementationType === 'custom';

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
  };

  const handleDeleteClose = () => {
    setIsDeleteModalOpen(false);
  };

  const handleEditSave = () => {
    setIsEditModalOpen(false);
    onUpdate?.();
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    onUpdate?.();
    onClose(); // 削除後はモーダルを閉じる
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
          backgroundColor: 'var(--color-background)',
          borderRadius: '12px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--color-background)',
            borderBottom: '1px solid var(--color-border-color)',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: 0,
              fontFamily: 'monospace',
            }}
          >
            {tool.name} - 詳細
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isCustom && (
              <>
                <button
                  onClick={handleEdit}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  編集
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '6px 12px',
                    background: '#F44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  削除
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
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
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 基本情報 */}
            <section>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--color-border-color)',
                }}
              >
                基本情報
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>ツール名:</span>
                  <span
                    style={{
                      marginLeft: '8px',
                      color: 'var(--color-text)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {tool.name}
                  </span>
                </div>
                {tool.returns && (
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>戻り値の型:</span>
                    <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{tool.returns.type}</span>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>説明:</span>
                <p style={{ marginTop: '4px', color: 'var(--color-text)', lineHeight: '1.6' }}>
                  {tool.description}
                </p>
              </div>
            </section>

            {/* 引数 */}
            {tool.arguments && tool.arguments.length > 0 && (
              <section>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--color-border-color)',
                  }}
                >
                  引数 ({tool.arguments.length}個)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {tool.arguments.map((arg, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: 'var(--color-surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--color-text)',
                          }}
                        >
                          {arg.name}
                        </span>
                        <span
                          style={{
                            padding: '4px 8px',
                            background: 'var(--color-background)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: 'var(--color-text)',
                            fontWeight: 500,
                          }}
                        >
                          {arg.type}
                        </span>
                        {arg.required && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#F44336',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            必須
                          </span>
                        )}
                        {!arg.required && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-secondary)',
                              borderRadius: '4px',
                              fontSize: '11px',
                            }}
                          >
                            任意
                          </span>
                        )}
                      </div>
                      {arg.description && (
                        <div
                          style={{
                            fontSize: '14px',
                            color: 'var(--color-text-secondary)',
                            marginTop: '4px',
                            lineHeight: '1.6',
                          }}
                        >
                          {arg.description}
                        </div>
                      )}
                      {arg.default !== undefined && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px 12px',
                            background: 'var(--color-background)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            color: 'var(--color-text)',
                          }}
                        >
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>デフォルト値: </span>
                          {JSON.stringify(arg.default, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 戻り値 */}
            {tool.returns && (
              <section>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid var(--color-border-color)',
                  }}
                >
                  戻り値
                </h3>
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--color-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        background: 'var(--color-background)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: 'var(--color-text)',
                        fontWeight: 500,
                      }}
                    >
                      {tool.returns.type}
                    </span>
                  </div>
                  {tool.returns.description && (
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '8px',
                        lineHeight: '1.6',
                      }}
                    >
                      {tool.returns.description}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* 編集モーダル */}
      {isCustom && (
        <MCPToolEditModal
          isOpen={isEditModalOpen}
          tool={tool}
          metadata={metadata}
          onClose={handleEditClose}
          onSave={handleEditSave}
        />
      )}

      {/* 削除確認モーダル */}
      {isCustom && (
        <DeleteMCPToolConfirmModal
          isOpen={isDeleteModalOpen}
          toolName={tool.name}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

