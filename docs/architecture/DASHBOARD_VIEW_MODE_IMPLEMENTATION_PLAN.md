# ダッシュボード表示モード実装計画

## 概要

ダッシュボード画面に「組織」と「事業会社」の選択ボタンを追加し、それぞれのモードでダッシュボードを確認できるようにする。

## 現在の実装状況

### 現在のダッシュボード（`app/page.tsx`）

- **データソース**: 組織ツリー（`getOrgTreeFromDb()`）
- **施策データ**: 組織の注力施策（`getFocusInitiatives(organizationId)`）
- **表示方法**: 階層レベルごとに組織をグループ化し、テーマ×組織で施策件数を集計

### データ構造の違い

#### 組織（Organization）
- `OrgNodeData`: 階層構造を持つ組織ツリー
- `FocusInitiative`: `organizationId` を持つ注力施策
- `themeId` / `themeIds`: テーマとの関連

#### 事業会社（Company）
- `Company`: フラットなリスト（`getAllCompanies()` で取得）
  - `organizationId`: 事業会社に紐づけられている組織ID
- `CompanyFocusInitiative`: `companyId` を持つ注力施策
- `themeIds`: テーマとの関連（配列形式）

**重要**: 事業会社は組織に紐づいているため、組織の階層レベルを使って階層レベルを判定できる。

## 実装手順

### 1. 状態管理の追加

#### 1.1 表示モードの型定義を追加

```typescript
type DashboardViewMode = 'organization' | 'company';
```

#### 1.2 State の追加

```typescript
const [viewMode, setViewMode] = useState<DashboardViewMode>('organization');
const [companies, setCompanies] = useState<Company[]>([]);
const [companyInitiatives, setCompanyInitiatives] = useState<CompanyFocusInitiative[]>([]);
const [companyHierarchyLevels, setCompanyHierarchyLevels] = useState<HierarchyLevel[]>([]);
const [filteredCompanyIds, setFilteredCompanyIds] = useState<Set<string>>(new Set());
```

**注意**: 
- `companyHierarchyLevels`: 事業会社を組織の階層レベルでグループ化したデータ
- `filteredCompanyIds`: 事業会社名でのフィルター用

### 2. UI コンポーネントの追加

#### 2.1 表示モード選択ボタンの追加

**配置場所**: 階層レベル選択の左側（`app/page.tsx` の560-693行目の上）

**実装内容**:
- 「組織」と「事業会社」の2つのボタンを横並びに配置
- 選択中のボタンはハイライト表示
- ボタンクリックで `viewMode` を切り替え
- モード切り替え時に、フィルター状態をリセット（または保持するかは要件による）

**スタイル**:
- 既存の階層レベル選択ボタンと同じスタイル
- アクティブ状態: `#4262FF` の背景色とボーダー
- 非アクティブ状態: 白背景とグレーのボーダー

**フィルターボタンのバッジ表示**:
- 組織モード: `filteredOrgIds.size + filteredThemeIds.size`
- 事業会社モード: `filteredOrgIds.size + filteredCompanyIds.size + filteredThemeIds.size`

### 3. データ取得ロジックの追加

#### 3.1 事業会社データの取得

`useEffect` 内で `viewMode === 'company'` の場合に以下を実行:

```typescript
// 組織ツリーを取得（階層レベル判定に必要）
const orgTreeData = await getOrgTreeFromDb();

// 事業会社一覧を取得
const allCompanies = await getAllCompanies();
setCompanies(allCompanies);

// 各事業会社の注力施策を取得
const initiativePromises = allCompanies.map(company => 
  getCompanyFocusInitiatives(company.id)
);
const initiativeResults = await Promise.allSettled(initiativePromises);
const allCompanyInitiatives: CompanyFocusInitiative[] = [];
initiativeResults.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    allCompanyInitiatives.push(...result.value);
  }
});
setCompanyInitiatives(allCompanyInitiatives);

// 事業会社を組織の階層レベルでグループ化
const companyLevels = extractCompaniesByOrganizationDepth(orgTreeData, allCompanies);
setCompanyHierarchyLevels(companyLevels);
```

#### 3.2 事業会社の階層レベル抽出関数

