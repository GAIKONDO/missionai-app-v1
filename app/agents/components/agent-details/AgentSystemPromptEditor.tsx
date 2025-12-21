/**
 * Agentシステムプロンプト編集コンポーネント
 */

'use client';

import React, { useState } from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { showToast } from '@/components/Toast';

interface AgentSystemPromptEditorProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

// プロンプトテンプレート
const PROMPT_TEMPLATES = {
  general: {
    name: '汎用エージェント',
    prompt: `あなたは汎用AIエージェントです。
ユーザーからのタスクを実行し、適切な結果を返してください。
必要に応じて、他のAgentに確認や指示を出すことができます。
出力は構造化され、読みやすい形式にしてください。`,
  },
  analysis: {
    name: '分析エージェント',
    prompt: `あなたは分析専門のAIエージェントです。
提供されたデータやトピックを分析し、パターン、傾向、洞察を抽出します。
分析結果は構造化され、アクション可能な推奨事項を含めます。
以下の形式で出力してください：
- 概要
- 主要な発見
- 推奨事項
- 次のステップ`,
  },
  generation: {
    name: '生成エージェント',
    prompt: `あなたは生成専門のAIエージェントです。
ユーザーからの指示に基づいて、テキスト、要約、レポートなどを生成します。
生成されるコンテンツは正確で、構造化され、読みやすい形式にします。
必要に応じて、箇条書きや見出しを使用して構造化してください。`,
  },
  search: {
    name: '検索エージェント',
    prompt: `あなたは検索専門のAIエージェントです。
ユーザーからの検索クエリに対して、ナレッジグラフや設計ドキュメントを検索し、関連情報を提供します。
検索結果は正確で関連性の高いものを優先します。
結果は以下の形式で提供してください：
- 関連度の高い順に並べる
- 各結果に簡潔な説明を付ける
- 出典を明記する`,
  },
  validation: {
    name: '検証エージェント',
    prompt: `あなたは検証専門のAIエージェントです。
提供されたデータの整合性、品質、正確性を検証します。
検証結果は明確で、問題があれば具体的な指摘を行います。
以下の形式で出力してください：
- 検証項目
- 結果（OK/NG）
- 問題点（該当する場合）
- 推奨事項`,
  },
  structured: {
    name: '構造化出力',
    prompt: `あなたは構造化された出力を生成するAIエージェントです。
すべての出力はJSON形式で返してください。
以下の構造に従ってください：
{
  "summary": "概要",
  "details": ["詳細1", "詳細2"],
  "recommendations": ["推奨事項1", "推奨事項2"]
}`,
  },
  concise: {
    name: '簡潔な出力',
    prompt: `あなたは簡潔で要点を押さえた出力を生成するAIエージェントです。
冗長な説明は避け、重要な情報のみを提供してください。
箇条書きを活用し、読みやすさを重視してください。`,
  },
};

