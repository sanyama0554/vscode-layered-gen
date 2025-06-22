# VSCode拡張機能の開発・実行方法

## 拡張機能の実行手順

### 1. 依存関係のインストール
```bash
npm install
```

### 2. TypeScriptのコンパイル
```bash
npm run compile
```

### 3. 拡張機能の実行
1. VSCodeでこのプロジェクトフォルダを開く
2. **F5**キーを押す（または「実行」→「デバッグの開始」）
3. 新しいVSCodeウィンドウ（Extension Development Host）が開く
4. この新しいウィンドウで拡張機能が利用可能

## コマンドの実行方法

Extension Development Hostウィンドウで：
- **Ctrl+Shift+P**（Mac: **Cmd+Shift+P**）でコマンドパレットを開く
- `Layered Generator`と入力してコマンドを検索

## 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `Layered Generator: テンプレートからファイル生成` | レイヤードアーキテクチャのファイルを生成 |
| `Layered Generator: テンプレート設定` | テンプレートの設定を編集 |
| `Layered Generator: テンプレート登録` | 新しいテンプレートを登録 |
| `Layered Generator: Protobufフィールドに連番を付ける` | .protoファイルのフィールドに番号を自動付与 |
| `Layered Generator: ファイル依存グラフを表示` | プロジェクトの依存関係グラフを表示 |
| `Layered Generator: GraphQLスキーマドキュメント生成` | GraphQLスキーマからMarkdownドキュメントを生成 |
| `Layered Generator: Generate Test Skeletons` | APIテストのスケルトンを生成 |

## トラブルシューティング

### "command 'layered-gen.xxx' not found"エラーが出る場合

1. **コンパイルを確認**
   ```bash
   npm run compile
   ```

2. **VSCodeを再起動**
   - Extension Development Hostウィンドウを閉じる
   - F5で再度起動

3. **拡張機能の出力を確認**
   - Extension Development Hostウィンドウで
   - 「表示」→「出力」を開く
   - ドロップダウンから「拡張機能ホスト」を選択
   - エラーメッセージを確認

4. **開発者ツールでエラーを確認**
   - Extension Development Hostウィンドウで
   - 「ヘルプ」→「開発者ツールの切り替え」
   - コンソールタブでエラーを確認

### 拡張機能が有効にならない場合

1. `package.json`の`activationEvents`を確認
   - 現在は`onStartupFinished`で起動時に自動的に有効化

2. 拡張機能の出力ログで"Layered Architecture Generator is now active!"が表示されているか確認

## 開発時の注意事項

- TypeScriptファイルを変更した後は必ず`npm run compile`を実行
- または`npm run watch`でファイル変更を自動的にコンパイル
- Extension Development Hostウィンドウは変更後に再起動（Ctrl+R）で更新可能