```typescript
/**
 * 事業会社を組織の階層レベルごとにグループ化
 */
function extractCompaniesByOrganizationDepth(
  orgTree: OrgNodeData | null,
  companies: Company[]
): HierarchyLevel[] {
  if (!orgTree) return [];

  // 組織IDから階層レベル（depth）を取得する関数
  function getOrgDepth(orgId: string, node: OrgNodeData, depth: number): number | null {
    if (node.id === orgId) return depth;
    if (node.children) {
      for (const child of node.children) {
        const result = getOrgDepth(orgId, child, depth + 1);
        if (result !== null) return result;
      }
    }
    return null;
  }

  // 事業会社を階層レベルごとにグループ化
  const companiesByDepth = new Map<number, Array<{ company: Company; orgDepth: number }>>();

  companies.forEach(company => {
    const orgDepth = getOrgDepth(company.organizationId, orgTree, 0);
    if (orgDepth === null) return; // 組織が見つからない場合はスキップ

    if (!companiesByDepth.has(orgDepth)) {
      companiesByDepth.set(orgDepth, []);
    }
    companiesByDepth.get(orgDepth)!.push({ company, orgDepth });
  });

  // Mapを配列に変換してソート
  return Array.from(companiesByDepth.entries())
    .map(([level, items]) => ({
      level,
      orgs: items.map(item => ({
        id: item.company.id,
        name: item.company.name,
        depth: item.orgDepth,
        path: [], // 必要に応じて組織のパスを設定
      })),
    }))
    .sort((a, b) => a.level - b.level);
}
```

#### 3.2 データ取得の条件分岐

`viewMode` に応じて、組織データまたは事業会社データを取得するように `useEffect` を修正。

### 4. データ集計ロジックの修正

#### 4.1 選択されたエンティティの取得

**組織モード**:
- 既存の `selectedLevelOrgs` を使用

**事業会社モード**:
- 選択された階層レベルの事業会社を取得
- 組織の階層レベルに基づいて事業会社をフィルタリング

```typescript
// 選択された階層レベルの事業会社を取得
const selectedLevelCompanies = useMemo(() => {
  if (viewMode !== 'company' || selectedLevel === null) return [];
  
  const levelData = companyHierarchyLevels.find(l => l.level === selectedLevel);
  const companiesAtLevel = levelData?.orgs || [];
  
  // フィルター適用
  let filtered = companiesAtLevel;
  
  // 組織フィルター（事業会社に紐づけられている組織でフィルター）
  if (filteredOrgIds.size > 0) {
    filtered = filtered.filter(company => {
      const companyData = companies.find(c => c.id === company.id);
      return companyData && filteredOrgIds.has(companyData.organizationId);
    });
  }
  
  // 事業会社名フィルター
  if (filteredCompanyIds.size > 0) {
    filtered = filtered.filter(company => filteredCompanyIds.has(company.id));
  }
  
  return filtered;
}, [viewMode, selectedLevel, companyHierarchyLevels, companies, filteredOrgIds, filteredCompanyIds]);
```

#### 4.2 施策件数の集計

**組織モード**（既存）:
```typescript
const chartData = useMemo(() => {
  // 既存のロジック
  filteredThemes.forEach(theme => {
    selectedLevelOrgs.forEach(org => {
      const orgIdsToInclude = orgIdsWithDescendants.get(org.id) || [org.id];
      const relatedInitiatives = initiatives.filter(init => {
        if (!orgIdsToInclude.includes(init.organizationId)) return false;
        if (init.themeId === theme.id) return true;
        if (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id)) return true;
        return false;
      });
      // ...
    });
  });
}, [filteredThemes, selectedLevelOrgs, initiatives, orgIdsWithDescendants]);
```

**事業会社モード**（新規）:
```typescript
const chartData = useMemo(() => {
  if (viewMode !== 'company') return [];
  if (filteredThemes.length === 0 || selectedLevelCompanies.length === 0) return [];

  const data: Array<{
    theme: string;
    themeId: string;
    company: string;
    companyId: string;
    count: number;
  }> = [];

  filteredThemes.forEach(theme => {
    selectedLevelCompanies.forEach(company => {
      const relatedInitiatives = companyInitiatives.filter(init => {
        if (init.companyId !== company.id) return false;
        if (Array.isArray(init.themeIds) && init.themeIds.includes(theme.id)) return true;
        return false;
      });

      data.push({
        theme: theme.title,
        themeId: theme.id,
        company: company.name,
        companyId: company.id,
        count: relatedInitiatives.length,
      });
    });
  });

  return data;
}, [filteredThemes, selectedLevelCompanies, companyInitiatives, viewMode]);
```

