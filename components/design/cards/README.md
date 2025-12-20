# カードコンポーネントの使い方

このディレクトリには、デザインページで表示するカードコンポーネントを配置します。

## カードの追加方法

### 1. 新しいカードコンポーネントを作成

`components/design/cards/` ディレクトリに新しいTSXファイルを作成します。

例: `MyCard.tsx`

```tsx
import React from 'react';
import { DesignCard, DesignCardProps } from './DesignCard';

export function MyCard(props: DesignCardProps) {
  return (
    <DesignCard {...props}>
      {/* カードの内容をここに追加 */}
      <div style={{ marginTop: '16px' }}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>
          カスタムコンテンツ
        </p>
      </div>
    </DesignCard>
  );
}
```

### 2. index.tsにカードを登録

`components/design/cards/index.ts` を編集して、新しいカードを登録します。

```ts
import { MyCard } from './MyCard';

export const cardComponents: CardComponent[] = [
  { 
    id: 'my-card', 
    title: 'マイカード', 
    description: 'カードの説明', 
    component: MyCard 
  },
];
```

### 3. カードの動作

- カードをクリックすると、アクティブ状態が切り替わります
- アクティブなカードはハイライト表示されます
- ホバー時に視覚的なフィードバックが表示されます

## DesignCardProps

カードコンポーネントは以下のpropsを受け取ります：

- `id`: カードの一意のID
- `title`: カードのタイトル
- `description`: カードの説明（オプション）
- `isActive`: アクティブ状態（オプション）
- `onClick`: クリック時のハンドラー（オプション）
- `children`: カード内に表示するコンテンツ（オプション）

## 例

`ExampleCard.tsx` を参考にしてください。
