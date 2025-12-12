'use client';

import { useEffect, useRef } from 'react';

interface ThreeSceneProps {
  config: {
    scene?: any;
    camera?: any;
    renderer?: any;
    objects?: any[];
    shaders?: {
      vertex?: string;
      fragment?: string;
    };
    animation?: string; // JavaScriptコード（文字列）
  };
  title?: string;
  width?: number;
  height?: number;
}

export default function ThreeScene({ config, title, width = 600, height = 400 }: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // 既存のシーンをクリア
    if (sceneRef.current) {
      // クリーンアップ
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    }

    containerRef.current.innerHTML = '';

    // 動的にThree.jsをインポート
    Promise.all([
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('troika-three-text')
    ]).then(([THREE, OrbitControlsModule, TroikaModule]) => {
      const { Scene, PerspectiveCamera, WebGLRenderer, BoxGeometry, MeshStandardMaterial, Mesh, DirectionalLight, AmbientLight, SphereGeometry, PlaneGeometry, ShaderMaterial, BufferGeometry, BufferAttribute, Points, PointsMaterial, Vector3, Color, CatmullRomCurve3, TubeGeometry, Raycaster, Vector2 } = THREE;
      const OrbitControls = OrbitControlsModule.OrbitControls;
      const Text = TroikaModule.Text;
      
      // TextをTHREEオブジェクトに追加してアニメーションコードからアクセス可能にする
      // RaycasterとVector2は既にTHREEオブジェクトに存在するので、そのまま使用可能
      (THREE as any).Text = Text;

      // シーンを作成
      const scene = new Scene();
      sceneRef.current = scene;

      // カメラを作成
      const camera = new PerspectiveCamera(
        config.camera?.fov || 75,
        width / height,
        config.camera?.near || 0.1,
        config.camera?.far || 1000
      );
      camera.position.set(
        config.camera?.position?.x || 0,
        config.camera?.position?.y || 0,
        config.camera?.position?.z || 5
      );
      cameraRef.current = camera;

      // レンダラーを作成
      const renderer = new WebGLRenderer({ antialias: true });
      
      // コンテナの実際のサイズを取得
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth - 32; // padding分を引く
      const containerHeight = containerRef.current.clientHeight - 32;
      const actualWidth = Math.max(containerWidth, width);
      const actualHeight = Math.max(containerHeight, height);
      
      renderer.setSize(actualWidth, actualHeight);
      renderer.setClearColor(config.renderer?.clearColor || 0xffffff, config.renderer?.clearAlpha || 1);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // カメラのアスペクト比を更新
      camera.aspect = actualWidth / actualHeight;
      camera.updateProjectionMatrix();

      // OrbitControlsを初期化（オプション）
      let controls: any = null;
      if (config.animation) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = false; // デフォルトはfalse、アニメーションコードで制御
        controls.autoRotateSpeed = 0.4;
        scene.userData.controls = controls;
        
        // スペースキーでデモモード切り替え
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
            e.preventDefault();
            controls.autoRotate = !controls.autoRotate;
          }
        };
        window.addEventListener('keydown', handleKeyDown);
        scene.userData.handleKeyDown = handleKeyDown;
      }

      // ライトを追加
      const ambientLight = new AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);

      // オブジェクトを追加
      if (config.objects && config.objects.length > 0) {
        config.objects.forEach((objConfig: any) => {
          let geometry: any;
          let material: any;

          // ジオメトリの作成
          switch (objConfig.geometry?.type) {
            case 'box':
              geometry = new BoxGeometry(
                objConfig.geometry.width || 1,
                objConfig.geometry.height || 1,
                objConfig.geometry.depth || 1
              );
              break;
            case 'sphere':
              geometry = new SphereGeometry(
                objConfig.geometry.radius || 1,
                objConfig.geometry.widthSegments || 32,
                objConfig.geometry.heightSegments || 32
              );
              break;
            case 'plane':
              geometry = new PlaneGeometry(
                objConfig.geometry.width || 1,
                objConfig.geometry.height || 1
              );
              break;
            default:
              geometry = new BoxGeometry(1, 1, 1);
          }

          // マテリアルの作成
          if (objConfig.material?.type === 'shader' && config.shaders && (config.shaders.vertex || config.shaders.fragment)) {
            // カスタムシェーダーマテリアル（オブジェクトごと）
            const uniforms: any = {
              uTime: { value: 0 }
            };
            
            // オブジェクト固有のuniformsを追加
            if (objConfig.material?.uniforms) {
              Object.keys(objConfig.material.uniforms).forEach(key => {
                const uniform = objConfig.material.uniforms[key];
                if (uniform.type === 'f') {
                  uniforms[key] = { value: uniform.value };
                } else if (uniform.type === 'v3') {
                  uniforms[key] = { value: new THREE.Vector3(...uniform.value) };
                }
              });
            }
            
            material = new ShaderMaterial({
              vertexShader: config.shaders.vertex || `
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                uniform float uTime;
                
                void main() {
                  vPosition = position;
                  vNormal = normal;
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: config.shaders.fragment || `
                uniform float uTime;
                uniform vec3 uColor;
                varying vec3 vPosition;
                varying vec3 vNormal;
                varying vec2 vUv;
                
                void main() {
                  vec3 color = uColor;
                  gl_FragColor = vec4(color, 1.0);
                }
              `,
              uniforms: uniforms
            });
          } else if (config.shaders && (config.shaders.vertex || config.shaders.fragment)) {
            // グローバルシェーダーマテリアル
            material = new ShaderMaterial({
              vertexShader: config.shaders.vertex || `
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                  vPosition = position;
                  vNormal = normal;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: config.shaders.fragment || `
                uniform float uTime;
                varying vec3 vPosition;
                varying vec3 vNormal;
                void main() {
                  vec3 color = vec3(0.5, 0.5, 0.8);
                  gl_FragColor = vec4(color, 1.0);
                }
              `,
              uniforms: {
                uTime: { value: 0 }
              }
            });
          } else {
            // 標準マテリアル
            material = new MeshStandardMaterial({
              color: objConfig.material?.color || 0x1f2933,
              metalness: objConfig.material?.metalness || 0.5,
              roughness: objConfig.material?.roughness || 0.5,
            });
          }

          const mesh = new Mesh(geometry, material);
          mesh.position.set(
            objConfig.position?.x || 0,
            objConfig.position?.y || 0,
            objConfig.position?.z || 0
          );
          mesh.rotation.set(
            objConfig.rotation?.x || 0,
            objConfig.rotation?.y || 0,
            objConfig.rotation?.z || 0
          );
          scene.add(mesh);
        });
      } else if (!config.animation) {
        // デフォルトのキューブ（アニメーションコードがない場合のみ）
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshStandardMaterial({ color: 0x1f2933 });
        const cube = new Mesh(geometry, material);
        scene.add(cube);
      }

      // アニメーション
      let time = 0;
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);
        time += 0.016; // 約60fps

        // シェーダーのuniform変数を更新
        scene.children.forEach((child: any) => {
          if (child instanceof Mesh && child.material instanceof ShaderMaterial) {
            if (child.material.uniforms) {
              if (child.material.uniforms.uTime) {
                child.material.uniforms.uTime.value = time;
              }
              // uColorなどの他のuniformsも更新可能
            }
          }
        });

        // OrbitControlsの更新
        if (scene.userData.controls) {
          scene.userData.controls.update();
        }

        // カスタムアニメーションコードを実行
        if (config.animation) {
          try {
            // 安全なスコープでアニメーションコードを実行
            const animationFn = new Function('scene', 'camera', 'renderer', 'THREE', 'time', config.animation);
            animationFn(scene, camera, renderer, THREE, time);
          } catch (error) {
            console.error('Animation error:', error);
          }
        } else {
          // デフォルトアニメーション：シーン内のオブジェクトを回転
          scene.children.forEach((child: any) => {
            if (child instanceof Mesh) {
              child.rotation.x += 0.01;
              child.rotation.y += 0.01;
            }
          });
        }

        renderer.render(scene, camera);
      };

      animate();
    }).catch((error: any) => {
      console.error('Three.js loading error:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="padding: 20px; color: #dc3545; border: 1px solid #dc3545; border-radius: 6px; background: rgba(220, 53, 69, 0.1);">
          <strong>Three.jsの読み込みエラー:</strong><br/>
          ${error?.message || '不明なエラーが発生しました'}<br/>
          <small style="font-size: 11px; margin-top: 8px; display: block;">詳細はブラウザのコンソール（F12）を確認してください。</small>
        </div>`;
      }
    });

    // クリーンアップ
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (sceneRef.current && sceneRef.current.userData.controls) {
        sceneRef.current.userData.controls.dispose();
      }
      if (sceneRef.current && sceneRef.current.userData.handleMouseMove && rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.removeEventListener('mousemove', sceneRef.current.userData.handleMouseMove);
      }
      if (sceneRef.current && sceneRef.current.userData.handleKeyDown) {
        window.removeEventListener('keydown', sceneRef.current.userData.handleKeyDown);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [config, width, height]);

  return (
    <div style={{ marginBottom: '24px' }}>
      {title && (
        <div
          style={{
            background: 'rgba(31, 41, 51, 0.05)',
            border: '1px solid var(--color-border-color)',
            borderBottom: 'none',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-light)',
          }}
        >
          {title}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          border: '1px solid var(--color-border-color)',
          borderRadius: title ? '0 0 6px 6px' : '6px',
          padding: 0,
          backgroundColor: config.renderer?.clearColor ? `#${config.renderer.clearColor.toString(16).padStart(6, '0')}` : '#fff',
          overflow: 'hidden',
          width: '100%',
          height: `${height}px`,
          position: 'relative',
        }}
      />
    </div>
  );
}