### 5. UI 表示の条件分岐

#### 5.1 階層レベル選択の表示制御

**組織モード**: 
- 階層レベル選択を表示
- 「レベル{level} ({orgs.length}組織)」と表示

**事業会社モード**: 
- 階層レベル選択を表示（組織の階層レベルに基づく）
- 「レベル{level} ({orgs.length}事業会社)」と表示
- 事業会社に紐づけられている組織の階層レベルでグループ化

#### 5.2 統計情報カードの更新

**組織モード**:
- 「組織数」カードを表示
- 選択された階層レベルの組織数を表示

**事業会社モード**:
- 「事業会社数」カードを表示
- 選択された階層レベルの事業会社数を表示
- フィルター適用後の事業会社数を表示

#### 5.3 グラフのタイトルと説明の更新

**組織モード**:
- 「階層レベル{selectedLevel}」と表示

**事業会社モード**:
- 「階層レベル{selectedLevel}（事業会社）」と表示
- 事業会社に紐づけられている組織の階層レベルを表示

#### 5.4 フィルターモーダルの更新

**組織モード**:
- 既存の組織フィルターを表示
- テーマフィルターを表示

**事業会社モード**:
- **組織フィルター**: 事業会社に紐づけられている組織でフィルタリング
  - 階層レベルごとに組織を表示
  - 選択された組織に紐づく事業会社のみを表示
- **事業会社名フィルター**: 事業会社名で直接フィルタリング
  - すべての事業会社をリスト表示
  - チェックボックスまたはボタンで選択
- **テーマフィルター**: 既存と同じ（共通）

**フィルターモーダルの実装例**:
```typescript
// 事業会社モードの場合
{viewMode === 'company' && (
  <>
    {/* 組織フィルター（事業会社に紐づけられている組織） */}
    <div style={{ marginBottom: '32px' }}>
      <label>組織でフィルター（事業会社に紐づけられている組織）</label>
      {hierarchyLevels.map(levelData => (
        <div key={levelData.level}>
          <div>レベル{levelData.level}</div>
          {levelData.orgs.map(org => {
            // この組織に紐づく事業会社が存在するかチェック
            const hasCompanies = companies.some(c => c.organizationId === org.id);
            if (!hasCompanies) return null;
            
            return (
              <button
                key={org.id}
                onClick={() => {
                  const newFilteredOrgIds = new Set(filteredOrgIds);
                  if (newFilteredOrgIds.has(org.id)) {
                    newFilteredOrgIds.delete(org.id);
                  } else {
                    newFilteredOrgIds.add(org.id);
                  }
                  setFilteredOrgIds(newFilteredOrgIds);
                }}
                style={{
                  backgroundColor: filteredOrgIds.has(org.id) ? '#F0F4FF' : '#FFFFFF',
                  border: filteredOrgIds.has(org.id) ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
                }}
              >
                {org.name}
              </button>
            );
          })}
        </div>
      ))}
    </div>

    {/* 事業会社名フィルター */}
    <div style={{ marginBottom: '32px' }}>
      <label>事業会社名でフィルター</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {companies.map(company => (
          <button
            key={company.id}
            onClick={() => {
              const newFilteredCompanyIds = new Set(filteredCompanyIds);
              if (newFilteredCompanyIds.has(company.id)) {
                newFilteredCompanyIds.delete(company.id);
              } else {
                newFilteredCompanyIds.add(company.id);
              }
              setFilteredCompanyIds(newFilteredCompanyIds);
            }}
            style={{
              backgroundColor: filteredCompanyIds.has(company.id) ? '#F0F4FF' : '#FFFFFF',
              border: filteredCompanyIds.has(company.id) ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
            }}
          >
            {company.name}
          </button>
        ))}
      </div>
    </div>
  </>
)}
```

#### 5.5 フィルターボタンとクリアボタンの実装

**フィルターボタンのバッジ表示とクリア機能**:

