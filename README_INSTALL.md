# MissionAI 依存関係インストールガイド

## 概要

MissionAIアプリケーションを使用するには、以下の依存関係が必要です：

- **Java 8以上**: PlantUML図のレンダリングに必要
  - **注意**: PlantUML JARファイルは既にアプリにバンドルされているため、追加でPlantUMLをインストールする必要はありません。Javaさえインストールされていれば、PlantUML図は正常にレンダリングされます。
- **Graphviz**: PlantUML図の一部の図タイプ（クラス図、シーケンス図など）をレンダリングするために必要
- **Python 3.8-3.12**: ChromaDB（ベクトル検索）に必要
- **ChromaDB**: ベクトル検索機能に必要（Pythonパッケージ）

## 自動インストール（推奨）

### macOS

#### 方法1: 自動インストール（確認なし）

**実行方法（2つの方法）:**

**方法A: ダブルクリックで実行**
1. `install-dependencies-auto.command`ファイルをダブルクリック
2. ターミナルが開き、必要な依存関係が自動的にインストールされます
3. インストール完了後、Enterキーを押して終了してください

**方法B: ターミナルから実行（権限エラーが出る場合）**
もし「適切なアクセス権限がないため実行できません」というエラーが出る場合：

1. ターミナルを開く（アプリケーション > ユーティリティ > ターミナル）
2. 以下のコマンドを実行（ファイルをターミナルにドラッグ&ドロップするとパスが自動入力されます）:
   ```bash
   cd /path/to/MissionAI  # ファイルがあるディレクトリに移動
   chmod +x install-dependencies-auto.command
   ./install-dependencies-auto.command
   ```

**注意**: 
- この方法では、確認なしで全ての依存関係がインストールされます
- 外部からダウンロードしたファイルの場合、macOSのセキュリティ機能により実行権限が制限されることがあります

#### 方法2: 対話型インストール（確認あり）

1. `install-dependencies.command`ファイルをダブルクリック
2. ターミナルが開き、インストール処理が開始されます
3. 各依存関係について、インストールの確認を求められます
4. 「y」を入力してEnterキーを押すと、インストールが開始されます

**注意**: 初回実行時、Homebrewのインストールが必要な場合があります。インストールには数分かかる場合があります。

## 手動インストール

### 1. Homebrewのインストール（まだインストールしていない場合）

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Javaのインストール

```bash
# OpenJDK 17をインストール
brew install openjdk@17

# シンボリックリンクを作成
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# 環境変数を設定（~/.zshrcに追加）
echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Pythonのインストール（必要に応じて）

```bash
# Python 3.12をインストール
brew install python@3.12
```

### 4. Graphvizのインストール

```bash
# Homebrewを使用
brew install graphviz
```

**注意**: Graphvizは、PlantUMLで一部の図タイプ（クラス図、シーケンス図など）をレンダリングするために必要です。シンプルな図（アクティビティ図など）では不要な場合もあります。

### 5. ChromaDBのインストール

```bash
# pipxを使用（推奨）
pipx install chromadb

# または、pipを使用
pip3 install chromadb
```

## インストール確認

以下のコマンドで、各依存関係が正しくインストールされているか確認できます：

```bash
# Javaの確認
java -version

# Graphvizの確認
dot -V

# Pythonの確認
python3 --version

# ChromaDBの確認
python3 -c "import chromadb; print(chromadb.__version__)"
```

## トラブルシューティング

### Javaが見つからない

- `JAVA_HOME`環境変数が設定されているか確認してください
- ターミナルを再起動してから、再度確認してください

### ChromaDBがインストールできない

- Python 3.8-3.12がインストールされているか確認してください
- `pip3 install --upgrade pip`でpipを最新版に更新してください

### 権限エラーが発生する場合

- `sudo`を使用する必要がある場合があります
- 管理者パスワードの入力が求められる場合があります

## サポート

問題が発生した場合は、以下のドキュメントを参照してください：

- [ユーザーセットアップガイド](docs/setup/USER_SETUP_GUIDE.md)
- [トラブルシューティングガイド](docs/troubleshooting/TROUBLESHOOTING.md)

