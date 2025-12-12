# ChromaDB同期機能の改善実装

## 実装日: 2024年12月

## 概要

データ同期機能のリスク分析に基づいて、以下の改善を実装しました：

1. **同期ポリシー設定機能** - 同期の動作を設定可能に
2. **リトライ機能** - 失敗時の自動リトライ
3. **エラー通知機能** - ユーザーへのエラー通知
4. **変更検知機能** - 不要な埋め込み生成をスキップ
5. **整合性チェック機能** - データ不整合の検出と自動修復
6. **既存API関数への統合** - updateEntity/deleteEntityなどに自動統合

---

## 実装したファイル

### 新規作成

1. **`lib/chromaSyncConfig.ts`**
   - 同期ポリシーの設定管理
   - localStorageに設定を保存
   - デフォルト設定の提供

2. **`lib/chromaSyncNotification.ts`**
   - エラー通知機能
   - UIコンポーネントとの連携インターフェース
   - 通知タイプ（error, warning, info, success）

3. **`lib/chromaSyncRetry.ts`**
   - リトライ機能
   - 指数バックオフ
   - リトライ回数の設定

4. **`lib/chromaSyncConsistency.ts`**
   - データ整合性チェック
   - 不整合の検出
   - 自動修復機能
   - 定期チェック機能

5. **`lib/chromaSyncUtils.ts`**
   - 同期機能の初期化・停止
   - UI向けの設定取得・更新

### 更新

1. **`lib/chromaSync.ts`**
   - 変更検知機能を追加
   - リトライ機能を統合
   - エラー通知機能を統合
   - 設定に基づく動作制御

2. **`lib/entityApi.ts`**
   - `updateEntity()` に同期機能を統合
   - `deleteEntity()` に同期機能を統合
   - キャッシュ無効化を追加

3. **`lib/relationApi.ts`**
   - `updateRelation()` に同期機能を統合
   - `deleteRelation()` に同期機能を統合
   - キャッシュ無効化を追加

---

## 主な機能

### 1. 同期ポリシー設定

```typescript
import { chromaSyncConfig } from './chromaSyncConfig';

// 設定を取得
const config = chromaSyncConfig.getConfig();

// 設定を更新
chromaSyncConfig.setConfig({
  enabled: true,
  async: true,
  retryOnFailure: true,
  maxRetries: 3,
  showNotifications: true,
});
```

**設定項目**:
- `enabled`: 同期を有効にするか
- `async`: 非同期で実行するか
- `retryOnFailure`: 失敗時にリトライするか
- `maxRetries`: 最大リトライ回数
- `showNotifications`: エラー通知を表示するか
- `checkConsistency`: 整合性チェックを有効にするか

### 2. 変更検知機能

埋め込みに影響しない変更（例: `createdAt`の更新）の場合は、埋め込み再生成をスキップします。

**エンティティの場合**:
- 埋め込みに影響するフィールド: `name`, `aliases`, `metadata`, `type`
- 埋め込みに影響しないフィールド: `createdAt`, `updatedAt`（自動更新）

**リレーションの場合**:
- 埋め込みに影響するフィールド: `description`, `relationType`, `metadata`
- 埋め込みに影響しないフィールド: `createdAt`, `updatedAt`（自動更新）

### 3. リトライ機能

失敗時に自動的にリトライします（指数バックオフ）。

```typescript
// 自動的にリトライ（設定に基づく）
await syncEntityToChroma(entityId, organizationId, entity);

// 手動でリトライ設定
await syncWithRetry(
  () => saveEntityEmbedding(entityId, organizationId, entity),
  entityId,
  'entity',
  {
    maxRetries: 5,
    retryDelay: 2000,
  }
);
```

### 4. エラー通知機能

UIコンポーネントで通知ハンドラーを設定すると、エラーが自動的に通知されます。

```typescript
import { setNotificationHandler } from './chromaSyncNotification';

// UIコンポーネントで設定
setNotificationHandler((notification) => {
  // 通知をUIに表示
  showToast(notification.message, notification.type);
  
  // アクションボタンがある場合
  if (notification.action) {
    // アクションボタンを表示
  }
});
```

### 5. 整合性チェック機能

