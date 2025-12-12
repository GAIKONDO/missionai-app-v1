'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { scaleOrdinal } from 'd3-scale';
import { callTauriCommand, onAuthStateChanged } from '@/lib/localFirebase';
import { useQuery } from '@tanstack/react-query';

// 固定サービス（事業企画）の定義
const SPECIAL_SERVICES = [
  { id: 'own-service', name: '自社開発・自社サービス事業', description: '自社開発のサービス事業に関する計画', hasConcepts: true },
  { id: 'education-training', name: 'AI導入ルール設計・人材育成・教育事業', description: '人材育成、教育、AI導入ルール設計に関する計画', hasConcepts: true },
  { id: 'consulting', name: 'プロセス可視化・業務コンサル事業', description: '業務コンサルティングとプロセス改善に関する計画', hasConcepts: true },
  { id: 'ai-dx', name: 'AI駆動開発・DX支援SI事業', description: 'AI技術を活用した開発・DX支援に関する計画', hasConcepts: true },
];

// 固定構想の定義
const FIXED_CONCEPTS: { [key: string]: Array<{ id: string; name: string; description: string }> } = {
  'own-service': [
    { id: 'maternity-support', name: '出産支援パーソナルApp', description: '出産前後のママとパパをサポートするパーソナルアプリケーション' },
    { id: 'care-support', name: '介護支援パーソナルApp', description: '介護を必要とする方とその家族をサポートするパーソナルアプリケーション' },
  ],
  'ai-dx': [
    { id: 'medical-dx', name: '医療法人向けDX', description: '助成金を活用したDX：電子カルテなどの導入支援' },
    { id: 'sme-dx', name: '中小企業向けDX', description: '内部データ管理やHP作成、Invoice制度の対応など' },
  ],
  'consulting': [
    { id: 'sme-process', name: '中小企業向け業務プロセス可視化・改善', description: '中小企業の業務プロセス可視化、効率化、経営課題の解決支援、助成金活用支援' },
    { id: 'medical-care-process', name: '医療・介護施設向け業務プロセス可視化・改善', description: '医療・介護施設の業務フロー可視化、記録業務の効率化、コンプライアンス対応支援' },
  ],
  'education-training': [
    { id: 'corporate-ai-training', name: '大企業向けAI人材育成・教育', description: '企業内AI人材の育成、AI活用スキル研修、AI導入教育プログラムの提供' },
    { id: 'ai-governance', name: 'AI導入ルール設計・ガバナンス支援', description: '企業のAI導入におけるルール設計、ガバナンス構築、コンプライアンス対応支援' },
    { id: 'sme-ai-education', name: '中小企業向けAI導入支援・教育', description: '中小企業向けのAI導入支援、実践的なAI教育、導入ルール設計支援、助成金活用支援' },
  ],
};

// 各構想から獲得できる強みの定義
const CONCEPT_STRENGTHS: { [key: string]: string[] } = {
  'maternity-support': [
    '妊婦・育児データの蓄積',
    'パーソナライズドヘルスケアのノウハウ',
    '医療機関との連携実績'
  ],
  'care-support': [
    '介護データの蓄積',
    '家族支援のノウハウ',
    '介護施設との連携実績'
  ],
  'medical-dx': [
    '医療機関との信頼関係',
    '電子カルテ導入の実績',
    'コンプライアンス対応の経験'
  ],
  'sme-dx': [
    '中小企業向けDXの実績',
    'コスト効率的なソリューション提供',
    '助成金活用のサポート実績'
  ],
  'sme-process': [
    '業務プロセス可視化の技術',
    '中小企業の経営課題理解',
    '経営コンサルティングの実績'
  ],
  'medical-care-process': [
    '医療・介護施設の業務理解',
    '記録業務効率化の実績',
    'コンプライアンス対応の経験'
  ],
  'corporate-ai-training': [
    '大企業向け研修プログラムの実績',
    'AI人材育成のノウハウ',
    'AI導入戦略のコンサル実績'
  ],
  'ai-governance': [
    'AIガバナンス設計の実績',
    'コンプライアンス対応の経験',
    'AI導入ルール策定のノウハウ'
  ],
  'sme-ai-education': [
    '中小企業向けAI教育の実績',
    '実践的なAI活用のノウハウ',
    '助成金活用支援の経験'
  ]
};

export interface GraphNode {
  id: string;
  label: string;
  type: 'company' | 'project' | 'concept' | 'servicePlan';
  data?: any;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
}

interface ForceDirectedGraph3DProps {
  width?: number;
  height?: number;
  title?: string;
}

