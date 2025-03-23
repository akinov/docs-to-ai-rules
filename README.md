# docs-to-ai-rules

AIエージェント用のルールファイルをMarkdownドキュメントから生成するツールです。

## インストール

```bash
npm install docs-to-ai-rules
```

もしくは

```bash
npm install -g docs-to-ai-rules
```

## 使用方法

### コマンドライン

```bash
docs-to-ai-rules [options]
```

### オプション

| オプション     | 短縮形 | 説明 | デフォルト |
|------------|-------|-------------|---------|
| --source   | -s    | ソースディレクトリ | `doc/rules` |
| --services |       | 出力先サービス（カンマ区切り） | `cursor` |
| --ext      | -e    | 生成されるファイルの拡張子 | `mdc` |
| --exclude  | -x    | 除外するファイル（カンマ区切り） | `README.md` |

### 対応しているサービス

- `cursor` - [Cursor](https://cursor.sh/)のルールファイル（`.cursor/rules`に出力）
- `cline` - [Cline](https://cline.so/)のルールファイル（`.cline/rules`に出力）

### 使用例

```bash
# デフォルト設定で実行（Cursorのみに出力）
docs-to-ai-rules

# カスタムソースディレクトリを指定
docs-to-ai-rules --source my-docs/rules

# 複数のサービスに出力
docs-to-ai-rules --services cursor,cline

# ファイル拡張子を変更
docs-to-ai-rules --ext txt

# 複数のファイルを除外
docs-to-ai-rules --exclude "README.md,CHANGELOG.md"
```

## 仕組み

このツールは、`doc/rules`ディレクトリ（または指定されたソースディレクトリ）内のMarkdownファイルを処理し、AIエージェント用のルールファイルを生成します。生成されたファイルは、指定されたサービスのディレクトリに保存されます。

- Cursorの場合： `./.cursor/rules`
- Clineの場合： `./.cline/rules`

複数のサービスを指定すると、各サービスのディレクトリに同じ内容のファイルが生成されます。

## カスタムサービスの追加

新しいサービスを追加するには、`src/services`ディレクトリに新しいサービスクラスを作成し、`ServiceManager`に登録してください。
