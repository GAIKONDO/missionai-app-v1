# 分析ページのログ最適化対策

## 現状分析

分析ページ（`app/analytics/page.tsx`）には**75個のconsole.log/warn/error**があります。

## パフォーマンス影響の分類

### 🔴 高影響（即座に対応が必要）

#### 1. **useMemo内のログ（再レンダリング時に実行）**
- **623行目**: `useMemo`実行時のログ
  - 依存配列が変更されるたびに実行される
  - オブジェクトの作成とログ出力が発生
- **657行目**: 表示するテーマ数のログ
- **691行目**: **ループ内のログ**（`themesToShow.forEach`内）
  - テーマ数分だけ実行される
  - テーマが15件ある場合、15回実行される
- **804行目**: 注力施策に紐づけられたトピックのログ（大きなオブジェクト）
  - `topics.map()`と`topics.slice()`を使用
  - 大きなデータ構造のログ出力

#### 2. **イベントハンドラー内のログ（文字列操作）**
- **436行目**: ドラッグ&ドロップ時のログ
  - `updates.map().join()`を使用
  - テーマ数分の文字列操作
- **442行目**: 再取得時のログ
  - `refreshedThemes.map().join()`を使用
- **449行目**: ソート後のログ
  - `sorted.map().join()`を使用

#### 3. **useEffect内のログ（初回レンダリング時）**
- **530行目**: テーマ一覧のログ
  - `themesData.map()`を使用
  - 初回レンダリング時に実行される

### 🟡 中影響（開発時のみ無効化）

#### 4. **デバッグ用のログ（開発時のみ必要）**
- **952-1097行目**: `checkArielTopics`関数内の大量のログ
  - 開発時のデバッグ用
  - 本番環境では不要

### 🟢 低影響（エラーログは残す）

#### 5. **エラーログ**
- `console.error`はエラー処理に必要
- パフォーマンスへの影響は小さい

## 対策案

### 対策1: 開発環境でのみログを有効化

```typescript
// 開発環境でのみログを有効化するヘルパー関数
const isDev = process.env.NODE_ENV === 'development';

const devLog = (...args: any[]) => {
  if (isDev) {
    console.log(...args);
  }
};

const devWarn = (...args: any[]) => {
  if (isDev) {
    console.warn(...args);
  }
};
```

### 対策2: ループ内のログを削除または条件付きに

```typescript
// 691行目: ループ内のログを削除または条件付きに
themesToShow.forEach((theme) => {
  // 削除または条件付きに
  // if (isDev) console.log(`🔍 [2D関係性図] テーマ「${theme.title}」の関連する注力施策:`, relatedInitiatives.length, '件');
  
  // ... 処理
});
```

### 対策3: 大きなデータ構造のログを簡略化

```typescript
// 804行目: 大きなオブジェクトのログを簡略化
if (isDev && parsedTopicIds.length > 0) {
  console.log('🔍 [2D関係性図] 注力施策に紐づけられたトピック:', {
    initiativeId: initiative.id,
    initiativeTitle: initiative.title,
    topicIdsCount: parsedTopicIds.length, // 配列全体ではなく件数のみ
    // 大きな配列のログを削除
  });
}
```

### 対策4: useMemo内のログを削除または条件付きに

```typescript
// 623行目: useMemo内のログを削除または条件付きに
const { nodes, links } = useMemo(() => {
  // 削除または条件付きに
  // if (isDev) console.log('🔍 [2D関係性図] useMemo実行:', { ... });
  
  // ... 処理
}, [selectedThemeId, orgData, themes, initiatives, topics]);
```

### 対策5: イベントハンドラー内のログを簡略化

```typescript
// 436行目: 文字列操作を簡略化
if (isDev) {
  console.log('🔄 [handleDragEnd] 送信するupdates:', updates.length, '件');
  // 全データの文字列化を削除
}
```

## 実装優先順位

1. **最優先**: useMemo内のループ内ログ（691行目）を削除
2. **高優先**: useMemo内のログ（623行目、657行目）を条件付きに
3. **中優先**: 大きなデータ構造のログ（804行目、530行目）を簡略化
4. **低優先**: イベントハンドラー内のログ（436行目、442行目、449行目）を簡略化
5. **任意**: デバッグ用のログ（952-1097行目）を開発時のみ有効化

## 期待される効果

- **useMemoの再計算時間**: 10-30%削減（ループ内ログ削除により）
- **メモリ使用量**: 5-10%削減（大きなデータ構造のログ削除により）
- **レンダリング時間**: 5-15%削減（ログ出力のオーバーヘッド削減により）

## 注意事項

- エラーログ（`console.error`）は残す
- 開発時のデバッグに必要なログは条件付きで残す
- 本番環境でのパフォーマンスを優先する