export function AgentSystemPromptEditor({ agent, onUpdate }: AgentSystemPromptEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [originalPrompt, setOriginalPrompt] = useState(agent.systemPrompt);
  const [showTemplates, setShowTemplates] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleEdit = () => {
    setOriginalPrompt(systemPrompt);
    setIsEditing(true);
  };

  const validatePrompt = (prompt: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const trimmed = prompt.trim();

    if (trimmed.length === 0) {
      errors.push('プロンプトが空です');
    } else if (trimmed.length < 10) {
      errors.push('プロンプトが短すぎます（最低10文字）');
    } else if (trimmed.length > 5000) {
      errors.push('プロンプトが長すぎます（最大5000文字）');
    }

    // 基本的な指示が含まれているかチェック
    const hasRole = /(あなたは|You are|役割|role)/i.test(trimmed);
    const hasInstruction = /(実行|生成|分析|検索|検証|指示|instruction|task)/i.test(trimmed);
    
    if (!hasRole && trimmed.length > 20) {
      errors.push('警告: Agentの役割が明確に記述されていない可能性があります');
    }
    if (!hasInstruction && trimmed.length > 20) {
      errors.push('警告: 具体的な指示が含まれていない可能性があります');
    }

    return {
      isValid: errors.length === 0 || errors.every(e => e.startsWith('警告:')),
      errors,
    };
  };

  const handleSave = () => {
    const validation = validatePrompt(systemPrompt);
    setValidationErrors(validation.errors);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.filter(e => !e.startsWith('警告:')).join('\n');
      showToast(`プロンプトの検証に失敗しました: ${errorMessage}`, 'error');
      return;
    }

    if (validation.errors.length > 0) {
      const warningMessage = validation.errors.filter(e => e.startsWith('警告:')).join('\n');
      if (!confirm(`警告:\n\n${warningMessage}\n\nそれでも保存しますか？`)) {
        return;
      }
    }

    const updatedAgent: Agent = {
      ...agent,
      systemPrompt: systemPrompt.trim(),
      updatedAt: Date.now(),
    };
    onUpdate(updatedAgent);
    setIsEditing(false);
    setShowTemplates(false);
    setValidationErrors([]);
    showToast('システムプロンプトを保存しました', 'success');
  };

  const handleCancel = () => {
    setSystemPrompt(originalPrompt);
    setIsEditing(false);
    setShowTemplates(false);
  };

  const handleTemplateSelect = (templateKey: keyof typeof PROMPT_TEMPLATES) => {
    const template = PROMPT_TEMPLATES[templateKey];
    setSystemPrompt(template.prompt);
    setShowTemplates(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
            flex: 1,
          }}
        >
          システムプロンプト
        </h3>
        {!isEditing && (
          <button
            onClick={handleEdit}
            style={{
              padding: '4px 12px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '12px',
            }}
          >
            編集
          </button>
        )}
      </div>

      {isEditing ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>テンプレートから選択:</span>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              style={{
                padding: '4px 8px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {showTemplates ? 'テンプレートを閉じる' : 'テンプレートを表示'}
            </button>
          </div>
          {showTemplates && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                background: 'var(--color-surface)',
                borderRadius: '6px',
                border: '1px solid var(--color-border-color)',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                {Object.entries(PROMPT_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => handleTemplateSelect(key as keyof typeof PROMPT_TEMPLATES)}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--color-background)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-primary)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-background)';
                      e.currentTarget.style.color = 'var(--color-text)';
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              // リアルタイム検証（警告のみ）
              const validation = validatePrompt(e.target.value);
              setValidationErrors(validation.errors.filter(e => e.startsWith('警告:')));
            }}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '16px',
              background: 'var(--color-surface)',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: 'var(--color-text)',
              border: validationErrors.some(e => !e.startsWith('警告:'))
                ? '1px solid #F44336'
                : validationErrors.length > 0
                ? '1px solid #FFC107'
                : '1px solid var(--color-border-color)',
              resize: 'vertical',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
            }}
            placeholder="システムプロンプトを入力してください..."
          />
          {validationErrors.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: validationErrors.some(e => !e.startsWith('警告:'))
                  ? 'rgba(244, 67, 54, 0.1)'
                  : 'rgba(255, 193, 7, 0.1)',
                borderRadius: '4px',
                fontSize: '11px',
                color: validationErrors.some(e => !e.startsWith('警告:'))
                  ? '#F44336'
                  : '#FFC107',
                border: `1px solid ${validationErrors.some(e => !e.startsWith('警告:')) ? '#F44336' : '#FFC107'}`,
              }}
            >
              {validationErrors.map((error, index) => (
                <div key={index}>⚠️ {error}</div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
            {systemPrompt.trim().length} / 5000 文字
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={handleSave}
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
              保存
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '6px 12px',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-color)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              キャンセル
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <p>💡 ヒント:</p>
            <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
              <li>Agentの役割と期待される動作を明確に記述してください</li>
              <li>出力形式を指定すると、結果が構造化されます（例: JSON形式、箇条書き）</li>
              <li>具体的な指示を追加すると、より正確な結果が得られます</li>
            </ul>
          </div>
        </div>
      ) : (
        <pre
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'var(--color-text)',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            border: '1px solid var(--color-border-color)',
            lineHeight: '1.6',
            margin: 0,
          }}
        >
          {agent.systemPrompt}
        </pre>
      )}
    </div>
  );
}

