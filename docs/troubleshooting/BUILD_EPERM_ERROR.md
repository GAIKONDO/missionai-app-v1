# ビルド時のEPERMエラー対処法

## 問題の概要

`npm run build`を実行すると、以下のエラーが発生します：

```
npm error code EPERM
npm error syscall kill
npm error Error: kill EPERM
npm error     at ChildProcess.kill (node:internal/child_process:511:26)
npm error     at process.handleSignal (/Users/gaikondo/.nvm/versions/node/v22.17.0/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/signal-manager.js:14:10)
```

## 原因

このエラーは、npmのシグナルハンドラーがCursorのサンドボックス環境内でプロセスをkillしようとした際に権限エラー（EPERM）が発生することが原因です。

**重要な点**: Next.jsのビルド自体は成功している可能性があります（`out`ディレクトリにファイルが生成されている）。エラーはnpmのシグナル処理段階で発生しています。

## 解決策

### 方法1: 直接next buildを実行（推奨）

npm run経由ではなく、直接Next.jsを実行します：

```bash
cd /Users/gaikondo/Desktop/test-app/app40_MissionAI
./node_modules/.bin/next build
```

または：

```bash
npx next build
```

### 方法2: 環境変数でシグナルハンドラーを無効化

npmのシグナルハンドラーを無効化する環境変数を設定します：

```bash
export NPM_CONFIG_SIGNAL=false
npm run build
```

### 方法3: package.jsonのスクリプトを修正

`package.json`の`build`スクリプトを以下のように変更：

```json
{
  "scripts": {
    "build": "NPM_CONFIG_SIGNAL=false next build"
  }
}
```

### 方法4: ビルドスクリプトを使用

`build-mac.command`スクリプトを使用すると、適切な環境設定でビルドが実行されます。

## ビルドの確認

ビルドが成功したかどうかは、以下のコマンドで確認できます：

```bash
# outディレクトリの存在確認
ls -la out

# ビルドファイルの確認
find out -type f | wc -l

# _nextディレクトリの確認
ls -la out/_next
```

## 注意事項

- Cursorのサンドボックス環境では、npmのシグナル処理が制限される場合があります
- ビルド自体は成功していても、npmがエラーを報告する場合があります
- `out`ディレクトリにファイルが生成されていれば、ビルドは成功しています

## 関連ファイル

- `package.json`: ビルドスクリプトの定義
- `next.config.js`: Next.jsの設定
- `build-mac.command`: Mac用ビルドスクリプト
