/**
 * ループノードエディタ
 */

'use client';

import { useState } from 'react';
import type { ChainNode, ChainCondition } from '@/lib/agent-system/taskChain';
import type { Task } from '@/lib/agent-system/types';

interface LoopNodeEditorProps {
  chainNode: ChainNode;
  onChange: (node: ChainNode) => void;
  availableTasks?: Task[];
}

export function LoopNodeEditor({ chainNode, onChange, availableTasks = [] }: LoopNodeEditorProps) {
  const loopCount = chainNode.loopCount || 1;
  const loopCondition = chainNode.loopCondition;
  const [loopType, setLoopType] = useState<'count' | 'condition'>(chainNode.loopCount ? 'count' : 'condition');

  const handleLoopCountChange = (count: number) => {
    onChange({
      ...chainNode,
      loopCount: count,
      loopCondition: undefined,
    });
  };

  const handleLoopConditionChange = (condition: ChainCondition | undefined) => {
    onChange({
      ...chainNode,
      loopCondition: condition,
      loopCount: undefined,
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
          ループタイプ
        </label>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <button
            onClick={() => {
              setLoopType('count');
              handleLoopCountChange(1);
            }}
            style={{
              padding: '6px 12px',
              background: loopType === 'count' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: loopType === 'count' ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            回数指定
          </button>
          <button
            onClick={() => {
              setLoopType('condition');
              handleLoopConditionChange({
                type: 'equals',
                field: '',
                value: '',
              });
            }}
            style={{
              padding: '6px 12px',
              background: loopType === 'condition' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: loopType === 'condition' ? 'white' : 'var(--color-text)',
              border: '1px solid var(--color-border-color)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            条件指定
          </button>
        </div>
      </div>

      {loopType === 'count' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
            ループ回数 *
          </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={loopCount}
            onChange={(e) => handleLoopCountChange(parseInt(e.target.value, 10) || 1)}
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

      {loopType === 'condition' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              条件タイプ
            </label>
            <select
              value={loopCondition?.type || 'equals'}
              onChange={(e) =>
                handleLoopConditionChange({
                  ...(loopCondition || { type: 'equals', field: '', value: '' }),
                  type: e.target.value as any,
                })
              }
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
              フィールドパス *
            </label>
            <input
              type="text"
              placeholder="例: result.count, loop.index"
              value={loopCondition?.field || ''}
              onChange={(e) =>
                handleLoopConditionChange({
                  ...(loopCondition || { type: 'equals', field: '', value: '' }),
                  field: e.target.value,
                })
              }
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

          {loopCondition?.type !== 'exists' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--color-text)' }}>
                比較値 *
              </label>
              <input
                type="text"
                placeholder="比較する値"
                value={loopCondition?.value || ''}
                onChange={(e) =>
                  handleLoopConditionChange({
                    ...(loopCondition || { type: 'equals', field: '', value: '' }),
                    value: e.target.value,
                  })
                }
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
        </div>
      )}

      <div style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: '6px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        <p style={{ margin: 0, marginBottom: '8px' }}>
          <strong>ループの動作:</strong>
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>ループ内のタスクが指定回数または条件が満たされるまで繰り返し実行されます</li>
          <li>ループ内のノードはエディタ上で接続を設定してください</li>
          <li>ループを抜ける条件が満たされない場合、無限ループになる可能性があります</li>
        </ul>
      </div>
    </div>
  );
}

