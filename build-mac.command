#!/bin/bash

# MissionAI Mac配布用アプリケーションビルドスクリプト
# このスクリプトは、MissionAIアプリケーションをMacの配布用にパッケージ化します。
#
# 使用方法:
# 1. このファイルをダブルクリックして実行
# 2. または、ターミナルで以下のコマンドを実行:
#    chmod +x build-mac.command
#    ./build-mac.command

# 実行権限と拡張属性の自動修正
SCRIPT_PATH="$0"
if [ -f "$SCRIPT_PATH" ]; then
    # 実行権限を付与
    chmod +x "$SCRIPT_PATH" 2>/dev/null || true
    
    # macOSの拡張属性（quarantine）を削除
    if [[ "$OSTYPE" == "darwin"* ]]; then
        xattr -d com.apple.quarantine "$SCRIPT_PATH" 2>/dev/null || true
        xattr -d com.apple.metadata:kMDItemWhereFroms "$SCRIPT_PATH" 2>/dev/null || true
    fi
fi

set -e  # エラーが発生したら停止

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# タイトル表示
echo ""
echo "=========================================="
echo "  MissionAI Mac配布用アプリケーションビルド"
echo "=========================================="
echo ""

# macOSかどうか確認
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "このスクリプトはmacOS専用です。"
    exit 1
fi

# ターミナルウィンドウを開く（GUIから実行された場合）
if [ -z "$TERM" ]; then
    osascript -e 'tell application "Terminal" to do script "'"$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"'"'
    exit 0
fi

# 作業ディレクトリに移動
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

log_info "プロジェクトルート: $PROJECT_ROOT"
echo ""

# 必要なツールの確認
check_dependencies() {
    log_info "必要なツールの確認中..."
    
    local all_ok=true
    
    # Node.jsの確認
    if ! command -v node &> /dev/null; then
        log_error "Node.jsがインストールされていません。"
        all_ok=false
    else
        NODE_VERSION=$(node --version)
        log_success "Node.js: $NODE_VERSION"
    fi
    
    # npmの確認
    if ! command -v npm &> /dev/null; then
        log_error "npmがインストールされていません。"
        all_ok=false
    else
        NPM_VERSION=$(npm --version)
        log_success "npm: $NPM_VERSION"
    fi
    
    # Rustの確認
    if ! command -v cargo &> /dev/null; then
        log_error "Rust/Cargoがインストールされていません。"
        log_info "インストール方法: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        all_ok=false
    else
        RUST_VERSION=$(cargo --version)
        log_success "Rust: $RUST_VERSION"
    fi
    
    # Tauri CLIの確認
    if ! command -v tauri &> /dev/null; then
        log_warning "Tauri CLIがインストールされていません。インストールします..."
        cargo install tauri-cli --version "^2.0" || {
            log_error "Tauri CLIのインストールに失敗しました。"
            all_ok=false
        }
    else
        TAURI_VERSION=$(tauri --version 2>&1 | head -n 1 || echo "unknown")
        log_success "Tauri CLI: $TAURI_VERSION"
    fi
    
    echo ""
    
    if [ "$all_ok" = false ]; then
        log_error "必要なツールが不足しています。上記のエラーを解決してから再実行してください。"
        exit 1
    fi
}

# 依存関係のインストール
install_dependencies() {
    log_info "npm依存関係のインストール中..."
    
    if [ ! -d "node_modules" ]; then
        npm install
        log_success "npm依存関係のインストールが完了しました。"
    else
        log_info "既存のnode_modulesを確認中..."
        npm install
        log_success "npm依存関係の確認が完了しました。"
    fi
    echo ""
}

# Next.jsのビルド
build_frontend() {
    log_info "Next.jsフロントエンドのビルド中..."
    
    # 既存のoutディレクトリを削除
    if [ -d "out" ]; then
        log_info "既存のoutディレクトリを削除中..."
        rm -rf out
    fi
    
    npm run build
    
    if [ -d "out" ] && [ "$(ls -A out)" ]; then
        log_success "Next.jsフロントエンドのビルドが完了しました。"
    else
        log_error "Next.jsフロントエンドのビルドに失敗しました。"
        exit 1
    fi
    echo ""
}

# Tauriアプリのビルド
build_tauri() {
    log_info "Tauriアプリケーションのビルド中..."
    log_info "この処理には数分かかる場合があります..."
    
    # CI環境変数が設定されている場合はクリア（Tauri CLIの--ciオプションのエラーを回避）
    if [ -n "$CI" ]; then
        log_info "CI環境変数をクリア中..."
        unset CI
    fi
    
    npm run tauri:build
    
    log_success "Tauriアプリケーションのビルドが完了しました。"
    echo ""
}

# ビルド結果の確認と表示
show_build_results() {
    log_info "ビルド結果の確認中..."
    echo ""
    
    local BUNDLE_DIR="$PROJECT_ROOT/src-tauri/target/release/bundle"
    
    if [ ! -d "$BUNDLE_DIR" ]; then
        log_error "ビルド出力ディレクトリが見つかりません: $BUNDLE_DIR"
        return 1
    fi
    
    # macOSバンドルの確認
    local MACOS_DIR="$BUNDLE_DIR/macos"
    if [ -d "$MACOS_DIR" ]; then
        log_success "Macアプリケーションバンドルが見つかりました:"
        echo ""
        
        # .appファイルを探す
        local APP_FILE=$(find "$MACOS_DIR" -name "*.app" -type d | head -n 1)
        if [ -n "$APP_FILE" ]; then
            log_success "アプリケーションバンドル: $APP_FILE"
            echo ""
            
            # ファイルサイズを表示
            local APP_SIZE=$(du -sh "$APP_FILE" | cut -f1)
            log_info "サイズ: $APP_SIZE"
            echo ""
        fi
        
        # .dmgファイルを探す
        local DMG_FILE=$(find "$MACOS_DIR" -name "*.dmg" -type f | head -n 1)
        if [ -n "$DMG_FILE" ]; then
            log_success "ディスクイメージ: $DMG_FILE"
            echo ""
            
            # ファイルサイズを表示
            local DMG_SIZE=$(du -sh "$DMG_FILE" | cut -f1)
            log_info "サイズ: $DMG_SIZE"
            echo ""
        fi
        
        echo "=========================================="
        log_success "ビルドが正常に完了しました！"
        echo "=========================================="
        echo ""
        log_info "出力場所: $MACOS_DIR"
        echo ""
        log_info "次のステップ:"
        echo "  1. アプリケーションバンドル（.app）をApplicationsフォルダにコピーして使用できます"
        echo "  2. ディスクイメージ（.dmg）を配布用として使用できます"
        echo ""
        
        # Finderで開く
        if command -v open &> /dev/null; then
            read -p "Finderでビルド結果を開きますか？ (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                open "$MACOS_DIR"
            fi
        fi
    else
        log_warning "Macアプリケーションバンドルが見つかりませんでした。"
        log_info "ビルド出力ディレクトリ: $BUNDLE_DIR"
    fi
}

# メイン処理
main() {
    check_dependencies
    install_dependencies
    build_frontend
    build_tauri
    show_build_results
    
    echo ""
    log_success "すべての処理が完了しました！"
    echo ""
    
    # ターミナルを開いたままにする（GUIから実行された場合）
    read -p "Enterキーを押して終了してください..."
}

# スクリプトの実行
main "$@"
