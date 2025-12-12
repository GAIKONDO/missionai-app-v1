'use client';

import { useEffect, useRef, useMemo } from 'react';
import { scaleOrdinal } from 'd3-scale';

export interface AlluvialNode {
  id: string;
  label: string;
  value: number;
  category?: string;
}

export interface AlluvialLink {
  source: string;
  target: string;
  value: number;
}

export interface AlluvialDiagram3DData {
  nodes: {
    left: AlluvialNode[];
    right: AlluvialNode[];
  };
  links: AlluvialLink[];
}

interface AlluvialDiagram3DProps {
  data: AlluvialDiagram3DData;
  width?: number;
  height?: number;
  title?: string;
}

export default function AlluvialDiagram3D({
  data,
  width = 1000,
  height = 600,
  title = '市場規模フロー分析（3D）',
}: AlluvialDiagram3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const meshesRef = useRef<any[]>([]);

  // カテゴリごとの色を設定
  const colorScale = useMemo(() => {
    const categories = Array.from(
      new Set([
        ...data.nodes.left.map(n => n.category || 'default'),
        ...data.nodes.right.map(n => n.category || 'default'),
      ])
    );
    return scaleOrdinal<string>()
      .domain(categories)
      .range([
        '#4A90E2', // 青
        '#50C878', // 緑
        '#FF6B6B', // 赤
        '#FFA500', // オレンジ
        '#9B59B6', // 紫
        '#1ABC9C', // ティール
        '#E74C3C', // ダークレッド
        '#3498DB', // ライトブルー
        '#2ECC71', // ダークグリーン
        '#F39C12', // ダークオレンジ
      ]);
  }, [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | null = null;

    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('troika-three-text'),
    ]).then(([THREE, OrbitControlsModule, TroikaModule]) => {
      const {
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        BoxGeometry,
        MeshStandardMaterial,
        Mesh,
        DirectionalLight,
        AmbientLight,
        Color,
        Vector3,
        Group,
        CylinderGeometry,
        CatmullRomCurve3,
        TubeGeometry,
        BufferGeometry,
        BufferAttribute,
      } = THREE;
      const OrbitControls = OrbitControlsModule.OrbitControls;
      const Text = TroikaModule.Text;

      // シーンを作成
      const scene = new Scene();
      scene.background = new Color(0xfafafa);
      sceneRef.current = scene;

      // カメラを作成
      const camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
      camera.position.set(0, 200, 800);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // レンダラーを作成
      const renderer = new WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current!.innerHTML = '';
      containerRef.current!.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // コントロールを作成
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 200;
      controls.maxDistance = 2000;
      controls.enableZoom = true;
      controls.enablePan = true;
      controlsRef.current = controls;

      // ライトを追加
      const ambientLight = new AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight1 = new DirectionalLight(0xffffff, 0.8);
      directionalLight1.position.set(200, 300, 200);
      scene.add(directionalLight1);

      const directionalLight2 = new DirectionalLight(0xffffff, 0.4);
      directionalLight2.position.set(-200, -300, -200);
      scene.add(directionalLight2);

      // データの正規化
      const totalValue = Math.max(
        data.nodes.left.reduce((sum, n) => sum + n.value, 0),
        data.nodes.right.reduce((sum, n) => sum + n.value, 0)
      );

      // 左側のノードを配置
      const leftNodes = data.nodes.left;
      const leftTotal = leftNodes.reduce((sum, n) => sum + n.value, 0);
      let leftY = 0;
      const leftNodeMeshes: Map<string, any> = new Map();

      leftNodes.forEach((node, i) => {
        const height = (node.value / totalValue) * 400;
        const y = leftY + height / 2 - 200;
        leftY += height;

        // ノードのボックスを作成
        const geometry = new BoxGeometry(60, height, 60);
        const material = new MeshStandardMaterial({
          color: new Color(colorScale(node.category || 'default')),
          metalness: 0.3,
          roughness: 0.7,
        });
        const box = new Mesh(geometry, material);
        box.position.set(-300, y, 0);
        scene.add(box);
        meshesRef.current.push(box);

        // ラベルを追加
        const label = new Text();
        label.text = node.label;
        label.fontSize = 16;
        label.color = 0x333333;
        label.anchorX = 'center';
        label.anchorY = 'middle';
        label.maxWidth = 100; // 改行をサポートするためにmaxWidthを設定
        label.position.set(-300, y, 40);
        scene.add(label);
        meshesRef.current.push(label);

        // 値のラベル
        const valueLabel = new Text();
        valueLabel.text = `${(node.value / 1000).toFixed(0)}K`;
        valueLabel.fontSize = 12;
        valueLabel.color = 0x666666;
        valueLabel.anchorX = 'center';
        valueLabel.anchorY = 'middle';
        valueLabel.position.set(-300, y, 50);
        scene.add(valueLabel);
        meshesRef.current.push(valueLabel);

        leftNodeMeshes.set(node.id, { mesh: box, y, height });
      });

      // 右側のノードを配置
      const rightNodes = data.nodes.right;
      const rightTotal = rightNodes.reduce((sum, n) => sum + n.value, 0);
      let rightY = 0;
      const rightNodeMeshes: Map<string, any> = new Map();

      rightNodes.forEach((node, i) => {
        const height = (node.value / totalValue) * 400;
        const y = rightY + height / 2 - 200;
        rightY += height;

        // ノードのボックスを作成
        const geometry = new BoxGeometry(60, height, 60);
        const material = new MeshStandardMaterial({
          color: new Color(colorScale(node.category || 'default')),
          metalness: 0.3,
          roughness: 0.7,
        });
        const box = new Mesh(geometry, material);
        box.position.set(300, y, 0);
        scene.add(box);
        meshesRef.current.push(box);

        // ラベルを追加
        const label = new Text();
        label.text = node.label;
        label.fontSize = 16;
        label.color = 0x333333;
        label.anchorX = 'center';
        label.anchorY = 'middle';
        label.maxWidth = 100; // 改行をサポートするためにmaxWidthを設定
        label.position.set(300, y, 40);
        scene.add(label);
        meshesRef.current.push(label);

        // 値のラベル
        const valueLabel = new Text();
        valueLabel.text = `${(node.value / 1000).toFixed(0)}K`;
        valueLabel.fontSize = 12;
        valueLabel.color = 0x666666;
        valueLabel.anchorX = 'center';
        valueLabel.anchorY = 'middle';
        valueLabel.position.set(300, y, 50);
        scene.add(valueLabel);
        meshesRef.current.push(valueLabel);

        rightNodeMeshes.set(node.id, { mesh: box, y, height });
      });

      // リンク（流れ）を作成
      data.links.forEach((link) => {
        const leftNode = leftNodeMeshes.get(link.source);
        const rightNode = rightNodeMeshes.get(link.target);

        if (!leftNode || !rightNode) return;

        const linkHeight = (link.value / totalValue) * 400;
        const leftY = leftNode.y;
        const rightY = rightNode.y;

        // カーブを作成（3Dの流れを表現）
        const curve = new CatmullRomCurve3([
          new Vector3(-270, leftY, 0),
          new Vector3(-100, leftY, 50),
          new Vector3(100, rightY, 50),
          new Vector3(270, rightY, 0),
        ]);

        // チューブジオメトリを作成
        const tubeGeometry = new TubeGeometry(curve, 20, linkHeight / 2, 8, false);
        const linkMaterial = new MeshStandardMaterial({
          color: new Color(colorScale(
            leftNodes.find(n => n.id === link.source)?.category || 'default'
          )),
          metalness: 0.2,
          roughness: 0.8,
          transparent: true,
          opacity: 0.7,
        });
        const tube = new Mesh(tubeGeometry, linkMaterial);
        scene.add(tube);
        meshesRef.current.push(tube);
      });

      // タイトルを追加
      if (title) {
        const titleText = new Text();
        titleText.text = title;
        titleText.fontSize = 24;
        titleText.color = 0x333333;
        titleText.anchorX = 'center';
        titleText.anchorY = 'middle';
        titleText.position.set(0, 350, 0);
        scene.add(titleText);
        meshesRef.current.push(titleText);
      }

      // アニメーションループ
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      cleanup = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
        }
        meshesRef.current.forEach(mesh => {
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m: any) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
          scene.remove(mesh);
        });
        meshesRef.current = [];
        if (renderer) {
          renderer.dispose();
        }
      };
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [data, width, height, title, colorScale]);

  return (
    <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

