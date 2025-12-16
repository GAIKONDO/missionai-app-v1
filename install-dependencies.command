#!/bin/bash

# MissionAI 依存関係インストールスクリプト
# このスクリプトは、MissionAIアプリケーションに必要な依存関係を自動的にインストールします。
# 
# 必要なもの:
# - Java 8以上（PlantUML図のレンダリング用）
#   ※ PlantUML JARファイルは既にアプリにバンドルされているため、追加インストールは不要です
# - Graphviz（PlantUML図の一部の図タイプで必要）
# - Python 3.8-3.12（ChromaDB用）
# - ChromaDB（Pythonパッケージ）
#
# 使用方法:
# 1. このファイルをダブルクリックして実行
# 2. または、ターミナルで以下のコマンドを実行:
#    chmod +x install-dependencies.command
#    ./install-dependencies.command

# 実行権限と拡張属性の自動修正
SCRIPT_PATH="$0"
if [ -f "$SCRIPT_PATH" ]; then
    # 実行権限を付与
    chmod +x "$SCRIPT_PATH" 2>/dev/null || true
    
    # macOSの拡張属性（quarantine）を削除（インターネットからダウンロードしたファイルなど）
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
echo "  MissionAI 依存関係インストール"
echo "=========================================="
echo ""

# Homebrewの確認とインストール
check_homebrew() {
    log_info "Homebrewの確認中..."
    if ! command -v brew &> /dev/null; then
        log_warning "Homebrewがインストールされていません。"
        echo ""
        read -p "Homebrewをインストールしますか？ (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Homebrewをインストール中..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            
            # Apple Silicon Macの場合、PATHを設定
            if [[ $(uname -m) == "arm64" ]]; then
                echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
                eval "$(/opt/homebrew/bin/brew shellenv)"
            fi
            
            log_success "Homebrewのインストールが完了しました。"
        else
            log_error "Homebrewが必要です。インストールをキャンセルしました。"
            exit 1
        fi
    else
        log_success "Homebrewは既にインストールされています。"
    fi
    echo ""
}

# Javaの確認とインストール
check_java() {
    log_info "Javaの確認中..."
    
    # Javaが既にインストールされているか確認
    if command -v java &> /dev/null; then
        JAVA_VERSION=$(java -version 2>&1 | head -n 1)
        log_success "Javaは既にインストールされています: $JAVA_VERSION"
        echo ""
        return 0
    fi
    
    # /usr/libexec/java_homeで確認
    if command -v /usr/libexec/java_home &> /dev/null; then
        JAVA_HOME_PATH=$(/usr/libexec/java_home 2>/dev/null || echo "")
        if [ ! -z "$JAVA_HOME_PATH" ]; then
            log_success "Javaは既にインストールされています: $JAVA_HOME_PATH"
            echo ""
            return 0
        fi
    fi
    
    log_warning "Javaがインストールされていません。"
    echo ""
    read -p "OpenJDK 17をインストールしますか？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "OpenJDK 17をインストール中..."
        brew install openjdk@17
        
        # シンボリックリンクを作成
        sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
        
        log_success "OpenJDK 17のインストールが完了しました。"
        echo ""
        log_info "JAVA_HOME環境変数を設定中..."
        echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
        echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
        
        # 現在のセッションでも有効化
        export JAVA_HOME=$(/usr/libexec/java_home 2>/dev/null || echo "/opt/homebrew/opt/openjdk@17")
        export PATH="$JAVA_HOME/bin:$PATH"
        
        log_success "JAVA_HOME環境変数を設定しました。"
    else
        log_warning "Javaのインストールをスキップしました。PlantUML図のレンダリングにはJavaが必要です。"
    fi
    echo ""
}

# Pythonの確認とインストール
check_python() {
    log_info "Pythonの確認中..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1)
        log_success "Pythonは既にインストールされています: $PYTHON_VERSION"
        
        # バージョンチェック（3.8以上、3.13未満）
        PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info.major)')
        PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info.minor)')
        
        if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 8 ] && [ "$PYTHON_MINOR" -lt 13 ]; then
            log_success "Pythonのバージョンは互換性があります（3.8-3.12）。"
            echo ""
            return 0
        else
            log_warning "Pythonのバージョンが互換性の範囲外です（3.8-3.12が必要）。"
        fi
    else
        log_warning "Python 3がインストールされていません。"
    fi
    
    echo ""
    read -p "Python 3.12をインストールしますか？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Python 3.12をインストール中..."
        brew install python@3.12
        
        log_success "Python 3.12のインストールが完了しました。"
    else
        log_warning "Pythonのインストールをスキップしました。ChromaDBの使用にはPython 3.8-3.12が必要です。"
    fi
    echo ""
}

