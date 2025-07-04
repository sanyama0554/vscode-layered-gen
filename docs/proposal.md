## VSCode 拡張機能 要件定義書

### 1. 概要

本拡張機能は、Next.js と NestJS を用いたレイヤードアーキテクチャによる開発を効率化することを目的としている。繰り返し発生する定型作業を削減し、開発者の生産性を向上させる。

### 2. 機能要件

#### 2.1 ファイル一括生成機能

- VSCode のエクスプローラーで右クリックメニューから起動。
- ファイル名入力後、Controller、Service、Repository、DTO などのファイル群を指定フォルダ内に自動生成。

#### 2.2 コードスニペット機能

- 定型コード（CRUD 処理、NestJS Module 登録、DI パターンなど）をスニペット形式で提供。
- コマンドパレットやショートカットキーから呼び出し可能。

#### 2.3 コードジャンプ機能

- 関連するレイヤー間（Controller ⇔ Service ⇔ Repository）を素早く切り替え可能。
- ショートカットキーやコンテキストメニューで実現。

#### 2.4 レイヤー間整合性チェック機能

- インポートやレイヤー間の依存関係をリアルタイムチェック。
- 違反があった場合、VSCode 内で警告表示。

#### 2.5 Prisma モデル連携型コード生成

- Prisma のスキーマファイルから NestJS 向けの Service、Repository、DTO を自動生成。
- スキーマの更新を検知し、再生成を促す。

#### 2.6 gRPC/GraphQL サポート機能

- `.proto`ファイルや GraphQL スキーマから関連するコード（Controller、Resolver など）を生成。
- スキーマの変更を自動検知し、コードを最新化。

#### 2.7 定型コメント挿入機能

- コード内に規定のフォーマットでコメントを自動挿入。
- チーム内で統一したコメントスタイルを保持。

#### 2.8 リファクタリング補助機能

- よく使用されるリファクタリング操作（メソッド抽出、ファイル分割、レイヤー移動）を簡易に行える UI 提供。

### 3. 非機能要件

- 拡張機能の動作は軽量であり、VSCode のパフォーマンスに悪影響を及ぼさないこと。
- 操作は直感的で学習コストが低いこと。
- チーム全体が共通して使用できるよう、設定ファイルでカスタマイズ可能。

### 4. 対象ユーザー

- NestJS および Next.js を使用したレイヤードアーキテクチャでの開発を行うエンジニア。

### 5. 前提条件

- TypeScript、Next.js、NestJS、Prisma の基本的な理解が必要。
- VSCode 最新バージョンに対応。

以上
