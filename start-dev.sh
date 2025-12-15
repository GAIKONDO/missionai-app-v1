#!/bin/bash

# 開発環境起動スクリプト
# シェルから実行可能

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# カラー出力用の関数
print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

# タイトル表示
echo "=========================================="
echo "  MissionAI 開発環境起動"
echo "=========================================="
echo ""

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null; then
    print_error "Node.jsがインストールされていません"
    echo "Node.jsをインストールしてください: https://nodejs.org/"
    exit 1
fi

# npmがインストールされているか確認
if ! command -v npm &> /dev/null; then
    print_error "npmがインストールされていません"
    exit 1
fi

# Rustがインストールされているか確認
if ! command -v cargo &> /dev/null; then
    print_error "Rustがインストールされていません"
    echo "Rustをインストールしてください: https://www.rust-lang.org/tools/install"
    exit 1
fi

# 依存関係がインストールされているか確認
if [ ! -d "node_modules" ]; then
    print_info "依存関係をインストール中..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "依存関係のインストールに失敗しました"
        exit 1
    fi
    print_success "依存関係のインストールが完了しました"
    echo ""
fi

# 開発サーバーを起動
print_info "開発サーバーを起動しています..."
print_info "ポート3010でNext.js開発サーバーが起動します"
print_info "Tauriアプリケーションが自動的に起動します"
echo ""
print_info "停止するには、Ctrl+C を押してください"
echo ""

# Tauri開発サーバーを起動
npm run tauri:dev

