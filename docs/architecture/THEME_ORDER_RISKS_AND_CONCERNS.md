# テーマ順序変更機能 リスク分析と注意点

## 概要

テーマ順序変更機能の実装における潜在的なリスクと注意点を分析し、対策を提案する。

## 🔴 高リスク項目

### 1. データベースマイグレーションの失敗

#### リスク
- `ALTER TABLE`の実行中にエラーが発生する可能性
- 既存データの`position`初期化が失敗する可能性
- マイグレーションが部分的に実行され、データ不整合が発生する可能性

#### 影響範囲
- **高**: データベース全体の整合性に影響
- アプリケーション起動時にエラーが発生し、起動不能になる可能性

#### 対策
```rust
// トランザクション内で実行
let tx = conn.unchecked_transaction()?;

// 1. カラムの存在確認
let position_exists: bool = tx.query_row(
    "SELECT COUNT(*) FROM pragma_table_info('themes') WHERE name = 'position'",
    [],
    |row| Ok(row.get::<_, i32>(0)? > 0),
).unwrap_or(false);

if !position_exists {
    // 2. カラム追加
    tx.execute(
        "ALTER TABLE themes ADD COLUMN position INTEGER",
        [],
    )?;
    
    // 3. 初期値設定（サブクエリを使用して安全に）
    tx.execute(
        "UPDATE themes SET position = (
            SELECT ROW_NUMBER() OVER (ORDER BY createdAt DESC, title ASC)
            FROM themes t2
            WHERE t2.id = themes.id
        ) WHERE position IS NULL",
        [],
    )?;
}

tx.commit()?;
```

#### 追加対策
- マイグレーション前にバックアップを自動取得
- マイグレーション失敗時のロールバック処理
- エラーログの詳細な記録

### 2. 同時更新による競合状態（Race Condition）

#### リスク
- 複数のユーザーが同時にテーマ順序を変更した場合、最後の更新が優先され、意図しない順序になる
- ドラッグ&ドロップ中に他のユーザーがテーマを削除/追加した場合、順序がずれる

#### 影響範囲
- **中**: ユーザー体験に影響
- 順序が意図通りにならない

#### 対策
```typescript
// 楽観的ロック（Optimistic Locking）の実装
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  
  if (over && active.id !== over.id) {
    // 現在のテーマリストを取得（最新の状態を確認）
    const currentThemes = await getThemes();
    const currentThemeIds = currentThemes.map(t => t.id);
    
    // ドラッグ前のテーマIDリストと比較
    const originalThemeIds = orderedThemes.map(t => t.id);
    
    // テーマが追加/削除されていないか確認
    if (currentThemeIds.length !== originalThemeIds.length ||
        !currentThemeIds.every((id, index) => id === originalThemeIds[index])) {
      // テーマリストが変更されている場合は警告を表示
      alert('テーマリストが更新されました。ページをリロードしてください。');
      await refreshThemes();
      return;
    }
    
    // 順序変更を実行
    // ...
  }
};
```

#### 追加対策
- 更新時に`updatedAt`タイムスタンプをチェック
- 更新失敗時に明確なエラーメッセージを表示
- 自動リロード機能の実装

### 3. position値の重複・不整合

#### リスク
- 手動でSQLを実行した場合、`position`値が重複する可能性
- テーマ削除時に`position`の連番が途切れる
- マイグレーション後の`position`値が期待通りでない

#### 影響範囲
- **中**: 表示順序が意図通りにならない

#### 対策
```rust
// 一括更新時にpositionの正規化を実行
pub fn update_theme_positions(updates: &[(String, i32)]) -> SqlResult<()> {
    // ...
    
    // 更新後にpositionを正規化（1から始まる連番に）
    tx.execute(
        "UPDATE themes SET position = (
            SELECT ROW_NUMBER() OVER (ORDER BY position ASC, createdAt DESC, title ASC)
            FROM themes t2
            WHERE t2.id = themes.id
        )",
        [],
    )?;
    
    // ...
}
```

#### 追加対策
- 定期的な`position`値の正規化処理（バックグラウンドジョブ）
- データ整合性チェック機能の実装

## 🟡 中リスク項目

### 4. パフォーマンスへの影響

#### リスク
- テーマ数が増えた場合、一括更新のパフォーマンスが低下
- ドラッグ&ドロップ時のリアルタイム更新が重い

#### 影響範囲
- **中**: ユーザー体験に影響（レスポンスが遅い）

#### 対策
```typescript
// デバウンス処理の実装
const [pendingUpdates, setPendingUpdates] = useState<Array<{themeId: string; position: number}>>([]);

useEffect(() => {
  if (pendingUpdates.length === 0) return;
  
  const timer = setTimeout(async () => {
    try {
      await updateThemePositions(pendingUpdates);
      setPendingUpdates([]);
    } catch (error) {
      console.error('更新に失敗しました:', error);
    }
  }, 500); // 500ms待機してから更新
  
  return () => clearTimeout(timer);
}, [pendingUpdates]);
```

#### 追加対策
- バッチ更新のサイズ制限（例: 100件ずつ）
- インデックスの追加（`position`カラムにインデックス）

### 5. 既存コードへの影響

#### リスク
- `themes`配列の順序に依存している既存コードが壊れる可能性
- `filteredThemes`の順序が変更されることで、グラフの表示が変わる

#### 影響範囲
- **中**: 既存機能への影響

