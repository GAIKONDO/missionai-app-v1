/**
 * 条件ノードエディタ
 */

'use client';

import type { ChainNode, ChainCondition } from '@/lib/agent-system/taskChain';

interface ConditionNodeEditorProps {
  chainNode: ChainNode;
  onChange: (node: ChainNode) => void;
}

export function ConditionNodeEditor({ chainNode, onChange }: ConditionNodeEditorProps) {
  const condition = chainNode.condition || {
    type: 'equals' as const,
    field: '',
    value: '',
  };

  const handleConditionChange = (field: keyof ChainCondition, value: any) => {
    onChange({
      ...chainNode,
      condition: {
        ...condition,
        [field]: value,
      },
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
          条件タイプ
        </label>
        <select
          value={condition.type}
          onChange={(e) => handleConditionChange('type', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
          }}
        >
          <option value="equals">等しい (equals)</option>
          <option value="not_equals">等しくない (not_equals)</option>
          <option value="greater_than">より大きい (greater_than)</option>
          <option value="less_than">より小さい (less_than)</option>
          <option value="contains">含む (contains)</option>
          <option value="exists">存在する (exists)</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
          フィールドパス *
        </label>
        <input
          type="text"
          placeholder="例: result.status, result.count, task.parameters.value"
          value={condition.field}
          onChange={(e) => handleConditionChange('field', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            fontSize: '14px',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
          }}
        />
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          前のノードの実行結果から値を取得するパスを指定します。
        </p>
      </div>

      {condition.type !== 'exists' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
            比較値 *
          </label>
          <input
            type="text"
            placeholder="比較する値"
            value={condition.value || ''}
            onChange={(e) => handleConditionChange('value', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--color-border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
            }}
          />
        </div>
      )}

      <div style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: '6px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        <p style={{ margin: 0, marginBottom: '8px' }}>
          <strong>条件分岐の動作:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>条件が真の場合: 「真」の分岐先ノードに進みます</li>
          <li>条件が偽の場合: 「偽」の分岐先ノードに進みます</li>
          <li>分岐先ノードはエディタ上で接続を設定してください</li>
        </ul>
      </div>
    </div>
  );
}

