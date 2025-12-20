# コンポーネント整理レポート

## 確認結果

### ✅ 使用されているコンポーネント（保持）

以下のコンポーネントは実際に使用されているため、保持します：

1. **AIAssistantPanel** - Layout.tsxで使用
2. **CauseEffectDiagramUpdateModal** - app/organization/initiative/page.tsxで使用
3. **CompanyChart** - lib/buildCompanyHierarchy.tsで型定義として使用
4. **ConceptForm** - lib/conceptCopy.tsで使用
5. **ConceptSubMenu** - 複数箇所で使用（SUB_MENU_ITEMS）
6. **ContainerEditModal** - 使用確認必要（components/内で使用の可能性）
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

### ⚠️ 要確認（使用されている可能性があるが確認が必要）

以下のコンポーネントは、components/内でのみ使用されている可能性があります：

1. **AlluvialDiagram** - components/内でのみ使用の可能性
2. **AlluvialDiagram3D** - components/内でのみ使用の可能性
3. **BubbleChart** - components/内でのみ使用の可能性
4. **BusinessPlanCard** - BusinessPlanFormから型定義をインポート、components/内でのみ使用の可能性
5. **BusinessPlanForm** - BusinessPlanCardから型定義をインポート、components/内でのみ使用の可能性
6. **BusinessProjectForm** - components/内でのみ使用の可能性
7. **BusinessRadialBar** - components/内でのみ使用の可能性
8. **BusinessSunburst** - components/内でのみ使用の可能性
9. **CauseEffectDiagram** - components/内でのみ使用の可能性
10. **ChaosMap** - components/内でのみ使用の可能性
11. **CompanyBubbleChart** - components/内でのみ使用の可能性
12. **CompanyPlanSubMenu** - components/内でのみ使用の可能性
13. **ContainerCodeEditorModal** - components/内でのみ使用の可能性
14. **EcosystemAlluvialDiagram** - components/内でのみ使用の可能性
15. **ForceDirectedGraph** - components/内でのみ使用の可能性
16. **ForceDirectedGraph3D** - components/内でのみ使用の可能性
17. **KeywordPageRelationGraph** - components/内でのみ使用の可能性
18. **MarkdownRenderer** - components/内でのみ使用の可能性（ただし、動的インポートの可能性）
19. **NewTabPage** - Layout.tsxでisNewTabPageという変数名で使用されているが、コンポーネント自体の使用は未確認
20. **OpenInCursorButton** - components/内でのみ使用の可能性
21. **PageBreakEditor** - components/内でのみ使用の可能性
22. **PopulationPyramid** - components/内でのみ使用の可能性
23. **ScatterBubbleChart** - components/内でのみ使用の可能性

### ❌ 削除候補（使用されていない可能性が高い）

以下のコンポーネントは、app/やlib/から使用されていないため、削除候補です：

1. **AlluvialDiagram** - app/やlib/から使用されていない
2. **AlluvialDiagram3D** - app/やlib/から使用されていない
3. **BubbleChart** - app/やlib/から使用されていない
4. **BusinessPlanCard** - app/やlib/から使用されていない（ただし、BusinessPlanFormから型定義をインポート）
5. **BusinessPlanForm** - app/やlib/から使用されていない（ただし、BusinessPlanCardから型定義をインポート）
6. **BusinessProjectForm** - app/やlib/から使用されていない
7. **BusinessRadialBar** - app/やlib/から使用されていない
8. **BusinessSunburst** - app/やlib/から使用されていない
9. **CauseEffectDiagram** - app/やlib/から使用されていない（CauseEffectDiagramUpdateModalは使用されている）
10. **ChaosMap** - app/やlib/から使用されていない
11. **CompanyBubbleChart** - app/やlib/から使用されていない
12. **CompanyPlanSubMenu** - app/やlib/から使用されていない
13. **ContainerCodeEditorModal** - app/やlib/から使用されていない
14. **EcosystemAlluvialDiagram** - app/やlib/から使用されていない
15. **ForceDirectedGraph** - app/やlib/から使用されていない
16. **ForceDirectedGraph3D** - app/やlib/から使用されていない
17. **KeywordPageRelationGraph** - app/やlib/から使用されていない
18. **MarkdownRenderer** - app/やlib/から使用されていない（ただし、動的インポートの可能性）
19. **NewTabPage** - app/やlib/から使用されていない
20. **OpenInCursorButton** - app/やlib/から使用されていない
21. **PageBreakEditor** - app/やlib/から使用されていない
22. **PopulationPyramid** - app/やlib/から使用されていない
23. **ScatterBubbleChart** - app/やlib/から使用されていない

## 推奨アクション

1. **まず確認すべきコンポーネント**:
   - MarkdownRenderer（動的インポートの可能性）
   - NewTabPage（Layout.tsxで変数名として使用）
   - BusinessPlanCard/BusinessPlanForm（相互参照）

2. **削除候補（23個）**:
   - 上記の「削除候補」リストのコンポーネント
   - ただし、components/内でのみ使用されている可能性があるため、components/内での使用も確認が必要

3. **確認方法**:
   - components/内での相互参照を確認
   - 動的インポート（`dynamic()`）の使用を確認
   - 文字列としてのコンポーネント名の使用を確認