#### 対策
```typescript
// すべてのテーマ取得箇所でpositionでソート
// 1. getThemes()の戻り値をpositionでソート（バックエンドで実装）
// 2. フロントエンドでも念のためソート

const filteredThemes = useMemo(() => {
  let result = filteredThemeIds.size === 0 
    ? themes 
    : themes.filter(theme => filteredThemeIds.has(theme.id));
  
  // positionでソート（positionがnullの場合は最後に）
  result = [...result].sort((a, b) => {
    const posA = a.position ?? 999999;
    const posB = b.position ?? 999999;
    if (posA !== posB) return posA - posB;
    // positionが同じ場合は既存のソート順を使用
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA; // DESC
    return (a.title || '').localeCompare(b.title || ''); // ASC
  });
  
  return result;
}, [themes, filteredThemeIds]);
```

#### 追加対策
- 既存コードの影響範囲を調査
- 段階的なロールアウト（フラグで有効/無効を切り替え）

### 6. UI/UXの問題

#### リスク
- ドラッグ&ドロップがモバイルデバイスで動作しない
- ドラッグ中に他の操作（編集・削除）ができない
- ドラッグハンドルが見つけにくい

#### 影響範囲
- **中**: ユーザー体験に影響

#### 対策
```typescript
// モバイル対応: タッチイベントの最適化
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px移動してからドラッグ開始
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

// ドラッグハンドルの視認性向上
<div
  {...attributes}
  {...listeners}
  style={{
    cursor: 'grab',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    borderRadius: '4px',
    // ホバー時の視覚的フィードバック
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#E5E7EB';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#F3F4F6';
  }}
>
```

#### 追加対策
- モバイル用の代替UI（上下矢印ボタン）
- ドラッグ中の視覚的フィードバック強化
- アクセシビリティ対応（キーボード操作）

## 🟢 低リスク項目

### 7. 後方互換性

#### リスク
- `position`が`NULL`のテーマが正しく処理されない
- 古いバージョンのアプリで`position`が認識されない

#### 影響範囲
- **低**: 既存データへの影響は限定的

#### 対策
```rust
// SQLクエリでNULLを考慮
ORDER BY COALESCE(position, 999999) ASC, createdAt DESC, title ASC
```

```typescript
// TypeScript側でもNULLを考慮
const posA = a.position ?? 999999;
const posB = b.position ?? 999999;
```

### 8. エラーハンドリング

#### リスク
- ネットワークエラー時に順序が元に戻らない
- エラーメッセージが不明確

#### 影響範囲
- **低**: ユーザー体験に軽微な影響

#### 対策
```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  // ...
  
  try {
    await updateThemePositions(updates);
    await refreshThemes();
  } catch (error) {
    console.error('テーマ順序の更新に失敗しました:', error);
    
    // エラーメッセージを表示
    alert('テーマ順序の更新に失敗しました。ページをリロードしてください。');
    
    // 元の順序に戻す
    setOrderedThemes(orderedThemes);
    
    // テーマリストを再読み込み
    await refreshThemes();
  }
};
```

## 📋 実装時のチェックリスト

### データベース
- [ ] マイグレーション処理がトランザクション内で実行される
- [ ] マイグレーション失敗時のロールバック処理
- [ ] 既存データの`position`初期化が正しく動作する
- [ ] `position`カラムにインデックスを追加（パフォーマンス向上）

### バックエンド
- [ ] `Theme`構造体に`position`フィールドが追加されている
- [ ] `get_all_themes()`が`position`でソートしている
- [ ] `save_theme()`が`position`を保存している
- [ ] `update_theme_positions()`がトランザクション内で実行される
- [ ] エラーハンドリングが適切に実装されている

### フロントエンド
- [ ] `Theme`インターフェースに`position`が追加されている
- [ ] `updateThemePositions()`関数が実装されている
- [ ] ドラッグ&ドロップ機能が正しく動作する
- [ ] エラー時に元の順序に戻る
- [ ] モバイルデバイスで動作する
- [ ] アクセシビリティ対応（キーボード操作）

### テスト
- [ ] 既存データのマイグレーションが正常に動作する
- [ ] ドラッグ&ドロップで順序が変更できる
- [ ] 順序変更後、ダッシュボードと分析ページで同じ順序が表示される
- [ ] エラー時に元の順序に戻る
- [ ] `position`が`NULL`のテーマが正しく処理される
- [ ] 同時更新時の競合が適切に処理される
- [ ] パフォーマンステスト（大量のテーマでの動作確認）

## 🚨 緊急時の対応

### マイグレーション失敗時
1. アプリケーションを停止
2. データベースバックアップから復元
3. マイグレーション処理を修正
4. 再度マイグレーションを実行

### データ不整合が発生した場合
1. `position`値を手動で正規化するSQLを実行
2. または、アプリケーションに正規化機能を追加して実行

### パフォーマンス問題が発生した場合
1. `position`カラムにインデックスを追加
2. バッチ更新のサイズを制限
3. デバウンス処理を追加

## 📝 追加の推奨事項

### 1. 監視とログ
- マイグレーション実行時のログ記録
- 順序更新の頻度とパフォーマンスの監視
- エラー発生時のアラート

### 2. ドキュメント
- テーマ順序変更機能の使い方をユーザー向けにドキュメント化
- 開発者向けに実装詳細をドキュメント化

### 3. 段階的ロールアウト
- 機能フラグで有効/無効を切り替え可能にする
- ベータテスターに先行リリース
- 問題がなければ全ユーザーに展開