export default function ForceDirectedGraph3D({
  width = 1200,
  height = 800,
  title = '会社・事業企画・構想の関係性（3D）',
}: ForceDirectedGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const nodesRef = useRef<Map<string, any>>(new Map());
  const linksRef = useRef<Map<string, any>>(new Map());
  const animationIdRef = useRef<number | null>(null);
  const targetCameraPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const targetCameraLookAtRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const targetDistanceRef = useRef<number | null>(null);
  const visibleConceptsRef = useRef<Set<string>>(new Set()); // 表示されている構想ノードのID
  const clickedNodeIdRef = useRef<string | null>(null); // クリックされたノードのID

  // ノードタイプごとの色を設定（明るく、鮮やかな色に変更）
  const colorScale = useMemo(() => {
    return scaleOrdinal<string>()
      .domain(['company', 'project', 'concept', 'servicePlan'])
      .range(['#7BB3FF', '#7DD99F', '#FF9999', '#FFCC66']); // 明るく、鮮やかな青、緑、赤、オレンジ
  }, []);

  // ローカルデータベースからデータを取得（React Queryでキャッシュ）
  const { data: graphData, isLoading: queryLoading } = useQuery({
    queryKey: ['forceDirectedGraph3D'],
    queryFn: async () => {
      const currentUser = await callTauriCommand('get_current_user', {});
      if (!currentUser) {
        return null;
      }

      const userId = currentUser.uid;

        // 並列でデータを取得
        const conditions = {
          field: 'userId',
          operator: '==',
          value: userId
        };
        
        // 削除済みテーブルへの参照を削除
        const [companyPlansResults, projectsResults, conceptsResults, servicePlansResults] = await Promise.all([
          Promise.resolve([]), // companyBusinessPlanは削除済み
          Promise.resolve([]), // businessProjectsは削除済み
          Promise.resolve([]), // conceptsは削除済み
          Promise.resolve([]), // servicePlansは削除済み
        ]);
        
        // 結果をFirestore形式に変換
        const companyPlansSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (companyPlansResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };
        const projectsSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (projectsResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };
        const conceptsSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (conceptsResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };
        const servicePlansSnapshot = {
          forEach: (callback: (doc: any) => void) => {
            (servicePlansResults || []).forEach((item: any) => {
              const data = item.data || item;
              callback({
                id: item.id || data.id,
                data: () => data
              });
            });
          }
        };

        // ノードを作成
        const nodesMap = new Map<string, GraphNode>();

        // 会社ノードを追加
        companyPlansSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const nodeId = `company-${doc.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.title || '会社事業計画',
            type: 'company',
            data: { ...data, docId: doc.id },
          });
        });

        // 固定サービス（事業企画）ノードを追加
        SPECIAL_SERVICES.forEach((service) => {
          const nodeId = `project-${service.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: service.name,
            type: 'project',
            data: { serviceId: service.id, description: service.description, isFixed: true },
          });
        });

        // 事業企画ノードを追加（Firebaseから取得）
        projectsSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const nodeId = `project-${doc.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.name || '事業企画',
            type: 'project',
            data: { ...data, docId: doc.id, serviceId: data.serviceId },
          });
        });

        // 構想ノードを追加（Firebaseから取得した構想）
        const addedConceptIds = new Set<string>();
        conceptsSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const nodeId = `concept-${doc.id}`;
          const conceptId = data.conceptId || doc.id;
          addedConceptIds.add(conceptId);
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.name || '構想',
            type: 'concept',
            data: { ...data, docId: doc.id, serviceId: data.serviceId, conceptId: conceptId },
          });
        });

        // 固定構想ノードを追加（Firebaseに存在しない場合）
        Object.entries(FIXED_CONCEPTS).forEach(([serviceId, concepts]) => {
          concepts.forEach((concept) => {
            if (!addedConceptIds.has(concept.id)) {
              const nodeId = `fixed-concept-${serviceId}-${concept.id}`;
              nodesMap.set(nodeId, {
                id: nodeId,
                label: concept.name,
                type: 'concept',
                data: { 
                  serviceId: serviceId, 
                  conceptId: concept.id, 
                  description: concept.description,
                  isFixed: true 
                },
              });
            }
          });
        });

        // サービス計画ノードを追加
        servicePlansSnapshot.forEach((doc: any) => {
          const data = doc.data();
          const nodeId = `servicePlan-${doc.id}`;
          nodesMap.set(nodeId, {
            id: nodeId,
            label: data.title || 'サービス計画',
            type: 'servicePlan',
            data: { ...data, docId: doc.id, serviceId: data.serviceId, conceptId: data.conceptId },
          });
        });


        // リンクを作成
        const linksList: GraphLink[] = [];

        // 会社と事業企画のリンク（linkedPlanIdsで関連）
        const companyNodes = Array.from(nodesMap.values()).filter((n) => n.type === 'company');
        const projectNodes = Array.from(nodesMap.values()).filter((n) => n.type === 'project');

        // 動的に追加された事業企画の場合、linkedPlanIdsを使用してリンクを作成
        // isFixed: trueのプロジェクトは除外（固定サービスは別途処理されるため）
        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          // isFixed: trueのプロジェクトは除外
          if (projectData.isFixed) {
            return;
          }
          const projectId = `project-${projectDoc.id}`;
          const linkedPlanIds = projectData.linkedPlanIds;
          
          if (linkedPlanIds && Array.isArray(linkedPlanIds) && linkedPlanIds.length > 0) {
            linkedPlanIds.forEach((planId: string) => {
              const companyNodeId = `company-${planId}`;
              if (nodesMap.has(companyNodeId)) {
                linksList.push({
                  source: companyNodeId,
                  target: projectId,
                  type: 'company-project',
                });
              }
            });
          }
        });

        // 固定サービス（事業企画）の場合、linkedPlanIdsを使用してリンクを作成
        // 固定サービスのデータをFirestoreから取得
        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          if (projectData.isFixed && projectData.serviceId) {
            const serviceId = projectData.serviceId;
            const projectId = `project-${serviceId}`;
            const linkedPlanIds = projectData.linkedPlanIds;
            
            if (linkedPlanIds && Array.isArray(linkedPlanIds) && linkedPlanIds.length > 0) {
              // linkedPlanIdsが設定されている場合、それを使用
              linkedPlanIds.forEach((planId: string) => {
                const companyNodeId = `company-${planId}`;
                if (nodesMap.has(companyNodeId)) {
                  linksList.push({
                    source: companyNodeId,
                    target: projectId,
                    type: 'company-project',
                  });
                }
              });
            } else {
              // linkedPlanIdsが設定されていない場合、すべての会社ノードにリンク
              companyNodes.forEach((companyNode) => {
                linksList.push({
                  source: companyNode.id,
                  target: projectId,
                  type: 'company-project',
                });
              });
            }
          }
        });

        // 事業企画と構想のリンク
        SPECIAL_SERVICES.forEach((service) => {
          const projectId = `project-${service.id}`;
          const serviceId = service.id;

          conceptsSnapshot.forEach((conceptDoc: any) => {
            const conceptData = conceptDoc.data();
            if (conceptData.serviceId === serviceId) {
              const conceptId = `concept-${conceptDoc.id}`;
              linksList.push({
                source: projectId,
                target: conceptId,
                type: 'project-concept',
              });
            }
          });
          const fixedConcepts = FIXED_CONCEPTS[serviceId] || [];
          fixedConcepts.forEach((concept) => {
            const conceptId = `fixed-concept-${serviceId}-${concept.id}`;
            if (nodesMap.has(conceptId)) {
              linksList.push({
                source: projectId,
                target: conceptId,
                type: 'project-concept',
              });
            }
          });
        });

        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          const projectId = `project-${projectDoc.id}`;
          const serviceId = projectData.serviceId;

          if (serviceId) {
            conceptsSnapshot.forEach((conceptDoc: any) => {
              const conceptData = conceptDoc.data();
              if (conceptData.serviceId === serviceId) {
                const conceptId = `concept-${conceptDoc.id}`;
                linksList.push({
                  source: projectId,
                  target: conceptId,
                  type: 'project-concept',
                });
              }
            });
            const fixedConcepts = FIXED_CONCEPTS[serviceId] || [];
            fixedConcepts.forEach((concept) => {
              const conceptId = `fixed-concept-${serviceId}-${concept.id}`;
              if (nodesMap.has(conceptId)) {
                linksList.push({
                  source: projectId,
                  target: conceptId,
                  type: 'project-concept',
                });
              }
            });
          }
        });

        // 構想とサービス計画のリンク
        conceptsSnapshot.forEach((conceptDoc: any) => {
          const conceptData = conceptDoc.data();
          const conceptId = `concept-${conceptDoc.id}`;
          const conceptConceptId = conceptData.conceptId;

          if (conceptConceptId) {
            servicePlansSnapshot.forEach((planDoc: any) => {
              const planData = planDoc.data();
              if (planData.conceptId === conceptConceptId) {
                const planId = `servicePlan-${planDoc.id}`;
                linksList.push({
                  source: conceptId,
                  target: planId,
                  type: 'concept-servicePlan',
                });
              }
            });
          }
        });

        // 事業企画とサービス計画のリンク
        SPECIAL_SERVICES.forEach((service) => {
          const projectId = `project-${service.id}`;
          const serviceId = service.id;

          servicePlansSnapshot.forEach((planDoc: any) => {
            const planData = planDoc.data();
            if (planData.serviceId === serviceId) {
              const planId = `servicePlan-${planDoc.id}`;
              const conceptLinkExists = linksList.some(
                (link) =>
                  (link.target === planId || (typeof link.target === 'object' && link.target.id === planId)) &&
                  link.type === 'concept-servicePlan'
              );
              if (!conceptLinkExists) {
                linksList.push({
                  source: projectId,
                  target: planId,
                  type: 'project-servicePlan',
                });
              }
            }
          });
        });

        projectsSnapshot.forEach((projectDoc: any) => {
          const projectData = projectDoc.data();
          const projectId = `project-${projectDoc.id}`;
          const serviceId = projectData.serviceId;

          if (serviceId) {
            servicePlansSnapshot.forEach((planDoc: any) => {
              const planData = planDoc.data();
              if (planData.serviceId === serviceId) {
                const planId = `servicePlan-${planDoc.id}`;
                const conceptLinkExists = linksList.some(
                  (link) =>
                    (link.target === planId || (typeof link.target === 'object' && link.target.id === planId)) &&
                    link.type === 'concept-servicePlan'
                );
                if (!conceptLinkExists) {
                  linksList.push({
                    source: projectId,
                    target: planId,
                    type: 'project-servicePlan',
                  });
                }
              }
            });
          }
        });

      return {
        nodes: Array.from(nodesMap.values()),
        links: linksList,
      };
    },
    enabled: true,
  });

  // データが取得できたら状態を更新
  useEffect(() => {
    if (graphData) {
      setNodes(graphData.nodes);
      setLinks(graphData.links);
    }
    setLoading(queryLoading);
  }, [graphData, queryLoading]);

  // 3Dシーンの初期化とアニメーション
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0 || loading) return;

    let cleanup: (() => void) | null = null;

    // Three.jsを動的にインポート
    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('troika-three-text'),
    ]).then(([THREE, OrbitControlsModule, TroikaModule]) => {
      const { Scene, PerspectiveCamera, WebGLRenderer, SphereGeometry, MeshStandardMaterial, Mesh, DirectionalLight, AmbientLight, CylinderGeometry, Color, Vector3, Group, Raycaster, Vector2 } = THREE;
      const OrbitControls = OrbitControlsModule.OrbitControls;
      const Text = TroikaModule.Text;

      // シーンを作成
      const scene = new Scene();
      scene.background = new Color(0xffffff); // 純白の背景
      sceneRef.current = scene;

      // カメラを作成
      const camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
      camera.position.set(0, 0, 300);
      cameraRef.current = camera;

      // レンダラーを作成（パフォーマンス最適化）
      const renderer = new WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      // pixelRatioを制限してパフォーマンスを向上（最大2まで）
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // コントロールを作成
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 20;
      controls.maxDistance = 2000;
      controls.enableZoom = true;
      controls.enablePan = true;
      controlsRef.current = controls;

      // ライトを追加（よりドラマチックなライティング）
      const ambientLight = new AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      const directionalLight1 = new DirectionalLight(0xffffff, 1.0);
      directionalLight1.position.set(150, 150, 150);
      directionalLight1.castShadow = true;
      scene.add(directionalLight1);
      const directionalLight2 = new DirectionalLight(0xffffff, 0.5);
      directionalLight2.position.set(-150, -150, -150);
      scene.add(directionalLight2);
      // 補助ライトを追加（より立体感を出す）
      const directionalLight3 = new DirectionalLight(0xffffff, 0.3);
      directionalLight3.position.set(0, 200, 0);
      scene.add(directionalLight3);

      // ノードの3Dオブジェクトを作成
      const nodeObjects = new Map<string, any>();
      nodes.forEach((node) => {
        const radius = node.type === 'company' ? 18 : node.type === 'project' ? 14 : node.type === 'concept' ? 8 : node.type === 'servicePlan' ? 8 : 6;
        const geometry = new SphereGeometry(radius, 24, 24); // 解像度を下げてパフォーマンス向上（32→24）
        const color = colorScale(node.type);
        // より洗練されたマテリアル設定
        const material = new MeshStandardMaterial({ 
          color: new Color(color),
          metalness: node.type === 'company' ? 0.5 : 0.4, // 会社はよりメタリックに
          roughness: node.type === 'company' ? 0.2 : 0.3, // より滑らかに
          transparent: false,
          opacity: 1.0,
          emissive: new Color(color).multiplyScalar(0.1), // 微弱なグロー効果
        });
        const sphere = new Mesh(geometry, material);
        
        // 初期位置をランダムに設定（力学的シミュレーションで調整される）
        sphere.position.set(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 200
        );

        // テキストラベルを追加（サイズ固定）
        const text = new Text();
        text.text = node.label;
        text.fontSize = node.type === 'company' ? 16 : node.type === 'project' ? 12 : 10;
        text.color = 0x1a1a1a;
        // fontWeight is not supported by troika-three-text
        text.anchorX = 'center';
        text.anchorY = 'middle';
        text.position.set(sphere.position.x, sphere.position.y - radius - 8, sphere.position.z);
        // ノードサイズに応じたテキスト位置の調整は不要（radiusが既に更新されているため）
        // テキストのサイズを固定（カメラの距離に応じてスケールしない）
        text.scale.set(1, 1, 1);
        text.sync();

        const group = new Group();
        group.add(sphere);
        group.add(text);
        group.userData = { node };
        scene.add(group);
        
        // 構想ノードは初期状態で非表示にする
        if (node.type === 'concept') {
          group.visible = false;
          sphere.visible = false;
          text.visible = false;
        }
        
        nodeObjects.set(node.id, { sphere, text, group, node });
        nodesRef.current.set(node.id, { sphere, text, group, node });
      });

      // リンクの3Dオブジェクトを作成
      const linkObjects: any[] = [];
      links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const sourceObj = nodeObjects.get(sourceId);
        const targetObj = nodeObjects.get(targetId);

        if (sourceObj && targetObj) {
          const geometry = new CylinderGeometry(0.3, 0.3, 1, 16); // より太く、滑らかに
          const linkColor = link.type === 'company-project' ? '#7BB3FF' :
                           link.type === 'project-concept' ? '#7DD99F' :
                           link.type === 'concept-servicePlan' ? '#FF9999' :
                           link.type === 'project-servicePlan' ? '#FFCC66' : '#999';
          const material = new MeshStandardMaterial({ 
            color: new Color(linkColor),
            transparent: true,
            opacity: 0.6, // より見やすく
            metalness: 0.2,
            roughness: 0.5,
          });
          const cylinder = new Mesh(geometry, material);
          
          // リンクの位置と向きを設定
          const updateLink = () => {
            const sourcePos = sourceObj.sphere.position;
            const targetPos = targetObj.sphere.position;
            const midPoint = new Vector3().addVectors(sourcePos, targetPos).multiplyScalar(0.5);
            const direction = new Vector3().subVectors(targetPos, sourcePos);
            const length = direction.length();
            
            cylinder.position.copy(midPoint);
            cylinder.scale.y = length;
            cylinder.lookAt(targetPos);
            cylinder.rotateX(Math.PI / 2);
          };
          
          updateLink();
          scene.add(cylinder);
          
          // 構想ノードに関連するリンクは初期状態で非表示にする
          const isConceptLink = link.type === 'project-concept' || 
                                link.type === 'concept-servicePlan' ||
                                (link.type === 'concept-strength');
          if (isConceptLink) {
            cylinder.visible = false;
            cylinder.scale.set(0, 0, 0); // アニメーション用にスケールを0に
          }
          
          linkObjects.push({ 
            cylinder, 
            sourceObj, 
            targetObj, 
            updateLink, 
            link,
            animating: isConceptLink,
            animationScale: isConceptLink ? 0 : 1
          });
          linksRef.current.set(`${sourceId}-${targetId}`, { 
            cylinder, 
            sourceObj, 
            targetObj, 
            updateLink,
            link,
            animating: isConceptLink,
            animationScale: isConceptLink ? 0 : 1
          });
        }
      });

      // Force simulation（力学的シミュレーション）
      const chargeStrength = -300;
      const linkDistance = 100;
      const alpha = 1;
      const alphaDecay = 0.02;
      let currentAlpha = alpha;
      let isSimulating = true; // シミュレーション実行中フラグ
      const velocityThreshold = 0.05; // 速度の閾値
      let frameCount = 0; // フレームカウンター（パフォーマンス最適化用）
      let isVisible = true; // ビューポート内に表示されているか

      // Intersection Observerでビューポート外ではアニメーションを停止
      const visibilityObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
            if (!isVisible && animationIdRef.current) {
              // ビューポート外になったらアニメーションを停止
              cancelAnimationFrame(animationIdRef.current);
              animationIdRef.current = null;
            } else if (isVisible && !animationIdRef.current) {
              // ビューポート内に戻ったらアニメーションを再開
              animate();
            }
          });
        },
        { threshold: 0.1 } // 10%以上表示されている場合に「表示中」とみなす
      );

      // コンテナを監視
      if (containerRef.current) {
        visibilityObserver.observe(containerRef.current);
      }

      const animate = () => {
        // ビューポート外の場合はアニメーションを実行しない
        if (!isVisible) {
          animationIdRef.current = null;
          return;
        }

        frameCount++;
        if (isSimulating && currentAlpha > 0.01) {
          currentAlpha *= (1 - alphaDecay);
          let maxVelocity = 0;
          
          // ノード間の反発力
          nodes.forEach((node, i) => {
            const obj = nodeObjects.get(node.id);
            if (!obj || !obj.group.visible) return; // 非表示のノードはスキップ
            
            let fx = 0, fy = 0, fz = 0;
            
            nodes.forEach((otherNode, j) => {
              if (i === j) return;
              const otherObj = nodeObjects.get(otherNode.id);
              if (!otherObj || !otherObj.group.visible) return; // 非表示のノードはスキップ
              
              const dx = obj.sphere.position.x - otherObj.sphere.position.x;
              const dy = obj.sphere.position.y - otherObj.sphere.position.y;
              const dz = obj.sphere.position.z - otherObj.sphere.position.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
              
              const force = chargeStrength / (distance * distance);
              fx += (dx / distance) * force;
              fy += (dy / distance) * force;
              fz += (dz / distance) * force;
            });
            
            // リンクによる引力
            links.forEach((link) => {
              const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
              const targetId = typeof link.target === 'string' ? link.target : link.target.id;
              
              if (sourceId === node.id) {
                const targetObj = nodeObjects.get(targetId);
                if (targetObj) {
                  const dx = targetObj.sphere.position.x - obj.sphere.position.x;
                  const dy = targetObj.sphere.position.y - obj.sphere.position.y;
                  const dz = targetObj.sphere.position.z - obj.sphere.position.z;
                  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
                  const force = (distance - linkDistance) * 0.1;
                  fx += (dx / distance) * force;
                  fy += (dy / distance) * force;
                  fz += (dz / distance) * force;
                }
              } else if (targetId === node.id) {
                const sourceObj = nodeObjects.get(sourceId);
                if (sourceObj) {
                  const dx = sourceObj.sphere.position.x - obj.sphere.position.x;
                  const dy = sourceObj.sphere.position.y - obj.sphere.position.y;
                  const dz = sourceObj.sphere.position.z - obj.sphere.position.z;
                  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
                  const force = (distance - linkDistance) * 0.1;
                  fx += (dx / distance) * force;
                  fy += (dy / distance) * force;
                  fz += (dz / distance) * force;
                }
              }
            });
            
            // 速度を更新
            if (!obj.node.vx) obj.node.vx = 0;
            if (!obj.node.vy) obj.node.vy = 0;
            if (!obj.node.vz) obj.node.vz = 0;
            
            obj.node.vx = (obj.node.vx + fx) * 0.9;
            obj.node.vy = (obj.node.vy + fy) * 0.9;
            obj.node.vz = (obj.node.vz + fz) * 0.9;
            
            // 最大速度を記録
            const velocity = Math.sqrt(obj.node.vx * obj.node.vx + obj.node.vy * obj.node.vy + obj.node.vz * obj.node.vz);
            if (velocity > maxVelocity) {
              maxVelocity = velocity;
            }
            
            // 位置を更新
            obj.sphere.position.x += obj.node.vx;
            obj.sphere.position.y += obj.node.vy;
            obj.sphere.position.z += obj.node.vz;
            
            // テキスト位置を更新（サイズは固定）
            obj.text.position.set(
              obj.sphere.position.x,
              obj.sphere.position.y - (node.type === 'company' ? 16 : node.type === 'project' ? 12 : node.type === 'concept' ? 6 : 6) - 5,
              obj.sphere.position.z
            );
            // テキストのサイズを固定（カメラの距離に応じてスケールを調整して一定の見た目サイズを保つ）
            const textDistance = camera.position.distanceTo(obj.text.position);
            const baseDistance = 500; // 基準距離
            const scaleFactor = textDistance / baseDistance;
            obj.text.scale.set(scaleFactor, scaleFactor, scaleFactor);
            obj.text.sync();
          });
          
          // すべてのノードの速度が閾値以下になったら、速度を0にしてシミュレーションを停止
          if (maxVelocity < velocityThreshold || currentAlpha <= 0.01) {
            nodes.forEach((node) => {
              const obj = nodeObjects.get(node.id);
              if (obj) {
                obj.node.vx = 0;
                obj.node.vy = 0;
                obj.node.vz = 0;
              }
            });
            isSimulating = false;
            currentAlpha = 0;
          }
        }
        
        // リンクを更新（パフォーマンス最適化：更新頻度を下げる）
        if (isSimulating || frameCount % 2 === 0) {
        linkObjects.forEach((linkObj) => {
          if (linkObj.cylinder.visible) {
            linkObj.updateLink();
            
            // リンクの出現アニメーション
            if (linkObj.animating && linkObj.animationScale !== undefined) {
              linkObj.animationScale += 0.1;
              if (linkObj.animationScale >= 1) {
                linkObj.animationScale = 1;
                linkObj.animating = false;
              }
              // リンクの太さをアニメーション（長さは維持）
              const currentLength = linkObj.cylinder.scale.y;
              linkObj.cylinder.scale.set(linkObj.animationScale, currentLength, linkObj.animationScale);
            }
          }
        });
        }
        
        // 構想ノードの出現アニメーション
        nodeObjects.forEach((obj) => {
          if (obj.animating && obj.animationScale !== undefined) {
            obj.animationScale += 0.1;
            if (obj.animationScale >= 1) {
              obj.animationScale = 1;
              obj.animating = false;
            }
            obj.sphere.scale.set(obj.animationScale, obj.animationScale, obj.animationScale);
            obj.text.scale.set(obj.animationScale, obj.animationScale, obj.animationScale);
          }
        });
        
        // テキストのサイズを固定（カメラの距離に応じてスケールを調整して一定の見た目サイズを保つ）
        // パフォーマンス最適化：テキスト更新頻度を下げる
        const baseDistance = 500; // 基準距離（初期表示時に適切なサイズになるように調整）
        let textUpdateCounter = 0;
        nodeObjects.forEach((obj) => {
          // 非表示の構想ノードはスキップ
          if (!obj.group.visible) return;
          
          // シミュレーション停止後もテキスト位置を更新（更新頻度を下げる）
          if (!isSimulating && textUpdateCounter % 3 === 0) {
            const node = obj.node;
            obj.text.position.set(
              obj.sphere.position.x,
              obj.sphere.position.y - (node.type === 'company' ? 18 : node.type === 'project' ? 14 : node.type === 'concept' ? 8 : 8) - 8,
              obj.sphere.position.z
            );
          }
          
          // テキストスケールの更新頻度を下げる（3フレームに1回）
          if (textUpdateCounter % 3 === 0) {
          const textDistance = camera.position.distanceTo(obj.text.position);
          const scaleFactor = textDistance / baseDistance;
          
          // クリックされたノードのラベルは大きくする
          const isClickedNode = clickedNodeIdRef.current === obj.node.id;
          const labelScaleMultiplier = isClickedNode ? 2.5 : 1.0; // クリックされたノードは2.5倍
          
          // アニメーション中の場合は、アニメーションスケールも考慮
          const finalScale = obj.animating && obj.animationScale !== undefined 
            ? scaleFactor * obj.animationScale * labelScaleMultiplier
            : scaleFactor * labelScaleMultiplier;
          obj.text.scale.set(finalScale, finalScale, finalScale);
          obj.text.sync();
          }
          textUpdateCounter++;
        });
        
        // カメラアニメーション（ノードクリック時のズーム）
        if (targetCameraPositionRef.current && targetCameraLookAtRef.current) {
          const targetPos = targetCameraPositionRef.current;
          const targetLookAt = targetCameraLookAtRef.current;
          
          // カメラ位置をスムーズに移動
          camera.position.x += (targetPos.x - camera.position.x) * 0.1;
          camera.position.y += (targetPos.y - camera.position.y) * 0.1;
          camera.position.z += (targetPos.z - camera.position.z) * 0.1;
          
          // OrbitControlsのターゲットを更新（これによりズームやパンが可能になる）
          controls.target.x += (targetLookAt.x - controls.target.x) * 0.1;
          controls.target.y += (targetLookAt.y - controls.target.y) * 0.1;
          controls.target.z += (targetLookAt.z - controls.target.z) * 0.1;
          
          // 十分近づいたらアニメーション終了
          const distance = Math.sqrt(
            Math.pow(camera.position.x - targetPos.x, 2) +
            Math.pow(camera.position.y - targetPos.y, 2) +
            Math.pow(camera.position.z - targetPos.z, 2)
          );
          
          if (distance < 1) {
            targetCameraPositionRef.current = null;
            targetCameraLookAtRef.current = null;
            targetDistanceRef.current = null;
          }
        }
        
        controls.update();
        renderer.render(scene, camera);
        animationIdRef.current = requestAnimationFrame(animate);
      };

      animate();

      // マウスイベント
      const raycaster = new Raycaster();
      const mouse = new Vector2();
      
      const onMouseMove = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        // 表示されているノードのみを対象にする
        const visibleSpheres = Array.from(nodeObjects.values())
          .filter(obj => obj.group.visible)
          .map(obj => obj.sphere);
        const intersects = raycaster.intersectObjects(visibleSpheres);
        
        if (intersects.length > 0) {
          const intersectedSphere = intersects[0].object;
          const nodeObj = Array.from(nodeObjects.values()).find(obj => obj.sphere === intersectedSphere);
          if (nodeObj) {
            setHoveredNode(nodeObj.node);
            nodeObj.sphere.scale.set(1.2, 1.2, 1.2);
            renderer.domElement.style.cursor = 'pointer';
          }
        } else {
          setHoveredNode(null);
          nodeObjects.forEach((obj) => {
            obj.sphere.scale.set(1, 1, 1);
          });
          renderer.domElement.style.cursor = 'default';
        }
      };

      const onMouseClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Array.from(nodeObjects.values()).map(obj => obj.sphere));
        
        if (intersects.length > 0) {
          const intersectedSphere = intersects[0].object;
          const nodeObj = Array.from(nodeObjects.values()).find(obj => obj.sphere === intersectedSphere);
          if (nodeObj) {
            const nodePosition = nodeObj.sphere.position;
            const nodeRadius = nodeObj.sphere.geometry.parameters.radius;
            
            // 企画ノードがクリックされた場合、関連する構想ノードを表示
            if (nodeObj.node.type === 'project') {
              const projectId = nodeObj.node.id;
              const relatedConcepts = links
                .filter(link => {
                  const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                  const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                  return (sourceId === projectId && link.type === 'project-concept') ||
                         (targetId === projectId && link.type === 'project-concept');
                })
                .map(link => {
                  const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                  const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                  return sourceId === projectId ? targetId : sourceId;
                });
              
              relatedConcepts.forEach((conceptId, index) => {
                const conceptObj = nodeObjects.get(conceptId);
                if (conceptObj && !conceptObj.group.visible) {
                  // 構想ノードを企画ノードの周りに配置
                  const angle = (index / relatedConcepts.length) * Math.PI * 2;
                  const conceptRadius = 60;
                  conceptObj.sphere.position.set(
                    nodePosition.x + Math.cos(angle) * conceptRadius,
                    nodePosition.y,
                    nodePosition.z + Math.sin(angle) * conceptRadius
                  );
                  
                  // 構想ノードを表示
                  conceptObj.group.visible = true;
                  conceptObj.sphere.visible = true;
                  conceptObj.text.visible = true;
                  
                  // 出現アニメーション（スケールアニメーション）
                  conceptObj.sphere.scale.set(0, 0, 0);
                  conceptObj.text.scale.set(0, 0, 0);
                  
                  // アニメーション用のデータを保存
                  conceptObj.animationScale = 0;
                  conceptObj.animating = true;
                  
                  visibleConceptsRef.current.add(conceptId);
                  
                  // 構想ノードに関連するリンクも表示
                  links.forEach((link) => {
                    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                    const linkKey = `${sourceId}-${targetId}`;
                    const linkObj = linksRef.current.get(linkKey);
                    
                    if (linkObj && (sourceId === conceptId || targetId === conceptId)) {
                      // リンクを表示
                      linkObj.cylinder.visible = true;
                      linkObj.animating = true;
                      linkObj.animationScale = 0;
                    }
                  });
                }
              });
            }
            
            // クリックされたノードのIDを保存
            clickedNodeIdRef.current = nodeObj.node.id;
            
            // ラベルの正面にカメラを移動
            const nodeType = nodeObj.node.type;
            
            // テキストラベルの位置を計算（ノードの下に配置）
            const textOffset = nodeType === 'company' ? 16 : nodeType === 'project' ? 12 : nodeType === 'concept' ? 6 : 6;
            const textPosition = new Vector3(
              nodePosition.x,
              nodePosition.y - textOffset - 5,
              nodePosition.z
            );
            
            // ラベルの正面にカメラを配置
            // カメラをノードの少し上から、ラベルが見やすい角度に配置
            const distance = nodeRadius * 12; // ノードの12倍の距離から見る（少し引きで）
            const cameraHeight = nodeRadius * 4; // カメラをノードの上に配置
            
            // カメラの目標位置を設定（ラベルの正面、少し上から見下ろす角度）
            const cameraOffset = new Vector3(0, cameraHeight, distance);
            targetCameraPositionRef.current = {
              x: nodePosition.x + cameraOffset.x,
              y: nodePosition.y + cameraOffset.y,
              z: nodePosition.z + cameraOffset.z,
            };
            
            // カメラのターゲットをラベルの位置に設定（ラベルが見やすい位置）
            targetCameraLookAtRef.current = {
              x: textPosition.x,
              y: textPosition.y,
              z: textPosition.z,
            };
            targetDistanceRef.current = distance;
            
            // コントロールのターゲットをラベルの位置に設定（これによりズームやパンが可能になる）
            controls.target.set(textPosition.x, textPosition.y, textPosition.z);
          }
        }
      };

      renderer.domElement.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('click', onMouseClick);

      // クリーンアップ関数を設定
      cleanup = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        visibilityObserver.disconnect(); // Intersection Observerを切断
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onMouseClick);
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    }).catch((error) => {
      console.error('3Dグラフの初期化エラー:', error);
    });

    // useEffectのクリーンアップ関数を返す
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [nodes, links, width, height, colorScale, loading]);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '40px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div style={{ width: '100%', padding: '40px', textAlign: 'center' }}>
        <p>データがありません。会社、事業企画、構想を作成してください。</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'hidden', padding: '20px' }}>
      {title && (
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '24px', 
          fontSize: '24px', 
          fontWeight: '600',
          color: '#1a1a1a',
          fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
          letterSpacing: '-0.02em'
        }}>
          {title}
        </h2>
      )}
      <div style={{ width: '100%', maxWidth: `${width}px`, margin: '0 auto', position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: `${height}px`,
            border: 'none',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        />
        {hoveredNode && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(26, 26, 26, 0.95)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: '280px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)',
              fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif",
              lineHeight: '1.5',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: colorScale(hoveredNode.type) }}>
              {hoveredNode.type === 'company' && '会社'}
              {hoveredNode.type === 'project' && '事業企画'}
              {hoveredNode.type === 'concept' && '構想'}
              {hoveredNode.type === 'servicePlan' && 'サービス計画'}
            </div>
            <div>{hoveredNode.label}</div>
            {hoveredNode.data?.description && (
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '4px' }}>
                {hoveredNode.data.description.substring(0, 100)}
                {hoveredNode.data.description.length > 100 ? '...' : ''}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
        <div style={{ display: 'inline-flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #5BA0F2, #3A7BC8)',
                boxShadow: '0 2px 4px rgba(58, 123, 200, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>会社</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #60D88A, #40B86A)',
                boxShadow: '0 2px 4px rgba(64, 184, 106, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>事業企画</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #FF7B7B, #E55A5A)',
                boxShadow: '0 2px 4px rgba(229, 90, 90, 0.3)',
              }}
            />
            <span style={{ fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif", fontWeight: '500' }}>構想</span>
          </div>
          </div>
        <p style={{ marginTop: '12px', fontSize: '13px', color: '#888', fontFamily: "'Inter', 'Noto Sans JP', -apple-system, sans-serif" }}>
          マウスでドラッグして回転、ホイールでズームできます
        </p>
      </div>
    </div>
  );
}

