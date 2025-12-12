'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    p5?: any;
  }
}

interface TypographyArtProps {
  words: string[];
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  minFontSize?: number;
  maxFontSize?: number;
  rotationRange?: number;
  showDownloadButton?: boolean;
}

export default function TypographyArt({
  words: initialWords,
  width = 800,
  height = 600,
  backgroundColor = '#ffffff',
  textColor = '#000000',
  minFontSize = 24,
  maxFontSize = 120,
  rotationRange = 45,
  showDownloadButton = true,
}: TypographyArtProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);
  const p5LoadedRef = useRef(false);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  
  // ワードの状態管理（色情報も含む）
  interface WordWithColor {
    word: string;
    color: string;
  }
  
  const [words, setWords] = useState<string[]>(initialWords);
  const [wordColors, setWordColors] = useState<Map<string, string>>(new Map());
  const [isEditing, setIsEditing] = useState(false);
  const [editWords, setEditWords] = useState<WordWithColor[]>([]);
  const [shouldRegenerate, setShouldRegenerate] = useState(true); // 再配置フラグ（初期はtrueで初回生成）
  const [isInitialized, setIsInitialized] = useState(false); // 初期化済みフラグ
  
  // デフォルトの色パレット
  const colorPalette = [
    '#000000', // 黒
    '#dc3545', // 赤
    '#1a1a1a', // 濃いグレー
    '#4a4a4a', // 中程度のグレー
    '#808080', // 薄いグレー
    '#0066cc', // 青
    '#28a745', // 緑
    '#ffc107', // 黄色
    '#17a2b8', // シアン
    '#6f42c1', // 紫
  ];

  // 編集ウィンドウを開く
  const handleOpenEdit = () => {
    // 現在のワードを編集用の配列にコピー（20個まで、色情報も含む）
    const wordsToEdit: WordWithColor[] = [];
    
    // 既存のワードをコピー（色情報も含む）
    for (let i = 0; i < Math.min(words.length, 20); i++) {
      const word = words[i] || '';
      const color = wordColors.get(word) || '#000000'; // デフォルトは黒
      wordsToEdit.push({ word, color });
    }
    
    // 20個になるまで空文字を追加
    while (wordsToEdit.length < 20) {
      wordsToEdit.push({ word: '', color: '#000000' });
    }
    
    setEditWords(wordsToEdit);
    setIsEditing(true);
  };

  // 編集を保存
  const handleSaveEdit = () => {
    // 空でないワードのみを保存
    const newWords: string[] = [];
    const newWordColors = new Map<string, string>();
    
    editWords.forEach((item) => {
      if (item.word.trim() !== '') {
        newWords.push(item.word.trim());
        newWordColors.set(item.word.trim(), item.color);
      }
    });
    
    if (newWords.length > 0) {
      setWords(newWords);
      setWordColors(newWordColors);
      setIsEditing(false);
      // 再配置はしない（shouldRegenerateはfalseのまま）
    }
  };

  // 再配置ボタンのハンドラー
  const handleRegenerate = () => {
    setShouldRegenerate(true);
  };

  // 編集をキャンセル
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  useEffect(() => {
    if (!containerRef.current || words.length === 0) {
      return;
    }

    // 初期化済みで、再生成フラグがfalseの場合は再生成しない
    if (isInitialized && !shouldRegenerate && p5InstanceRef.current) {
      return;
    }

    const initTypography = () => {
      if (typeof window === 'undefined' || !window.p5) {
        return;
      }

      // 既存のインスタンスを必ず削除（重複を防ぐため）
      if (p5InstanceRef.current) {
        try {
          p5InstanceRef.current.remove();
        } catch (e) {
          console.warn('p5インスタンスの削除エラー:', e);
        }
        p5InstanceRef.current = null;
      }

      // コンテナの中身をクリア（重複を防ぐため）
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      if (!containerRef.current) {
        return;
      }

      const sketch = (p: any) => {
        // 単語の配置情報を保存
        const wordObjects: Array<{
          word: string;
          x: number;
          y: number;
          fontSize: number;
          rotation: number;
          weight: number;
          color: string;
        }> = [];
        
        // ドラッグ用の状態
        let selectedWordIndex: number | null = null;
        let dragOffset = { x: 0, y: 0 };
        let isDragging = false;
        
        // PNGダウンロード関数をグローバルに公開
        (window as any).downloadTypographyPNG = () => {
          if (p.canvas) {
            // キャンバスをPNGとしてダウンロード
            p.saveCanvas(p.canvas, 'typography-art', 'png');
          }
        };

        // より精密な衝突検出用の関数（回転を考慮）
        // textAlign(p.LEFT, p.BASELINE)で描画するため、基準点は(x, y)で左端・ベースライン
        const getBoundingBox = (
          x: number,
          y: number,
          fontSize: number,
          rotation: number,
          word: string
        ): { minX: number; maxX: number; minY: number; maxY: number } => {
          p.textSize(fontSize);
          const w = p.textWidth(word);
          const h = fontSize * 1.2; // 行の高さを考慮
          const rad = p.radians(rotation);
          
          // textAlign(p.LEFT, p.BASELINE)なので、基準点(x, y)は左端・ベースライン
          // テキストの4つの角の相対座標を計算
          // 左端・ベースライン基準なので：
          // - 左上: (0, -ascent) または (0, -h*0.8) 程度
          // - 右上: (w, -h*0.8)
          // - 右下: (w, h*0.2)
          // - 左下: (0, h*0.2)
          // より正確なascent/descentの計算
          // 日本語文字の場合、ascentが大きめになることがあるので、少し控えめに
          const ascent = fontSize * 0.75; // ベースラインより上の部分（0.8から0.75に調整）
          const descent = fontSize * 0.15; // ベースラインより下の部分（0.2から0.15に調整）
          
          // 4つの角の座標（基準点(x, y)からの相対位置）
          const corners = [
            { x: 0, y: -ascent },        // 左上
            { x: w, y: -ascent },        // 右上
            { x: w, y: descent },        // 右下
            { x: 0, y: descent }         // 左下
          ];
          
          // 回転後の座標を計算
          const cosR = p.cos(rad);
          const sinR = p.sin(rad);
          const rotatedCorners = corners.map(corner => {
            return {
              x: corner.x * cosR - corner.y * sinR,
              y: corner.x * sinR + corner.y * cosR
            };
          });
          
          // バウンディングボックスの最小値と最大値を計算
          let minX = rotatedCorners[0].x;
          let maxX = rotatedCorners[0].x;
          let minY = rotatedCorners[0].y;
          let maxY = rotatedCorners[0].y;
          
          for (const corner of rotatedCorners) {
            minX = Math.min(minX, corner.x);
            maxX = Math.max(maxX, corner.x);
            minY = Math.min(minY, corner.y);
            maxY = Math.max(maxY, corner.y);
          }
          
          // 余白を追加（文字間のスペースを確保）
          // パディングを最小限にして、実際の描画範囲に近づける
          const padding = 5; // 10から5に減らして、より正確な範囲を確保
          
          return {
            minX: x + minX - padding,
            maxX: x + maxX + padding,
            minY: y + minY - padding,
            maxY: y + maxY + padding,
          };
        };

        const checkCollision = (
          x: number,
          y: number,
          fontSize: number,
          rotation: number,
          word: string,
          excludeIndex: number | null = null // 除外するインデックス（自分自身を除外するため）
        ): boolean => {
          const box = getBoundingBox(x, y, fontSize, rotation, word);
          
          // ボタンエリアを除外（右上のボタンエリア: top: 12px, 高さ約50px）
          const buttonAreaTop = 12;
          const buttonAreaBottom = 70; // ボタンの高さ + 余白を考慮
          const buttonAreaRight = width;
          const buttonAreaLeft = width - 400; // ボタンが右側にあるので、右側400pxを除外
          
          // ボタンエリアと重なっている場合は衝突とみなす
          if (
            box.minX < buttonAreaRight &&
            box.maxX > buttonAreaLeft &&
            box.minY < buttonAreaBottom &&
            box.maxY > buttonAreaTop
          ) {
            return true; // ボタンエリアと衝突
          }
          
          // バウンディングボックスがキャンバス内に完全に収まるかチェック
          // マージンを最小限にして、右端まで使用可能にする
          const margin = 2; // 5から2に減らして、右端まで使用可能に
          // ただし、テキストが完全にキャンバス外に出ないようにする
          if (
            box.minX < -margin ||
            box.maxX > width + margin ||
            box.minY < -margin ||
            box.maxY > height + margin
          ) {
            return true; // はみ出している
          }

          // 他の単語との衝突チェック（自分自身は除外）
          for (let i = 0; i < wordObjects.length; i++) {
            if (excludeIndex !== null && i === excludeIndex) {
              continue; // 自分自身はスキップ
            }
            const obj = wordObjects[i];
            const objBox = getBoundingBox(obj.x, obj.y, obj.fontSize, obj.rotation, obj.word);
            
            // バウンディングボックスの衝突判定（より厳密に）
            if (
              box.minX < objBox.maxX &&
              box.maxX > objBox.minX &&
              box.minY < objBox.maxY &&
              box.maxY > objBox.minY
            ) {
              return true;
            }
          }
          return false;
        };

        p.setup = () => {
          p.createCanvas(width, height);
          p.pixelDensity(2);
          p.background(backgroundColor);
          p.textAlign(p.LEFT, p.BASELINE);

          // グリッドベースの配置を試みる
          const gridCols = Math.ceil(Math.sqrt(words.length * 1.5));
          const gridRows = Math.ceil(words.length / gridCols);
          const cellWidth = width / (gridCols + 1);
          const cellHeight = height / (gridRows + 1);
          
          // 単語を配置（重ならないように厳密に配置）
          const maxAttempts = 2000; // 試行回数を増やす
          let gridIndex = 0;
          
          // 固定角度の配列（0度、90度、180度、270度）
          const fixedRotations = [0, 90, 180, 270];
          
          // 最大サイズに固定するワード
          const largeWords = [
            'パーソナルDX',
            'パーソナルデータレイクス',
            'ユーザーフレンドリーUI',
            'ミッションクリティカル'
          ];
          
          // 最大サイズのワードを先に配置するためにソート
          const sortedWords = [...words].sort((a, b) => {
            const aIsLarge = largeWords.includes(a);
            const bIsLarge = largeWords.includes(b);
            if (aIsLarge && !bIsLarge) return -1;
            if (!aIsLarge && bIsLarge) return 1;
            return 0;
          });
          
          for (let i = 0; i < sortedWords.length; i++) {
            const word = sortedWords[i];
            let placed = false;
            let attempts = 0;

            // 最大サイズに固定するワードかどうかを判定
            const isLargeWord = largeWords.includes(word);
            
            // フォントサイズを4パターンに分類
            const sizePatterns = [
              maxFontSize,                    // 最大サイズ（最重要）
              maxFontSize * 0.7,             // 大サイズ
              maxFontSize * 0.5,             // 中サイズ
              minFontSize                     // 小サイズ
            ];
            
            // 最大サイズのワードは常に最大サイズ、それ以外は順番に分類
            let patternIndex: number;
            if (isLargeWord) {
              patternIndex = 0; // 最大サイズに固定
            } else {
              // 最大サイズ以外のワードのインデックスを計算
              const nonLargeIndex = i - largeWords.filter(w => sortedWords.indexOf(w) < i).length;
              patternIndex = (nonLargeIndex % 3) + 1; // 1, 2, 3のいずれか（大、中、小）
            }
            
            const fontSize = sizePatterns[patternIndex];

            // フォントの太さを決定（サイズに応じて）
            const weight = patternIndex === 0 ? 700 : patternIndex === 1 ? 600 : patternIndex === 2 ? 500 : 400;
            
            // 色を決定（wordColorsから取得、なければサイズに応じたデフォルト）
            let color: string;
            const savedColor = wordColors.get(word);
            if (savedColor) {
              color = savedColor;
            } else if (patternIndex === 0) {
              // 最大サイズ：最も目立つ色（赤）
              color = '#dc3545';
            } else if (patternIndex === 1) {
              // 大サイズ：やや目立つ色（濃いグレー）
              color = '#1a1a1a';
            } else if (patternIndex === 2) {
              // 中サイズ：中間の色（中程度のグレー）
              color = '#4a4a4a';
            } else {
              // 小サイズ：控えめな色（薄いグレー）
              color = '#808080';
            }

            // まずグリッドベースの位置を試す
            while (!placed && attempts < maxAttempts) {
              let x: number, y: number, rotation: number;
              
              if (attempts < gridCols * gridRows * 4) {
                // グリッドベースの配置（各グリッドセルで4つの角度を試す）
                const cellIndex = Math.floor(attempts / 4);
                const col = cellIndex % gridCols;
                const row = Math.floor(cellIndex / gridCols);
                const angleIndex = attempts % 4;
                
                x = cellWidth * (col + 1) + p.random(-cellWidth * 0.25, cellWidth * 0.25);
                y = cellHeight * (row + 1) + p.random(-cellHeight * 0.25, cellHeight * 0.25);
                rotation = fixedRotations[angleIndex];
              } else {
                // ランダムな位置、固定角度
                x = p.random(100, width - 100);
                y = p.random(100, height - 100);
                rotation = fixedRotations[p.floor(p.random(fixedRotations.length))];
              }

              // 衝突チェック（境界チェックも含む）
              if (!checkCollision(x, y, fontSize, rotation, word)) {
                wordObjects.push({
                  word,
                  x,
                  y,
                  fontSize,
                  rotation,
                  weight,
                  color,
                });
                placed = true;
              }
              attempts++;
            }

            // 配置できなかった場合は、より広い範囲で再試行
            if (!placed) {
              let retryAttempts = 0;
              while (!placed && retryAttempts < 1000) {
                const x = p.random(80, width - 80);
                const y = p.random(80, height - 80);
                const rotation = fixedRotations[p.floor(p.random(fixedRotations.length))];
                
                if (!checkCollision(x, y, fontSize, rotation, word)) {
                  wordObjects.push({
                    word,
                    x,
                    y,
                    fontSize,
                    rotation,
                    weight,
                    color,
                  });
                  placed = true;
                }
                retryAttempts++;
              }
              
              // それでも配置できない場合は、最小限の重なりを許容して配置
              if (!placed) {
                const x = p.random(80, width - 80);
                const y = p.random(80, height - 80);
                const rotation = fixedRotations[p.floor(p.random(fixedRotations.length))];
                wordObjects.push({
                  word,
                  x,
                  y,
                  fontSize,
                  rotation,
                  weight,
                  color,
                });
              }
            }
          }
          
          // 配置を最適化（重なりを解消するために微調整）
          for (let iter = 0; iter < 5; iter++) {
            for (let i = 0; i < wordObjects.length; i++) {
              const obj = wordObjects[i];
              
              // より多くの方向を試す
              const directions = [
                { dx: 0, dy: -10 },
                { dx: 0, dy: 10 },
                { dx: -10, dy: 0 },
                { dx: 10, dy: 0 },
                { dx: -7, dy: -7 },
                { dx: 7, dy: -7 },
                { dx: -7, dy: 7 },
                { dx: 7, dy: 7 },
              ];
              
              for (const dir of directions) {
                const newX = obj.x + dir.dx;
                const newY = obj.y + dir.dy;
                
                if (newX >= 100 && newX <= width - 100 && 
                    newY >= 100 && newY <= height - 100) {
                  
                  // 一時的に衝突チェック
                  let hasCollision = false;
                  const tempBox = getBoundingBox(newX, newY, obj.fontSize, obj.rotation, obj.word);
                  
                  for (let j = 0; j < wordObjects.length; j++) {
                    if (i === j) continue;
                    const otherBox = getBoundingBox(
                      wordObjects[j].x,
                      wordObjects[j].y,
                      wordObjects[j].fontSize,
                      wordObjects[j].rotation,
                      wordObjects[j].word
                    );
                    if (
                      tempBox.minX < otherBox.maxX &&
                      tempBox.maxX > otherBox.minX &&
                      tempBox.minY < otherBox.maxY &&
                      tempBox.maxY > otherBox.minY
                    ) {
                      hasCollision = true;
                      break;
                    }
                  }
                  
                  if (!hasCollision) {
                    obj.x = newX;
                    obj.y = newY;
                    break;
                  }
                }
              }
            }
          }

          // 描画
          p.push();
          for (let i = 0; i < wordObjects.length; i++) {
            const obj = wordObjects[i];
            const isSelected = selectedWordIndex === i;
            
            p.push();
            p.translate(obj.x, obj.y);
            p.rotate(p.radians(obj.rotation));
            p.textSize(obj.fontSize);
            p.textStyle(p.NORMAL);
            p.textFont('sans-serif');
            
            // 選択中の文字は少し透明度を下げる
            if (isSelected) {
              p.fill(obj.color);
              p.stroke(255, 0, 0); // 赤い枠線
              p.strokeWeight(2);
            } else {
              p.fill(obj.color);
              p.noStroke();
            }
            
            p.textAlign(p.LEFT, p.BASELINE);
            p.text(obj.word, 0, 0);
            p.pop();
          }
          p.pop();
        };

        // マウスで文字をクリックしたとき
        p.mousePressed = () => {
          // クリック位置にある文字を検出
          for (let i = wordObjects.length - 1; i >= 0; i--) {
            const obj = wordObjects[i];
            const box = getBoundingBox(obj.x, obj.y, obj.fontSize, obj.rotation, obj.word);
            
            if (
              p.mouseX >= box.minX &&
              p.mouseX <= box.maxX &&
              p.mouseY >= box.minY &&
              p.mouseY <= box.maxY
            ) {
              selectedWordIndex = i;
              isDragging = true;
              // クリック位置と文字の中心のオフセットを計算
              dragOffset.x = p.mouseX - obj.x;
              dragOffset.y = p.mouseY - obj.y;
              return false; // イベントの伝播を防ぐ
            }
          }
          return false;
        };

        // マウスをドラッグしたとき
        p.mouseDragged = () => {
          if (isDragging && selectedWordIndex !== null) {
            const obj = wordObjects[selectedWordIndex];
            // 新しい位置を計算
            let newX = p.mouseX - dragOffset.x;
            let newY = p.mouseY - dragOffset.y;
            
            // ドラッグ中は簡易的な境界チェックのみ（バウンディングボックスは使わない）
            // 文字の中心点がキャンバス内にあるかチェック（マージンを小さくして自由に移動できるように）
            const centerMargin = 10; // 中心点の余白（50から10に減らして、より自由に移動可能に）
            
            // 境界を超えている場合は、境界内に制限
            if (newX < centerMargin) {
              newX = centerMargin;
            } else if (newX > width - centerMargin) {
              newX = width - centerMargin;
            }
            
            if (newY < centerMargin) {
              newY = centerMargin;
            } else if (newY > height - centerMargin) {
              newY = height - centerMargin;
            }
            
            // 位置を更新（常に更新、境界内に制限済み）
            obj.x = newX;
            obj.y = newY;
            
            p.redraw();
            return false; // イベントの伝播を防ぐ
          }
          return false;
        };

        // マウスを離したとき
        p.mouseReleased = () => {
          if (isDragging && selectedWordIndex !== null) {
            // ドロップ時にバウンディングボックスで最終確認
            const obj = wordObjects[selectedWordIndex];
            const box = getBoundingBox(obj.x, obj.y, obj.fontSize, obj.rotation, obj.word);
            
            // 境界チェック（最終確認、より緩やかに）
            const margin = 10;
            let adjustedX = obj.x;
            let adjustedY = obj.y;
            
            // 境界外の場合は中心点を調整して境界内に収める
            if (box.minX < margin) {
              adjustedX += (margin - box.minX);
            } else if (box.maxX > width - margin) {
              adjustedX -= (box.maxX - (width - margin));
            }
            
            if (box.minY < margin) {
              adjustedY += (margin - box.minY);
            } else if (box.maxY > height - margin) {
              adjustedY -= (box.maxY - (height - margin));
            }
            
            // 調整後の位置が有効か確認（自分自身との衝突は除外）
            if (!checkCollision(adjustedX, adjustedY, obj.fontSize, obj.rotation, obj.word, selectedWordIndex)) {
              obj.x = adjustedX;
              obj.y = adjustedY;
            }
            // 調整できない場合は現在の位置を維持
          }
          
          isDragging = false;
          // 選択を維持（クリックで解除したい場合は selectedWordIndex = null; に変更）
          p.redraw();
          return false;
        };

        // キーボード入力で回転とサイズ調整
        p.keyPressed = () => {
          if (selectedWordIndex !== null) {
            const obj = wordObjects[selectedWordIndex];
            const fixedRotations = [0, 90, 180, 270];
            
            // Shiftキーが押されているかチェック
            const isShiftPressed = p.keyIsDown(p.SHIFT);
            
            if (isShiftPressed) {
              // Shift + 矢印キーでサイズ調整
              if (p.keyCode === p.RIGHT_ARROW) {
                // Shift + →: サイズを大きくする
                const sizeStep = Math.max(2, obj.fontSize * 0.1); // 10%ずつ増やす（最小2px）
                const newSize = Math.min(maxFontSize * 1.5, obj.fontSize + sizeStep); // 最大サイズの1.5倍まで
                obj.fontSize = newSize;
                p.redraw();
              } else if (p.keyCode === p.LEFT_ARROW) {
                // Shift + ←: サイズを小さくする
                const sizeStep = Math.max(2, obj.fontSize * 0.1); // 10%ずつ減らす（最小2px）
                const newSize = Math.max(minFontSize * 0.5, obj.fontSize - sizeStep); // 最小サイズの0.5倍まで
                obj.fontSize = newSize;
                p.redraw();
              }
            } else {
              // 通常の矢印キーで回転
              if (p.keyCode === p.UP_ARROW) {
                // ↑キー: 90度回転（時計回り）
                const currentIndex = fixedRotations.indexOf(obj.rotation);
                const nextIndex = (currentIndex + 1) % fixedRotations.length;
                obj.rotation = fixedRotations[nextIndex];
                p.redraw();
              } else if (p.keyCode === p.DOWN_ARROW) {
                // ↓キー: -90度回転（反時計回り）
                const currentIndex = fixedRotations.indexOf(obj.rotation);
                const prevIndex = (currentIndex - 1 + fixedRotations.length) % fixedRotations.length;
                obj.rotation = fixedRotations[prevIndex];
                p.redraw();
              } else if (p.keyCode === p.RIGHT_ARROW) {
                // →キー: 90度回転（時計回り）
                const currentIndex = fixedRotations.indexOf(obj.rotation);
                const nextIndex = (currentIndex + 1) % fixedRotations.length;
                obj.rotation = fixedRotations[nextIndex];
                p.redraw();
              } else if (p.keyCode === p.LEFT_ARROW) {
                // ←キー: -90度回転（反時計回り）
                const currentIndex = fixedRotations.indexOf(obj.rotation);
                const prevIndex = (currentIndex - 1 + fixedRotations.length) % fixedRotations.length;
                obj.rotation = fixedRotations[prevIndex];
                p.redraw();
              }
            }
            
            return false; // イベントの伝播を防ぐ
          }
          return false;
        };

        p.draw = () => {
          // 常に再描画（ドラッグ中も通常時も）
          p.background(backgroundColor);
          p.push();
          for (let i = 0; i < wordObjects.length; i++) {
            const obj = wordObjects[i];
            const isSelected = selectedWordIndex === i;
            
            p.push();
            p.translate(obj.x, obj.y);
            p.rotate(p.radians(obj.rotation));
            p.textSize(obj.fontSize);
            p.textStyle(p.NORMAL);
            p.textFont('sans-serif');
            
            if (isSelected) {
              p.fill(obj.color);
              p.stroke(255, 0, 0); // 赤い枠線
              p.strokeWeight(2);
            } else {
              p.fill(obj.color);
              p.noStroke();
            }
            
            p.textAlign(p.LEFT, p.BASELINE);
            p.text(obj.word, 0, 0);
            p.pop();
          }
          p.pop();
        };
      };

      p5InstanceRef.current = new window.p5(sketch, containerRef.current);
      setIsInitialized(true); // 初期化完了
    };

    if (p5LoadedRef.current && typeof window !== 'undefined' && window.p5) {
      initTypography();
    }

    const handleP5Loaded = () => {
      p5LoadedRef.current = true;
      if (typeof window !== 'undefined' && window.p5) {
        initTypography();
      }
    };

    window.addEventListener('p5loaded', handleP5Loaded);

    // スクリプトが既に読み込まれている場合
    if (typeof window !== 'undefined' && window.p5) {
      p5LoadedRef.current = true;
      initTypography();
    }

    return () => {
      window.removeEventListener('p5loaded', handleP5Loaded);
      // クリーンアップ時に必ずインスタンスを削除（重複を防ぐため）
      if (p5InstanceRef.current) {
        try {
          p5InstanceRef.current.remove();
        } catch (e) {
          console.warn('p5インスタンスのクリーンアップエラー:', e);
        }
        p5InstanceRef.current = null;
      }
      // コンテナの中身もクリア
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [words, wordColors, width, height, backgroundColor, textColor, minFontSize, maxFontSize, rotationRange, shouldRegenerate]);

  // 再配置後にフラグをリセット
  useEffect(() => {
    if (shouldRegenerate && isInitialized) {
      // 再生成が完了したらフラグをリセット
      setTimeout(() => {
        setShouldRegenerate(false);
      }, 100);
    }
  }, [shouldRegenerate, isInitialized]);

  const handleDownload = () => {
    if (typeof window !== 'undefined' && (window as any).downloadTypographyPNG) {
      (window as any).downloadTypographyPNG();
    }
  };

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"
        onLoad={() => {
          p5LoadedRef.current = true;
          if (typeof window !== 'undefined' && window.p5) {
            setTimeout(() => {
              window.dispatchEvent(new Event('p5loaded'));
            }, 100);
          }
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            border: '1px solid var(--color-border-color)',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: backgroundColor,
          }}
        />
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
        }}>
          <button
            onClick={handleOpenEdit}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(31, 41, 51, 0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(31, 41, 51, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(31, 41, 51, 0.9)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            ワードを編集
          </button>
          <button
            onClick={handleRegenerate}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(139, 92, 246, 0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.9)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            配置を再生成
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            PNG画像をダウンロード
          </button>
        </div>
      </div>
      
      {/* 編集ウィンドウ */}
      {isEditing && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            // 背景をクリックした場合のみキャンセル
            if (e.target === e.currentTarget) {
              handleCancelEdit();
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => {
              // モーダル内のクリックイベントの伝播を止める
              e.stopPropagation();
            }}
          >
            <h3 style={{
              marginTop: 0,
              marginBottom: '20px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text)',
            }}>
              ワードを編集（最大20個）
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginBottom: '20px',
            }}>
              {editWords.map((item, index) => (
                <div
                  key={`word-${index}`}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    key={`word-input-${index}`}
                    type="text"
                    value={item.word || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newEditWords = [...editWords];
                      newEditWords[index] = { ...newEditWords[index], word: e.target.value };
                      setEditWords(newEditWords);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && index < editWords.length - 1) {
                        const nextInput = document.querySelector(`input[key="word-input-${index + 1}"]`) as HTMLInputElement;
                        if (nextInput) {
                          nextInput.focus();
                        }
                      }
                    }}
                    placeholder={`ワード ${index + 1}`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--color-border-color)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    {colorPalette.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newEditWords = [...editWords];
                          newEditWords[index] = { ...newEditWords[index], color };
                          setEditWords(newEditWords);
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: item.color === color ? '2px solid var(--color-primary)' : '2px solid transparent',
                          backgroundColor: color,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: item.color === color ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = item.color === color ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)';
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