```typescript
// フィルターが適用されているかチェック
const hasActiveFilters = useMemo(() => {
  if (viewMode === 'organization') {
    return filteredOrgIds.size > 0 || filteredThemeIds.size > 0;
  } else {
    return filteredOrgIds.size > 0 || filteredCompanyIds.size > 0 || filteredThemeIds.size > 0;
  }
}, [viewMode, filteredOrgIds, filteredCompanyIds, filteredThemeIds]);

// フィルター数の計算
const filterCount = useMemo(() => {
  if (viewMode === 'organization') {
    return filteredOrgIds.size + filteredThemeIds.size;
  } else {
    return filteredOrgIds.size + filteredCompanyIds.size + filteredThemeIds.size;
  }
}, [viewMode, filteredOrgIds, filteredCompanyIds, filteredThemeIds]);

// フィルタークリア関数
const handleClearFilters = useCallback(() => {
  setFilteredOrgIds(new Set());
  setFilteredThemeIds(new Set());
  if (viewMode === 'company') {
    setFilteredCompanyIds(new Set());
  }
}, [viewMode]);

// フィルターボタン
<button
  type="button"
  onClick={() => setShowFilterModal(true)}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: hasActiveFilters ? '#4262FF' : '#6B7280',
    backgroundColor: hasActiveFilters ? '#F0F4FF' : '#FFFFFF',
    border: hasActiveFilters ? '2px solid #4262FF' : '1.5px solid #E0E0E0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 150ms',
  }}
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 4h12M4 8h8M6 12h4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
  フィルター
  {hasActiveFilters && (
    <span style={{
      backgroundColor: '#4262FF',
      color: '#FFFFFF',
      borderRadius: '10px',
      padding: '2px 6px',
      fontSize: '11px',
      fontWeight: '600',
      minWidth: '18px',
      textAlign: 'center',
    }}>
      {filterCount}
    </span>
  )}
</button>

// クリアボタン
{hasActiveFilters && (
  <button
    type="button"
    onClick={handleClearFilters}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#6B7280',
      backgroundColor: '#FFFFFF',
      border: '1.5px solid #E0E0E0',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 150ms',
    }}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M12 4L4 12M4 4l8 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
    クリア
  </button>
)}
```

### 6. 選択されたテーマの施策表示

#### 6.1 施策リストの取得

**組織モード**（既存）:
```typescript
const selectedThemeInitiatives = useMemo(() => {
  // 既存のロジック
}, [selectedThemeId, initiatives, orgIdsWithDescendants]);
```

**事業会社モード**（新規）:
```typescript
const selectedThemeCompanyInitiatives = useMemo(() => {
  if (!selectedThemeId || viewMode !== 'company') return [];
  
  return companyInitiatives.filter(init => {
    if (Array.isArray(init.themeIds) && init.themeIds.includes(selectedThemeId)) {
      return true;
    }
    return false;
  });
}, [selectedThemeId, companyInitiatives, viewMode]);
```

#### 6.2 施策カードの表示

**組織モード**:
- 既存の施策カードを表示
- 組織名を表示

**事業会社モード**:
- 事業会社名を表示
- クリック時は事業会社の注力施策詳細ページに遷移（`/companies/initiative?companyId=...&initiativeId=...`）

### 7. パフォーマンス最適化

#### 7.1 データ取得の最適化

- `viewMode` が変更されたときのみ、該当するデータを再取得
- **事業会社モードでも組織ツリーは取得が必要**（階層レベル判定のため）
- 組織モードでは事業会社データを取得しない
- 組織ツリーは両モードで共通利用可能（メモ化推奨）

#### 7.2 メモ化の活用

- `useMemo` でデータ集計をメモ化
- `viewMode` が変更されたときのみ再計算

### 8. エラーハンドリング

#### 8.1 データ取得エラー

- 事業会社データの取得に失敗した場合のエラーメッセージ表示
- フォールバック処理（組織モードに戻すなど）

#### 8.2 空データの処理

- 事業会社が0件の場合のメッセージ表示
- 施策が0件の場合のメッセージ表示

## ファイル変更箇所

### 主要な変更ファイル

1. **`app/page.tsx`**
   - 表示モード選択ボタンの追加
   - 事業会社データ取得ロジックの追加
   - データ集計ロジックの条件分岐
   - UI 表示の条件分岐

2. **`lib/companiesApi.ts`**（変更なし）
   - 既存の `getAllCompanies()` と `getCompanyFocusInitiatives()` を使用

### インポートの追加

```typescript
import { getAllCompanies, getCompanyFocusInitiatives, type Company, type CompanyFocusInitiative } from '@/lib/companiesApi';
```

