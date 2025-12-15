# PlantUML JARファイルの配置

このディレクトリに`plantuml.jar`ファイルを配置してください。

## ダウンロード方法

1. Maven Repositoryから最新版をダウンロード:
   https://mvnrepository.com/artifact/net.sourceforge.plantuml/plantuml

2. または、直接ダウンロード:
   ```bash
   # 最新版（例: 1.2024.8）
   curl -L -o plantuml.jar https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2024.8/plantuml-1.2024.8.jar
   ```

3. ファイルを`src-tauri/resources/plantuml.jar`として配置

## 注意事項

- ファイルサイズ: 約20MB
- バージョン: 1.2024.8以降を推奨
- ファイル名は`plantuml.jar`である必要があります