定期的にSQLiteとChromaDBの整合性をチェックし、不整合を自動修復します。

```typescript
import { startConsistencyCheck, checkAllConsistency, repairInconsistencies } from './chromaSyncConsistency';

// 定期チェックを開始（1時間ごと）
startConsistencyCheck(organizationId);

// 手動でチェック
const inconsistencies = await checkAllConsistency(organizationId);

// 手動で修復
const result = await repairInconsistencies(inconsistencies);
console.log(`修復: ${result.repaired}件, 失敗: ${result.failed}件`);
```

---

## 使用方法

### 基本的な使用（自動）

既存のAPI関数を使用するだけで、自動的に同期されます：

```typescript
// エンティティ更新（自動的にChromaDBも同期）
await updateEntity(entityId, { name: '新しい名前' });

// エンティティ削除（自動的にChromaDBからも削除）
await deleteEntity(entityId);
```

### 設定の変更

```typescript
import { chromaSyncConfig } from './chromaSyncConfig';

// 同期を無効にする
chromaSyncConfig.setConfig({ enabled: false });

// 通知を有効にする
chromaSyncConfig.setConfig({ showNotifications: true });

// リトライ回数を増やす
chromaSyncConfig.setConfig({ maxRetries: 5 });
```

### 初期化

```typescript
import { initializeChromaSync } from './chromaSyncUtils';

// アプリ起動時に初期化
initializeChromaSync({
  organizationId: currentOrganizationId,
  onNotification: (notification) => {
    // UIに通知を表示
    showNotification(notification);
  },
});
```

---

## 改善の効果

### パフォーマンス

- **変更検知**: 不要な埋め込み生成をスキップすることで、APIコストを削減
- **非同期処理**: UIの応答性を維持

### 信頼性

- **リトライ機能**: 一時的なエラーを自動的に回復
- **整合性チェック**: データ不整合を早期に発見・修復

### ユーザー体験

- **エラー通知**: 問題をユーザーに通知
- **設定可能**: ユーザーが同期の動作を制御可能

---

## 注意事項

### 1. 通知ハンドラーの設定

通知機能を使用する場合は、UIコンポーネントで通知ハンドラーを設定する必要があります：

```typescript
// app/layout.tsx などで設定
import { setNotificationHandler } from '@/lib/chromaSyncNotification';

useEffect(() => {
  setNotificationHandler((notification) => {
    // トースト通知を表示
    toast(notification.message, {
      type: notification.type,
      action: notification.action,
    });
  });
}, []);
```

### 2. 整合性チェックの開始

整合性チェックを使用する場合は、アプリ起動時に開始する必要があります：

```typescript
// app/layout.tsx などで設定
import { initializeChromaSync } from '@/lib/chromaSyncUtils';

useEffect(() => {
  initializeChromaSync({
    organizationId: currentOrganizationId,
  });
  
  return () => {
    shutdownChromaSync();
  };
}, [currentOrganizationId]);
```

### 3. Rust側の実装

一部の機能（ChromaDBからのIDリスト取得など）は、Rust側の実装が必要です。現在は簡易的な実装になっています。

---

## 今後の改善案

1. **Rust側の実装強化**
   - ChromaDBからのIDリスト取得機能
   - より効率的な整合性チェック

2. **UIコンポーネントの追加**
   - 同期設定画面
   - 整合性チェック結果の表示
   - エラー通知の表示

3. **監視機能の強化**
   - 同期の成功率の追跡
   - パフォーマンスメトリクスの収集
   - アラート機能

4. **バッチ処理の最適化**
   - より効率的なバッチ処理
   - レート制限の考慮

---

## まとめ

データ同期機能の改善により、以下の効果が期待できます：

- ✅ **パフォーマンス向上**: 変更検知により不要なAPI呼び出しを削減
- ✅ **信頼性向上**: リトライ機能により一時的なエラーを自動回復
- ✅ **データ整合性**: 整合性チェックにより不整合を早期発見・修復
- ✅ **ユーザー体験**: エラー通知により問題をユーザーに通知
- ✅ **運用性**: 設定可能により柔軟な運用が可能

実装は完了し、リントエラーもありません。動作確認をお願いします。