## 実装の優先順位

1. **Phase 1: 基本機能**
   - 表示モード選択ボタンの追加
   - 事業会社データの取得
   - 組織ツリーの取得（階層レベル判定用）
   - 事業会社の階層レベル抽出関数の実装
   - 基本的なデータ集計とグラフ表示
   - 階層レベル選択の表示（事業会社モードでも）

2. **Phase 2: フィルター機能**
   - フィルターモーダルの事業会社対応
   - 組織フィルター（事業会社に紐づけられている組織）
   - 事業会社名フィルター
   - フィルターボタンのバッジ表示更新
   - フィルタークリア機能の実装

3. **Phase 3: UI 改善**
   - 統計情報カードの更新
   - 施策カードの表示改善
   - グラフのタイトルと説明の更新

4. **Phase 4: 最適化**
   - パフォーマンス最適化
   - エラーハンドリングの強化
   - ユーザビリティの向上
   - 組織が見つからない事業会社の処理

## 注意事項

1. **データの一貫性**
   - 組織と事業会社の施策は別々のデータソース
   - テーマは共通で使用可能
   - 事業会社は組織に紐づいているため、組織ツリーが必要

2. **階層レベルの判定**
   - 事業会社の階層レベルは、紐づけられている組織の階層レベルで判定
   - 組織ツリーから該当組織を検索し、その depth を取得
   - 組織が見つからない事業会社は除外するか、特別な処理を検討

3. **フィルターの動作**
   - **組織フィルター**: 選択された組織に紐づく事業会社のみを表示
   - **事業会社名フィルター**: 選択された事業会社のみを表示
   - 両方のフィルターが設定されている場合は、**AND条件**で絞り込み
   - フィルターが設定されていない場合は、選択された階層レベルのすべての事業会社を表示

4. **URL パラメータ**
   - 必要に応じて、`?mode=organization` や `?mode=company` でモードを保持

5. **デフォルトモード**
   - 初回表示時は「組織」モードをデフォルトとする

6. **既存機能への影響**
   - 組織モードの既存機能は変更しない
   - 後方互換性を維持

## テスト項目

1. **表示モード切り替え**
   - 組織モードと事業会社モードの切り替えが正常に動作するか
   - データが正しく再取得されるか

2. **データ表示**
   - 事業会社モードで正しいデータが表示されるか
   - グラフが正しく描画されるか

3. **フィルター機能**
   - 事業会社モードで組織フィルターが正常に動作するか
   - 事業会社モードで事業会社名フィルターが正常に動作するか
   - 両方のフィルターを同時に適用した場合の動作確認
   - フィルタークリア機能の動作確認

4. **階層レベル判定**
   - 事業会社に紐づけられている組織の階層レベルが正しく判定されるか
   - 組織が見つからない事業会社の処理が適切か

5. **パフォーマンス**
   - モード切り替え時のパフォーマンス
   - 大量データでの動作確認

## 実装のまとめ

### 重要なポイント

1. **階層レベルの判定方法**
   - 事業会社は `organizationId` で組織に紐づいている
   - 組織ツリーから該当組織を検索し、その `depth` を取得
   - 階層レベルごとに事業会社をグループ化

2. **フィルターの実装**
   - **組織フィルター**: 事業会社に紐づけられている組織でフィルタリング
   - **事業会社名フィルター**: 事業会社名で直接フィルタリング
   - 両方のフィルターは **AND条件** で動作
   - フィルターボタンのバッジには両方のフィルター数を合計して表示

3. **データ取得の最適化**
   - 事業会社モードでも組織ツリーは必要（階層レベル判定のため）
   - 組織ツリーは両モードで共通利用可能
   - メモ化を活用してパフォーマンスを最適化

4. **UI の一貫性**
   - 組織モードと事業会社モードで同じUIパターンを使用
   - 階層レベル選択は両モードで表示
   - フィルターモーダルはモードに応じて内容を変更

### 実装時の注意点

- 組織が見つからない事業会社の処理を適切に行う
- フィルターの状態管理を適切に行う（`filteredOrgIds`, `filteredCompanyIds`, `filteredThemeIds`）
- モード切り替え時にフィルター状態をリセットするか保持するかを決定
- パフォーマンスを考慮し、不要な再レンダリングを避ける
