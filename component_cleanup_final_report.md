# コンポーネント整理 - 最終レポート

## 確認方法
- `app/`ディレクトリからのインポートを確認
- `lib/`ディレクトリからのインポートを確認
- `components/`内での相互参照を確認
- 動的インポート（`dynamic()`）の使用を確認
- JSXでの使用（`<ComponentName`）を確認

## ✅ 使用されているコンポーネント（保持）

以下のコンポーネントは実際に使用されているため、**保持**します：

1. **AIAssistantPanel** - Layout.tsxで使用
2. **CauseEffectDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
3. **CompanyChart** - lib/buildCompanyHierarchy.tsで型定義として使用
4. **ConceptForm** - lib/conceptCopy.tsで使用
5. **ConceptSubMenu** - 複数箇所で使用（SUB_MENU_ITEMS）
6. **ContainerEditModal** - 使用確認必要
7. **EmbeddingRegenerationContext** - 複数箇所で使用
8. **ErrorBoundary** - app/layout.tsxで使用
9. **Header** - Layout.tsxで使用
10. **Icons** - 複数箇所で使用
11. **InitiativeCauseEffectDiagram** - app/organization/initiative/page.tsxで使用
12. **InitiativeList** - app/a2c100/page.tsxで使用
13. **KeyVisualPDFMetadataEditor** - components/pages/component-test/test-concept/Page0.tsxで使用
14. **KnowledgeGraph2D** - app/rag-search/page.tsxとcomponents/RelationshipDiagram2D.tsxで使用
15. **KnowledgeGraph3D** - app/knowledge-graph/page.tsxで使用
16. **Layout** - 複数のページで使用
17. **Login** - Layout.tsxで使用
18. **MermaidLoader** - app/organization/initiative/page.tsxで使用
19. **MonetizationDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
20. **OrgBubbleChart** - app/organization/views/BubbleView.tsxで使用
21. **OrgChart** - 複数箇所で使用（型定義含む）
22. **PresentationModeContext** - 複数箇所で使用
23. **QueryProvider** - app/layout.tsxで使用
24. **RelationDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
25. **RelationshipBubbleChart** - app/analytics/page.tsxで使用
26. **RelationshipDiagram2D** - app/analytics/page.tsxで使用
27. **Sidebar** - Layout.tsxで使用
28. **TabBar** - Layout.tsxで使用
29. **TabProvider** - Layout.tsxで使用
30. **TauriTestHelper** - app/layout.tsxで使用
31. **TestOrgDataHelper** - app/layout.tsxで使用
32. **ThemeHierarchyChart** - app/a2c100/page.tsxで使用
33. **ThemeHierarchyEditor** - app/a2c100/page.tsxで使用
34. **ThreeScene** - MarkdownRenderer.tsxで動的インポート
35. **TypographyArt** - MarkdownRenderer.tsxで動的インポート
36. **UrlBar** - Layout.tsxで使用
37. **VegaChart** - MarkdownRenderer.tsxで動的インポート

## ❌ 削除候補（23個）

以下のコンポーネントは、`app/`や`lib/`から使用されていないため、**削除候補**です：

### チャート・グラフ系（10個）
1. **AlluvialDiagram** - 未使用
2. **AlluvialDiagram3D** - 未使用
3. **BubbleChart** - 未使用
4. **CompanyBubbleChart** - 未使用
5. **EcosystemAlluvialDiagram** - 未使用
6. **ForceDirectedGraph** - 未使用
7. **ForceDirectedGraph3D** - 未使用
8. **KeywordPageRelationGraph** - 未使用
9. **PopulationPyramid** - 未使用
10. **ScatterBubbleChart** - 未使用

### 事業計画関連（5個）
11. **BusinessPlanCard** - 未使用（BusinessPlanFormから型定義をインポートしているが、コンポーネント自体は未使用）
12. **BusinessPlanForm** - 未使用（BusinessPlanCardから型定義をインポートしているが、コンポーネント自体は未使用）
13. **BusinessProjectForm** - 未使用
14. **BusinessRadialBar** - 未使用
15. **BusinessSunburst** - 未使用

### その他（8個）
16. **CauseEffectDiagram** - 未使用（CauseEffectDiagramUpdateModalは使用されている）
17. **ChaosMap** - 未使用
18. **CompanyPlanSubMenu** - 未使用
19. **ContainerCodeEditorModal** - 未使用
20. **MarkdownRenderer** - 未使用（ただし、ThreeScene、TypographyArt、VegaChartを動的インポートしている）
21. **NewTabPage** - 未使用（Layout.tsxでisNewTabPageという変数名で使用されているが、コンポーネント自体は未使用）
22. **OpenInCursorButton** - 未使用
23. **PageBreakEditor** - 未使用

## ⚠️ 注意事項

### 1. MarkdownRendererについて
- MarkdownRenderer自体は使用されていない
- ただし、ThreeScene、TypographyArt、VegaChartを動的インポートしている
- これらのコンポーネントがMarkdownRenderer経由でのみ使用されている場合は、MarkdownRendererも保持が必要

### 2. BusinessPlanCard/BusinessPlanFormについて
- 相互に型定義をインポートしている
- コンポーネント自体は使用されていないが、型定義として使用されている可能性がある
- 型定義のみを別ファイルに抽出することを検討

### 3. NewTabPageについて
- Layout.tsxで`isNewTabPage`という変数名で使用されているが、コンポーネント自体は使用されていない
- `/newtab`パスで何か特別な処理が必要な場合は確認が必要

## 推奨アクション

### フェーズ1: 安全に削除できるコンポーネント（15個）
以下のコンポーネントは、他のコンポーネントから参照されていないため、安全に削除できます：

1. AlluvialDiagram
2. AlluvialDiagram3D
3. BubbleChart
4. CompanyBubbleChart
5. EcosystemAlluvialDiagram
6. ForceDirectedGraph
7. ForceDirectedGraph3D
8. KeywordPageRelationGraph
9. PopulationPyramid
10. ScatterBubbleChart
11. CauseEffectDiagram
12. ChaosMap
13. ContainerCodeEditorModal
14. OpenInCursorButton
15. PageBreakEditor

### フェーズ2: 要確認コンポーネント（8個）
以下のコンポーネントは、詳細な確認が必要です：

1. **BusinessPlanCard** - 型定義の使用を確認
2. **BusinessPlanForm** - 型定義の使用を確認
3. **BusinessProjectForm** - 使用確認
4. **BusinessRadialBar** - 使用確認
5. **BusinessSunburst** - 使用確認
6. **CompanyPlanSubMenu** - 使用確認
7. **MarkdownRenderer** - ThreeScene、TypographyArt、VegaChartとの関係を確認
8. **NewTabPage** - `/newtab`パスの処理を確認

## 削除による影響

- **削除可能な行数**: 約15-23個のコンポーネントファイル
- **削減されるコード量**: 各コンポーネントのサイズによる（推定: 数千行〜数万行）
