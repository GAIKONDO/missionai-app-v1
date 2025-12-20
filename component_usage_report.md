# コンポーネント使用状況レポート

## 確認方法
各コンポーネントについて、以下を確認：
1. `import`文での使用
2. JSXでの使用（`<ComponentName`）
3. 型定義としての使用（`type`や`interface`）

## 使用されているコンポーネント（確認済み）

以下は実際に使用されていることが確認できたコンポーネント：

- **AIAssistantPanel** - Layout.tsxで使用
- **AlluvialDiagram** - 使用確認必要
- **AlluvialDiagram3D** - 使用確認必要
- **BubbleChart** - 使用確認必要
- **BusinessPlanCard** - 使用確認必要
- **BusinessPlanForm** - 使用確認必要
- **BusinessProjectForm** - 使用確認必要
- **BusinessRadialBar** - 使用確認必要
- **BusinessSunburst** - 使用確認必要
- **CauseEffectDiagram** - 使用確認必要
- **CauseEffectDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
- **ChaosMap** - 使用確認必要
- **CompanyBubbleChart** - 使用確認必要
- **CompanyChart** - lib/buildCompanyHierarchy.tsで型定義として使用
- **CompanyPlanSubMenu** - 使用確認必要
- **ConceptForm** - lib/conceptCopy.tsで使用
- **ConceptSubMenu** - 複数箇所で使用（SUB_MENU_ITEMS）
- **ContainerCodeEditorModal** - 使用確認必要
- **ContainerEditModal** - 使用確認必要
- **EcosystemAlluvialDiagram** - 使用確認必要
- **EmbeddingRegenerationContext** - 複数箇所で使用
- **ErrorBoundary** - app/layout.tsxで使用
- **ForceDirectedGraph** - 使用確認必要
- **ForceDirectedGraph3D** - 使用確認必要
- **Header** - Layout.tsxで使用
- **Icons** - 複数箇所で使用
- **InitiativeCauseEffectDiagram** - app/organization/initiative/page.tsxで使用
- **InitiativeList** - app/a2c100/page.tsxで使用
- **KeyVisualPDFMetadataEditor** - components/pages/component-test/test-concept/Page0.tsxで使用
- **KeywordPageRelationGraph** - 使用確認必要
- **KnowledgeGraph2D** - app/rag-search/page.tsxとcomponents/RelationshipDiagram2D.tsxで使用
- **KnowledgeGraph3D** - app/knowledge-graph/page.tsxで使用
- **Layout** - 複数のページで使用
- **Login** - Layout.tsxで使用
- **MarkdownRenderer** - 使用確認必要
- **MermaidLoader** - app/organization/initiative/page.tsxで使用
- **MonetizationDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
- **NewTabPage** - 使用確認必要
- **OpenInCursorButton** - 使用確認必要
- **OrgBubbleChart** - app/organization/views/BubbleView.tsxで使用
- **OrgChart** - 複数箇所で使用（型定義含む）
- **PageBreakEditor** - 使用確認必要
- **PopulationPyramid** - 使用確認必要
- **PresentationModeContext** - 複数箇所で使用
- **QueryProvider** - app/layout.tsxで使用
- **RelationDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
- **RelationshipBubbleChart** - app/analytics/page.tsxで使用
- **RelationshipDiagram2D** - app/analytics/page.tsxで使用
- **ScatterBubbleChart** - 使用確認必要
- **Sidebar** - Layout.tsxで使用
- **TabBar** - Layout.tsxで使用
- **TabProvider** - Layout.tsxで使用
- **TauriTestHelper** - app/layout.tsxで使用
- **TestOrgDataHelper** - app/layout.tsxで使用
- **ThemeHierarchyChart** - app/a2c100/page.tsxで使用
- **ThemeHierarchyEditor** - app/a2c100/page.tsxで使用
- **ThreeScene** - MarkdownRenderer.tsxで動的インポート
- **TypographyArt** - MarkdownRenderer.tsxで動的インポート
- **UrlBar** - Layout.tsxで使用
- **VegaChart** - MarkdownRenderer.tsxで動的インポート

## 削除候補（要確認）

以下のコンポーネントは使用されていない可能性があります。詳細な確認が必要です：

1. **AlluvialDiagram** - インポートが見つからない
2. **AlluvialDiagram3D** - インポートが見つからない
3. **BubbleChart** - インポートが見つからない
4. **BusinessPlanCard** - インポートが見つからない
5. **BusinessPlanForm** - インポートが見つからない
6. **BusinessProjectForm** - インポートが見つからない
7. **BusinessRadialBar** - インポートが見つからない
8. **BusinessSunburst** - インポートが見つからない
9. **CauseEffectDiagram** - インポートが見つからない
10. **ChaosMap** - インポートが見つからない
11. **CompanyBubbleChart** - インポートが見つからない
12. **CompanyPlanSubMenu** - インポートが見つからない
13. **ContainerCodeEditorModal** - インポートが見つからない
14. **ContainerEditModal** - インポートが見つからない
15. **EcosystemAlluvialDiagram** - インポートが見つからない
16. **ForceDirectedGraph** - インポートが見つからない
17. **ForceDirectedGraph3D** - インポートが見つからない
18. **KeywordPageRelationGraph** - インポートが見つからない
19. **MarkdownRenderer** - インポートが見つからない（ただし、動的インポートの可能性）
20. **NewTabPage** - インポートが見つからない
21. **OpenInCursorButton** - インポートが見つからない
22. **PageBreakEditor** - インポートが見つからない
23. **PopulationPyramid** - インポートが見つからない
24. **ScatterBubbleChart** - インポートが見つからない

## 注意事項

- 動的インポート（`dynamic()`）を使用しているコンポーネントは検索で見つかりにくい場合があります
- 型定義としてのみ使用されているコンポーネント（例：OrgChart, CompanyChart）は保持する必要があります
- コメントアウトされたインポート（例：KnowledgeGraph2D）は実際には使用されていない可能性があります
