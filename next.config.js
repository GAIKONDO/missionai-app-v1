/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  assetPrefix: '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // 型チェックをスキップ（ビルド時間短縮のため）
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // クエリパラメータ方式のルーティングを使用するため、動的ルーティングは無効化
  // すべてのページは静的エクスポート可能
  webpack: (config, { isServer, webpack }) => {
    // canvasモジュールを外部化（クライアントサイドビルドでエラーを回避）
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // ビルドパフォーマンス最適化
    if (!isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^canvas$/,
          contextRegExp: /node_modules\/vega-canvas/,
        })
      );
      
      // vega-canvas.node.jsを無視する設定
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /vega-canvas\\.node\\.js$/,
        })
      );
    }
    
    // キャッシュ設定でビルド時間を短縮
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };
    
    return config;
  },
}

module.exports = nextConfig