# Graphvizの確認とインストール
check_graphviz() {
    log_info "Graphvizの確認中..."
    
    if command -v dot &> /dev/null; then
        GRAPHVIZ_VERSION=$(dot -V 2>&1 | head -n 1 || echo "unknown")
        log_success "Graphvizは既にインストールされています: $GRAPHVIZ_VERSION"
        echo ""
        return 0
    fi
    
    log_warning "Graphvizがインストールされていません。"
    log_info "Graphvizは、PlantUMLで一部の図タイプ（クラス図、シーケンス図など）をレンダリングするために必要です。"
    echo ""
    read -p "Graphvizをインストールしますか？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Graphvizをインストール中..."
        brew install graphviz
        
        # インストール確認
        if command -v dot &> /dev/null; then
            GRAPHVIZ_VERSION=$(dot -V 2>&1 | head -n 1 || echo "unknown")
            log_success "Graphvizのインストールが完了しました: $GRAPHVIZ_VERSION"
        else
            log_error "Graphvizのインストールに失敗しました。"
            log_info "手動でインストールする場合: brew install graphviz"
        fi
    else
        log_warning "Graphvizのインストールをスキップしました。一部のPlantUML図タイプがレンダリングできない可能性があります。"
    fi
    echo ""
}

# ChromaDBの確認とインストール
check_chromadb() {
    log_info "ChromaDBの確認中..."
    
    if python3 -c "import chromadb" 2>/dev/null; then
        CHROMADB_VERSION=$(python3 -c "import chromadb; print(chromadb.__version__)" 2>/dev/null || echo "unknown")
        log_success "ChromaDBは既にインストールされています: バージョン $CHROMADB_VERSION"
        echo ""
        return 0
    fi
    
    log_warning "ChromaDBがインストールされていません。"
    echo ""
    read -p "ChromaDBをインストールしますか？ (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "ChromaDBをインストール中..."
        
        # pipxが利用可能か確認
        if command -v pipx &> /dev/null; then
            log_info "pipxを使用してChromaDBをインストール中..."
            pipx install chromadb
        else
            log_info "pipを使用してChromaDBをインストール中..."
            python3 -m pip install --user chromadb
        fi
        
        # インストール確認
        if python3 -c "import chromadb" 2>/dev/null; then
            CHROMADB_VERSION=$(python3 -c "import chromadb; print(chromadb.__version__)" 2>/dev/null || echo "unknown")
            log_success "ChromaDBのインストールが完了しました: バージョン $CHROMADB_VERSION"
        else
            log_error "ChromaDBのインストールに失敗しました。"
            log_info "手動でインストールする場合: pip3 install chromadb"
        fi
    else
        log_warning "ChromaDBのインストールをスキップしました。ベクトル検索機能にはChromaDBが必要です。"
    fi
    echo ""
}

# インストール結果の確認
verify_installations() {
    echo ""
    echo "=========================================="
    echo "  インストール結果の確認"
    echo "=========================================="
    echo ""
    
    # Javaの確認
    log_info "Javaの確認:"
    if command -v java &> /dev/null; then
        java -version 2>&1 | head -n 1 | sed 's/^/  /'
        log_success "Java: インストール済み"
    else
        log_warning "Java: 未インストール"
    fi
    echo ""
    
    # Graphvizの確認
    log_info "Graphvizの確認:"
    if command -v dot &> /dev/null; then
        dot -V 2>&1 | head -n 1 | sed 's/^/  /'
        log_success "Graphviz: インストール済み"
    else
        log_warning "Graphviz: 未インストール"
    fi
    echo ""
    
    # Pythonの確認
    log_info "Pythonの確認:"
    if command -v python3 &> /dev/null; then
        python3 --version | sed 's/^/  /'
        log_success "Python: インストール済み"
    else
        log_warning "Python: 未インストール"
    fi
    echo ""
    
    # ChromaDBの確認
    log_info "ChromaDBの確認:"
    if python3 -c "import chromadb" 2>/dev/null; then
        CHROMADB_VERSION=$(python3 -c "import chromadb; print(chromadb.__version__)" 2>/dev/null || echo "unknown")
        echo "  バージョン: $CHROMADB_VERSION"
        log_success "ChromaDB: インストール済み"
    else
        log_warning "ChromaDB: 未インストール"
    fi
    echo ""
}

# メイン処理
main() {
    # 管理者権限の確認（必要に応じて）
    if [ "$EUID" -eq 0 ]; then
        log_error "このスクリプトは管理者権限で実行しないでください。"
        exit 1
    fi
    
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
    
    # 各依存関係の確認とインストール
    check_homebrew
    check_java
    check_graphviz
    check_python
    check_chromadb
    
    # インストール結果の確認
    verify_installations
    
    echo ""
    echo "=========================================="
    log_success "インストール処理が完了しました！"
    echo "=========================================="
    echo ""
    log_info "次のステップ:"
    echo "  1. MissionAIアプリケーションを起動してください"
    echo "  2. アプリケーションが正常に動作することを確認してください"
    echo ""
    log_info "注意事項:"
    echo "  - Javaがインストールされていない場合、PlantUML図がレンダリングできません"
    echo "  - ChromaDBがインストールされていない場合、ベクトル検索機能が使用できません"
    echo ""
    
    # ターミナルを開いたままにする（GUIから実行された場合）
    read -p "Enterキーを押して終了してください..."
}

# スクリプトの実行
main "$@"

