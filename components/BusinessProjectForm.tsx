'use client';

import { useState, useEffect } from 'react';
import { callTauriCommand } from '@/lib/localFirebase';

export interface BusinessProjectData {
  name: string;
  description: string;
  serviceId: string; // 自動生成されるID
}

interface BusinessProjectFormProps {
  project?: BusinessProjectData & { id?: string };
  onSave: () => void;
  onCancel: () => void;
}

export default function BusinessProjectForm({ project, onSave, onCancel }: BusinessProjectFormProps) {
  const [formData, setFormData] = useState<BusinessProjectData>({
    name: '',
    description: '',
    serviceId: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        serviceId: project.serviceId || '',
      });
    } else {
      // 新規作成時はserviceIdを自動生成
      setFormData({
        name: '',
        description: '',
        serviceId: generateServiceId(''),
      });
    }
  }, [project]);

  const generateServiceId = (name: string): string => {
    // タイムスタンプとランダム文字列を組み合わせてユニークなIDを生成
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8); // 6文字のランダム文字列（英数字）
    
    if (!name || name.trim() === '') {
      return `project-${timestamp}-${randomStr}`;
    }
    
    // 日本語名から英数字IDを生成
    // まず、英数字とハイフン、アンダースコアのみを抽出
    let normalized = name
      .toLowerCase()
      // 英数字、ハイフン、アンダースコア、空白以外を削除
      .replace(/[^a-z0-9\s_-]/g, '')
      // 連続する空白をハイフンに変換
      .replace(/\s+/g, '-')
      // 連続するハイフンを1つに
      .replace(/-+/g, '-')
      // 先頭と末尾のハイフンを削除
      .replace(/^-+|-+$/g, '')
      .trim();
    
    // 正規化された文字列が空または短すぎる場合は、タイムスタンプとランダム文字列のみを使用
    if (!normalized || normalized.length < 2) {
      return `project-${timestamp}-${randomStr}`;
    }
    
    // 正規化された文字列が長すぎる場合は切り詰める（最大20文字）
    if (normalized.length > 20) {
      normalized = normalized.substring(0, 20).replace(/-+$/, '');
    }
    
    // 正規化された文字列にタイムスタンプとランダム文字列を追加してユニーク性を確保
    return `${normalized}-${timestamp}-${randomStr}`;
  };

  const handleNameChange = (name: string) => {
    const serviceId = project?.serviceId || generateServiceId(name);
    setFormData({ ...formData, name, serviceId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // 現在のユーザーを取得
      const currentUser = await callTauriCommand('get_current_user', {});
      const userId = currentUser?.uid || 'default-user';
      
      const data = {
        name: formData.name,
        description: formData.description,
        serviceId: formData.serviceId,
        userId: userId,
      };

      if (project?.id) {
        const result = await callTauriCommand('doc_update', {
          collectionName: 'businessProjects',
          docId: project.id,
          data
        });
        if (!result) {
          throw new Error('更新に失敗しました');
        }
      } else {
        const result = await callTauriCommand('collection_add', {
          collectionName: 'businessProjects',
          data
        });
        if (!result) {
          throw new Error('作成に失敗しました');
        }
      }
      onSave();
    } catch (error: any) {
      console.error('保存エラー:', error);
      alert(error?.message || '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px' }}>
        {project ? '事業企画を編集' : '新しい事業企画を作成'}
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">事業企画名 *</label>
          <input
            type="text"
            className="input"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="例: AI駆動開発・DX支援SI事業"
          />
        </div>

        <div className="form-group">
          <label className="label">説明 *</label>
          <textarea
            className="textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="事業企画の説明を入力してください"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="label">サービスID（自動生成）</label>
          <input
            type="text"
            className="input"
            value={formData.serviceId}
            readOnly
            placeholder="URL用のID（自動生成されます）"
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '13px',
              backgroundColor: 'var(--color-background)',
              cursor: 'not-allowed',
              opacity: 0.7
            }}
          />
          <p style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '4px' }}>
            このIDはURLに使用されます。事業企画名から自動生成され、変更できません。
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            className="button"
            style={{ background: 'var(--color-text-light)' }}
            disabled={loading}
          >
            キャンセル
          </button>
          <button type="submit" className="button" disabled={loading}>
            {loading ? '保存中...' : project ? '更新' : '作成'}
          </button>
        </div>
      </form>
    </div>
  );
}

