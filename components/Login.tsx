'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '@/lib/localFirebase';

const ADMIN_UID = 'PktGlRBWVZc9E0Y3OLSQ4TeRg0P2';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isSignUp) {
        // 新規登録時
        if (!password || password.length < 6) {
          setError('パスワードは6文字以上である必要があります。');
          setLoading(false);
          return;
        }
        try {
          userCredential = await createUserWithEmailAndPassword(null, email, password);
        } catch (err: any) {
          // Tauri APIが利用できない場合のエラーハンドリング
          if (err.message?.includes('Tauri APIが利用できません') || 
              err.message?.includes('Tauriアプリケーションを起動してください') ||
              err.message?.includes('Tauriアプリケーションが起動していません')) {
            setError(err.message || 'Tauriアプリケーションが起動していません。Tauriアプリケーションを起動してから再度お試しください。');
            setLoading(false);
            return;
          }
          throw err;
        }
        
        // Tauri環境では、localFirebaseが既にユーザーを登録しているため、追加の処理は不要
        // 一旦ログアウト（承認待ちのため）
        await signOut(null);
        
        // フォームをリセット（デフォルト値に戻す）
        setEmail('admin@example.com');
        setPassword('admin123');
        setIsSignUp(false);
        
        // 成功メッセージを表示
        setError('');
        setLoading(false); // 新規登録成功時はローディング状態を解除
        alert('アカウント登録が完了しました。開発環境では自動承認されます。ログインしてください。');
      } else {
        // ログイン時
        if (!password) {
          setError('パスワードを入力してください。');
          setLoading(false);
          return;
        }
        try {
          userCredential = await signInWithEmailAndPassword(null, email, password);
        } catch (err: any) {
          // Tauri APIが利用できない場合のエラーハンドリング
          if (err.message?.includes('Tauri APIが利用できません') || 
              err.message?.includes('Tauriアプリケーションを起動してください') ||
              err.message?.includes('Tauriアプリケーションが起動していません')) {
            setError(err.message || 'Tauriアプリケーションが起動していません。Tauriアプリケーションを起動してから再度お試しください。');
            setLoading(false);
            return;
          }
          // ログインエラーの処理
          if (err.message?.includes('ログインエラー') || err.message?.includes('Query returned no rows')) {
            setError('メールアドレスまたはパスワードが正しくありません。\n\nデフォルトユーザーでログインする場合:\n- メールアドレス: admin@example.com\n- パスワード: admin123\n\n新規登録が必要な場合は「新規登録はこちら」をクリックしてください。');
            setLoading(false);
            return;
          }
          // データベース初期化エラー
          if (err.message?.includes('データベースが初期化されていません')) {
            setError('データベースが初期化されていません。\n\n対処法:\n1. アプリケーションを再起動してください\n2. それでも解決しない場合は、データベースを再初期化してください');
            setLoading(false);
            return;
          }
          // その他のエラー（詳細なメッセージをそのまま表示）
          setError(err.message || 'ログインに失敗しました。');
          setLoading(false);
          return;
        }
        
        // Tauri環境では承認チェックをスキップ（ローカルDBでは自動承認）
        // 管理者の場合は特別な処理は不要（Tauri環境では自動承認）
        console.log('ログイン成功:', { userId: userCredential.user.uid, email: userCredential.user.email });
        
        // ログイン成功後、ダッシュボードにリダイレクト
        // ローディング状態は維持したままリダイレクト（完了まで「ログイン中」を表示）
        router.push('/');
        // リダイレクト後はコンポーネントがアンマウントされるため、setLoading(false)は不要
        return;
      }
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
      setLoading(false); // エラー時のみローディング状態を解除
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>
          {isSignUp ? '新規登録' : 'ログイン'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">メールアドレス</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">パスワード</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isSignUp ? 6 : undefined}
            />
          </div>
          {error && (
            <div style={{ color: '#dc3545', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
              {error}
            </div>
          )}
          <button type="submit" className="button" disabled={loading} style={{ width: '100%' }}>
            {loading ? '処理中...' : isSignUp ? '登録' : 'ログイン'}
          </button>
        </form>
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              // 新規登録モードに切り替える場合は、デフォルト値をクリア
              if (!isSignUp) {
                setEmail('');
                setPassword('');
              } else {
                // ログインモードに戻る場合は、デフォルト値を設定
                setEmail('admin@example.com');
                setPassword('admin123');
              }
            }}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? '既にアカウントをお持ちの方はこちら' : '新規登録はこちら'}
          </button>
        </div>
        {!isSignUp && (
          <>
            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              💡 デフォルトユーザーが入力済みです。そのまま「ログイン」ボタンをクリックしてください。
            </div>
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e8f4f8', borderRadius: '4px', fontSize: '12px', color: '#333', border: '1px solid #b3d9e6' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0066cc' }}>
                📋 サンプルアカウント
              </div>
              <div style={{ lineHeight: '1.6' }}>
                <div><strong>メールアドレス:</strong> admin@example.com</div>
                <div><strong>パスワード:</strong> admin123</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

