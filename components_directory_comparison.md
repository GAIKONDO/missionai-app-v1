# コンポーネントディレクトリの違い

## 📁 ディレクトリ構造

### 1. `/components` (プロジェクトルート)
**場所**: `/Users/gaikondo/Desktop/test-app/app40_MissionAI/components/`

**目的**: **グローバルに使用される共有コンポーネント**

**特徴**:
- プロジェクト全体で再利用可能なコンポーネント
- 複数のページや機能で使用される
- `@/components/` でインポート

**含まれるコンポーネント例**:
- `Layout.tsx` - 全ページの基本レイアウト
- `Header.tsx` - ヘッダー
- `Sidebar.tsx` - サイドバー
- `KnowledgeGraph2D.tsx` - ナレッジグラフ（複数ページで使用）
- `OrgChart.tsx` - 組織図（複数ページで使用）
- `AIAssistantPanel.tsx` - AIアシスタントパネル
- `ErrorBoundary.tsx` - エラーバウンダリ
- など35個のコンポーネント

**インポート例**:
```typescript
import Layout from '@/components/Layout';
import KnowledgeGraph3D from '@/components/KnowledgeGraph3D';
```

---

### 2. `/app/organization/components` (組織ページ専用)
**場所**: `/Users/gaikondo/Desktop/test-app/app40_MissionAI/app/organization/components/`

**目的**: **組織ページ（`/organization`）専用のコンポーネント**

**特徴**:
- 組織ページでのみ使用される
- 組織管理機能に特化したコンポーネント
- 相対パスでインポート（`./components/`）

**含まれるコンポーネント**:
- `SelectedOrganizationPanel.tsx` - 選択された組織のパネル
- `FinderColumnView.tsx` - Finder風のカラムビュー
- `tabs/OrganizationInfoTab.tsx` - 組織情報タブ
- `tabs/MembersTab.tsx` - メンバータブ
- `tabs/MemberEditForm.tsx` - メンバー編集フォーム
- `modals/OrganizationEditModal.tsx` - 組織編集モーダル
- `modals/AddOrganizationModal.tsx` - 組織追加モーダル
- `modals/DeleteOrganizationModal.tsx` - 組織削除モーダル

**インポート例**:
```typescript
// app/organization/page.tsx から
import SelectedOrganizationPanel from './components/SelectedOrganizationPanel';
import OrganizationEditModal from './components/modals/OrganizationEditModal';
```

---

## 🔍 主な違い

| 項目 | `/components` | `/app/organization/components` |
|------|-------------|--------------------------------|
| **スコープ** | グローバル（全プロジェクト） | ローカル（組織ページのみ） |
| **再利用性** | 高い（複数ページで使用） | 低い（特定ページ専用） |
| **インポート方法** | `@/components/...` | `./components/...` |
| **目的** | 共通UIコンポーネント | ページ固有の機能コンポーネント |
| **例** | Layout, Header, Sidebar | SelectedOrganizationPanel, OrganizationEditModal |

---

## 📝 注意点

### ❌ `app/components` は存在しない
- `app/` ディレクトリ直下に `components/` ディレクトリは**存在しません**
- 存在するのは `app/organization/components/` のみ（組織ページ専用）

### ✅ Next.js App Router のベストプラクティス
- **共有コンポーネント**: `/components` に配置
- **ページ固有コンポーネント**: `/app/[page]/components/` に配置
- このプロジェクトはこのパターンに従っています

---

## 🎯 まとめ

1. **`/components`**: プロジェクト全体で使用される共有コンポーネント（35個）
2. **`/app/organization/components`**: 組織ページ専用のコンポーネント（8個）
3. **`app/components`**: 存在しない

現在の構造は適切で、Next.js App Routerのベストプラクティスに従っています。
