# Solitary Coding - 設計ドキュメント

## コンセプト

AIを用いたアプリケーション開発ヘルプツール。
人間がTODOリストを作成し、AIが自動で順に実行してコードを生成・修正する。

## 技術スタック

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| フロントエンド | Vite + React + Shadcn UI |
| バックエンド | Hono |
| データベース | SQLite |
| AI実行 | Claude Code CLI (ラップ) |
| 配布形態 | npm パッケージ (対象リポジトリに `devDependencies` としてインストール) |

## 配布・利用方法

```bash
npm install -D solitary-coding
npx solitary-coding init   # 設定ファイル・ディレクトリ生成
npx solitary-coding start  # ダッシュボード起動 + タスクランナー開始
```

### 生成されるファイル

```
target-project/
├── solitary-coding.config.ts   # 設定ファイル (Git管理)
└── .solitary-coding/            # データディレクトリ (Git非管理)
    ├── db.sqlite                # タスク・ログDB
    └── logs/                    # 実行ログ
```

## 設定ファイル

```typescript
// solitary-coding.config.ts
import { defineConfig } from 'solitary-coding'

export default defineConfig({
  port: 4000,
  timer: {
    intervalMinutes: 10,
  },
  git: {
    defaultBranch: 'main',
  },
  ci: {
    maxRetries: 5,
    // コマンドは AI が自動検出。上書きしたい場合だけ指定
    // steps: [
    //   { name: 'typecheck', command: 'npx tsc --noEmit' },
    //   { name: 'lint', command: 'npm run lint' },
    //   { name: 'test', command: 'npm run test' },
    //   { name: 'build', command: 'npm run build' },
    // ],
  },
})
```

## ワークフロー

```
[1] npm start → Honoサーバー + タイマー起動

[2] ユーザーがWeb UIでタスク追加 → DB保存
    （ざっくりでOK。例: 「ログイン機能を作る」）

[3] タイマーがDBをチェック（例: 10分ごと）
    ├ 実行中タスクあり → スキップ
    └ なし → 次へ

[4] AIが優先順位を自動ソート
    Claude Code --print で全タスク一覧を渡す
    「依存関係・重要度・実装順序を考慮して並び替えて」
    → ソート結果をDBに反映

[5] 先頭のタスクをピックアップ

[6] AIで方向性を議論（役を動的に決定）
    Claude Code --print で:
    「このタスクに最適な専門家の視点を選び、
     実装方針を策定して」
    → 計画書をDBに保存

[7] 計画に基づいて実行プロンプト生成（メタプロンプティング）

[8] git checkout <defaultBranch> && git pull
    git checkout -b task/xxx

[9] Claude Code で実行（コミットもClaude Codeに任せる）

[10] CI実行（テスト/リント/ビルド）
     ※ CIコマンドはタスクごとにAIが自動検出
     失敗 → Claude Codeで修正 → 全ステップ最初から再CI
     全体で最大5回リトライ。5回失敗 → 全停止（後続タスクも停止）

[11] git checkout <defaultBranch>
     git merge task/xxx
     git push

[12] 次のタスクへ → [3]に戻る
```

## タスク状態遷移

```
pending → prioritizing → planned → executing → testing → completed
                                      ↓          ↓
                                    failed     failed
                                   (retry)    (retry)
                                      ↓          ↓
                                (5回失敗)    (5回失敗)
                                      ↓          ↓
                                   stopped    stopped
                                   (後続も停止)
```

## AI実行の3フェーズ

### Phase 1: 優先順位ソート
- Claude Code `--print` モード
- 入力: 全タスク一覧 + 完了済み履歴 + ファイル構成
- 出力: ソートされたタスク順序

### Phase 2: 方向性策定（メタプロンプティング）
- Claude Code `--print` モード
- タスクに最適な専門家の役割をAIが動的に選択
- リポジトリ分析 → 実装方針 → 実行プロンプト生成
- 計画書をDBに保存

### Phase 3: コード実行
- Claude Code 対話モード (`--yes` + `--dangerously-skip-permissions`)
- 生成されたプロンプトで実行
- コミットもClaude Codeに任せる

## CI自動検出

タスクごとにClaude Code `--print` で対象リポジトリを分析し、
テスト・リント・型チェック・ビルドのコマンドを自動特定する。
`defineConfig` で明示指定されている場合はそちらを優先。

## 失敗時の挙動

- CI失敗 → Claude Codeにエラー出力を渡して修正依頼
- 修正後、CI全ステップを最初から再実行
- 全体で最大5回（configurable）
- 5回失敗 → タスクを `stopped` に変更、後続タスクも実行しない
- 失敗したタスクのブランチはそのまま残す（人間が確認可能）

## マージコンフリクト

直列実行のためほぼ発生しないが、発生時は：
- Claude Codeにコンフリクト解決を依頼
- 解決後、CI全ステップ再実行
- これも5回リトライに含む

## ダッシュボード（Web UI）

- タスクの追加・一覧表示
- 各タスクの状態・実行時間の表示
- 手動実行トリガーボタン
- 一時停止ボタン
- 計画書の表示
- ステータスはポーリングで更新（リアルタイムログ不要）

## ディレクトリ構成（このツール自体）

```
solitary-coding/
├── packages/
│   ├── cli/          # CLIエントリポイント (init, start)
│   ├── server/       # Honoバックエンド + タスクランナー
│   ├── client/       # Vite + React + Shadcn ダッシュボード
│   └── shared/       # 共有型定義・ユーティリティ
├── package.json      # ルート (monorepo)
└── tsconfig.json
```
