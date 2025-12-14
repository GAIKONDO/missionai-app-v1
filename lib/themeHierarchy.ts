/**
 * テーマ階層構造の型定義とユーティリティ関数
 */

export interface ThemeHierarchyLevel {
  level: number; // 1-10
  themeIds: string[]; // その階層に配置するテーマIDの配列
}

export interface ThemeHierarchyConfig {
  id?: string; // 設定ID（保存用）
  maxLevels: number; // 使用する階層数（1-10）
  levels: ThemeHierarchyLevel[]; // 各階層の設定
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_CONFIG_ID = 'a2c100-hierarchy-config';

/**
 * デフォルトの階層設定を取得
 */
export function getDefaultHierarchyConfig(): ThemeHierarchyConfig {
  return {
    maxLevels: 1,
    levels: [
      {
        level: 1,
        themeIds: [],
      },
    ],
  };
}

/**
 * 階層設定を保存
 */
export async function saveHierarchyConfig(config: ThemeHierarchyConfig): Promise<void> {
  try {
    const { doc } = await import('./localFirebase');
    const configToSave: ThemeHierarchyConfig = {
      ...config,
      id: config.id || DEFAULT_CONFIG_ID,
      updatedAt: new Date().toISOString(),
      createdAt: config.createdAt || new Date().toISOString(),
    };

    // levelsをJSON文字列に変換（データベースに保存するため）
    const dataToSave = {
      ...configToSave,
      levels: JSON.stringify(configToSave.levels),
    };

    await doc(null, 'themeHierarchyConfigs', DEFAULT_CONFIG_ID).set(dataToSave);
    console.log('✅ [saveHierarchyConfig] 階層設定を保存しました:', configToSave);
  } catch (error: any) {
    console.error('❌ [saveHierarchyConfig] 階層設定の保存に失敗しました:', error);
    throw error;
  }
}

/**
 * 階層設定を読み込み
 */
export async function loadHierarchyConfig(): Promise<ThemeHierarchyConfig> {
  try {
    const { doc } = await import('./localFirebase');
    const docRef = doc(null, 'themeHierarchyConfigs', DEFAULT_CONFIG_ID);
    const docSnap = await docRef.get();

    if (docSnap && docSnap.exists && typeof docSnap.exists === 'function' && docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ [loadHierarchyConfig] 階層設定を読み込みました:', data);
      
      // levelsをJSON文字列から配列に変換
      if (data && typeof data.levels === 'string') {
        try {
          data.levels = JSON.parse(data.levels);
        } catch (e) {
          console.warn('⚠️ [loadHierarchyConfig] levelsのパースエラー:', e);
          data.levels = [];
        }
      }
      
      return data as ThemeHierarchyConfig;
    } else {
      console.log('📝 [loadHierarchyConfig] 階層設定が見つかりません。デフォルト設定を返します。');
      return getDefaultHierarchyConfig();
    }
  } catch (error: any) {
    console.error('❌ [loadHierarchyConfig] 階層設定の読み込みに失敗しました:', error);
    return getDefaultHierarchyConfig();
  }
}

/**
 * 階層設定を検証
 */
export function validateHierarchyConfig(config: ThemeHierarchyConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxLevels < 1 || config.maxLevels > 10) {
    errors.push('階層数は1から10の間で指定してください');
  }

  if (config.levels.length !== config.maxLevels) {
    errors.push(`階層数とレベル設定の数が一致しません（階層数: ${config.maxLevels}, レベル設定数: ${config.levels.length}）`);
  }

  // 各階層の検証
  const levelNumbers = new Set<number>();
  for (const level of config.levels) {
    if (level.level < 1 || level.level > 10) {
      errors.push(`階層${level.level}のレベル番号が無効です（1-10の範囲で指定してください）`);
    }
    if (levelNumbers.has(level.level)) {
      errors.push(`階層${level.level}が重複しています`);
    }
    levelNumbers.add(level.level);

    if (!Array.isArray(level.themeIds)) {
      errors.push(`階層${level.level}のthemeIdsが配列ではありません`);
    }

    // 階層1は1つのテーマのみ
    if (level.level === 1 && level.themeIds.length > 1) {
      errors.push('階層1には1つのテーマのみ設定できます');
    }
  }

  // 階層番号が1からmaxLevelsまで連続しているか確認
  const expectedLevels = Array.from({ length: config.maxLevels }, (_, i) => i + 1);
  const actualLevels = config.levels.map(l => l.level).sort((a, b) => a - b);
  if (JSON.stringify(expectedLevels) !== JSON.stringify(actualLevels)) {
    errors.push(`階層番号が1から${config.maxLevels}まで連続していません`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
