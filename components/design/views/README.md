# ビューコンポーネントの使い方

このディレクトリには、デザインページの各タブで表示するビューコンポーネントを配置します。

## ビューコンポーネント

### DesignDocSearchView

検索タブで表示される検索画面のコンポーネントです。

**ファイル**: `DesignDocSearchView.tsx`

**使い方**:
```tsx
import { DesignDocSearchView } from '@/components/design/views/DesignDocSearchView';

<DesignDocSearchView />
```

### DesignDocAIView

AIで質問タブで表示されるAI質問画面のコンポーネントです。

**ファイル**: `DesignDocAIView.tsx`

**使い方**:
```tsx
import { DesignDocAIView } from '@/components/design/views/DesignDocAIView';

<DesignDocAIView />
```

## 新しいビューコンポーネントの追加

1. `components/design/views/` ディレクトリに新しいTSXファイルを作成
2. コンポーネントを実装
3. `components/design/views/index.ts` にエクスポートを追加
4. `app/design/page.tsx` でインポートして使用

## 注意事項

- 各ビューコンポーネントは独立して動作するように設計してください
- 必要に応じてpropsで親コンポーネントから状態を受け取ることができます
- スタイルはインラインスタイルまたはCSS変数を使用してください
