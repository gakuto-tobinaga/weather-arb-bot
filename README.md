# Weather-Arb-Bot

Polymarket天候予測市場向けの自動裁定取引システム。高精度METAR航空気象データと市場価格の間の情報非対称性を利用します。

Automated arbitrage trading system for Polymarket weather prediction markets. Exploits information asymmetry between high-precision METAR aviation weather data and market prices.

## 概要 / Overview

このボットは、航空気象観測データ（METAR）の「T-Group」から取得できる0.1°C精度の温度データを活用し、Polymarketの天候予測市場で裁定取引を行います。一般的な気象APIが観測から60-180分後にデータを提供するのに対し、METARデータは1-5分後に利用可能となるため、情報優位性を持ちます。

This bot leverages 0.1°C precision temperature data from METAR "T-Group" observations to perform arbitrage trading on Polymarket weather prediction markets. While standard weather APIs provide data 60-180 minutes after observation, METAR data is available within 1-5 minutes, providing an information advantage.

## 主な機能 / Features

- **高精度温度データ / High-Precision Temperature Data**: METAR T-Groupデータを活用し、0.1°C精度で温度を取得
- **リアルタイム裁定 / Real-Time Arbitrage**: 観測後1-5分でMETARデータにアクセス（標準APIは60-180分後）
- **タイムゾーン対応 / Timezone-Aware**: 異なるタイムゾーン（ET、CT、GMT）での観測終了時刻を正確に処理
- **確率モデリング / Probability Modeling**: 都市別ボラティリティパラメータを用いた正規分布CDFによる確率計算
- **型安全性 / Type-Safe**: 温度とタイムスタンプにブランド型を使用した厳格なTypeScript実装
- **リスク管理 / Risk Management**: マクロ損失とデータ品質問題に対する組み込みキルスイッチ
- **モニタリングモード / Monitoring Mode**: ライブ取引前に予測を検証（目標：Brierスコア < 0.1）
- **予測精度追跡 / Prediction Tracking**: Brierスコアによる予測精度の継続的な測定と検証

## 技術スタック / Technology Stack

- **Runtime**: Bun（高性能JavaScriptランタイム / high-performance JavaScript runtime）
- **Language**: TypeScript（厳格な型安全性 / strict type safety）
- **Blockchain**: ethers v6（Polygonネットワーク / Polygon network）
- **Validation**: zod（スキーマ検証 / schema validation）
- **Statistics**: @stdlib/stats-base-dists-normal-cdf（確率計算 / probability calculations）
- **Time Handling**: date-fns-tz（タイムゾーン対応パース / timezone-aware parsing）
- **Testing**: Bun test + fast-check（ユニットテスト＋プロパティベーステスト / unit + property-based testing）

## クイックスタート / Quick Start

### 前提条件 / Prerequisites

- [Bun](https://bun.sh) v1.3.8以降 / v1.3.8 or later
- PolymarketアカウントとAPI認証情報 / Polymarket account with API credentials
- Polygon RPCエンドポイント（Infura、Alchemy、またはパブリックRPC）/ Polygon RPC endpoint
- 取引用のPolygonネットワーク上のUSDC / USDC on Polygon network for trading

### インストール / Installation

```bash
# リポジトリをクローン / Clone the repository
git clone <repository-url>
cd weather-arb-bot

# 依存関係をインストール / Install dependencies
bun install

# 環境変数テンプレートをコピー / Copy environment template
cp .env.example .env

# 認証情報を編集 / Edit .env with your credentials
# 重要：初期テストではMONITORING_MODE=trueに設定 / IMPORTANT: Set MONITORING_MODE=true for initial testing
nano .env
```

### Configuration

Edit `.env` with your settings:

```bash
# Polymarket Authentication
POLYMARKET_PK=your_private_key_here
POLYMARKET_FUNDER=0xYourEthereumAddress
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_API_PASSPHRASE=your_passphrase

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com

# Trading Configuration
TARGET_ICAO=KLGA,KORD,EGLC  # NYC, Chicago, London
MIN_EV=0.05                  # 5% minimum edge
BUDGET=20                    # Start small!
POLL_INTERVAL=300000         # 5 minutes

# Mode
MONITORING_MODE=true         # ALWAYS start with true!
```

### Running the Bot

#### Development Mode

```bash
# Run with Bun
bun run src/index.ts

# Run tests
bun test

# Run specific test file
bun test tests/probability-calculator.test.ts
```

#### Production Mode (Docker)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## モニタリングモード / Monitoring Mode

**重要 / CRITICAL**: 必ず`MONITORING_MODE=true`で開始してください！ / Always start with `MONITORING_MODE=true`!

モニタリングモードでは、ボットは以下を実行します：
- METARデータを取得し、市場を発見
- 確率と期待値を計算
- すべての取引シグナルをログに記録（ただし注文は実行しない）
- Brierスコアで予測精度を追跡

In monitoring mode, the bot:
- Fetches METAR data and discovers markets
- Calculates probabilities and expected values
- Logs all trading signals (but does NOT place orders)
- Tracks prediction accuracy with Brier score

### 検証基準 / Validation Criteria

ライブ取引に移行する前に：
- 最低3日間モニタリングモードで実行
- Brierスコア < 0.1を達成（低いほど良い）
- ログを確認してシグナルが妥当であることを確認
- 最低10件以上の決済済み予測データを収集

Before switching to live trading:
- Run for at least 3 days in monitoring mode
- Achieve Brier score < 0.1 (lower is better)
- Review logs to ensure signals are reasonable
- Collect at least 10 settled predictions for validation

**Brierスコアの評価 / Brier Score Rating**:
- < 0.05: 優秀 / Excellent
- < 0.10: 良好 / Good（ライブ取引可 / Ready for live trading）
- < 0.15: 普通 / Fair
- < 0.25: 不良 / Poor
- ≥ 0.25: 非常に不良 / Very Poor

`MONITORING_MODE=false`への切り替えは、検証成功後のみ行ってください。

Only switch to `MONITORING_MODE=false` after successful validation.

## アーキテクチャ / Architecture

### コアコンポーネント / Core Components

1. **METARクライアント / METAR Client** (`src/metar/`): 航空気象データの取得と解析
   - カスタムT-Group解析（0.1°C精度）/ Custom T-Group parsing (0.1°C precision)
   - 並列ステーション取得 / Parallel station fetching
   - 指数バックオフ再試行ロジック / Exponential backoff retry logic

2. **確率エンジン / Probability Engine** (`src/probability/`): 閾値超過確率の計算
   - 都市別ボラティリティパラメータ（σ）/ City-specific volatility parameters (σ)
   - 時間調整標準偏差 / Time-adjusted standard deviation
   - 正規分布CDF計算 / Normal distribution CDF calculations
   - 期待値（EV）計算 / Expected value (EV) computation

3. **市場発見 / Market Discovery** (`src/market/`): Polymarket市場の検索とフィルタリング
   - Gamma API統合 / Gamma API integration
   - ICAOコードフィルタリング / ICAO code filtering
   - 補助データ解析 / Ancillary data parsing

4. **タイムゾーン処理 / Timezone Handling** (`src/timezone/`): 観測終了時刻の管理
   - ICAO → タイムゾーンマッピング / ICAO → timezone mapping
   - ローカル時刻 → UTC変換 / Local time → UTC conversion
   - DST対応計算 / DST-aware calculations

5. **リスク管理 / Risk Manager** (`src/risk/`): キルスイッチとP&L追跡
   - マクロキルスイッチ（24時間損失 > 予算の20%）/ Macro kill-switch (24h loss > 20% of budget)
   - データ品質キルスイッチ（温度乖離 > 5°F）/ Data quality kill-switch (temp divergence > 5°F)
   - ローリングP&L計算 / Rolling P&L calculation

6. **モニタリング / Monitoring** (`src/monitoring/`): 予測追跡とBrierスコア計算
   - 予測の永続化（`logs/predictions.json`）/ Prediction persistence
   - Brierスコア計算 / Brier score calculation
   - 3日間ローリング検証 / 3-day rolling validation
   - 日次サマリーレポート / Daily summary reports

7. **ロガー / Logger** (`src/logger/`): デュアル出力ログシステム
   - コンソール＋ファイル出力 / Console + file output
   - 構造化JSON形式 / Structured JSON format
   - 設定可能なログレベル / Configurable log levels

### Type System

The bot uses branded types for type safety:

```typescript
// Temperature with 0.1°C precision
type PrecisionTemperature = number & { __brand: 'PrecisionTemperature' }

// Timezone-aware timestamp
type Timestamp = {
  utc: Date;
  timezone: string;
}

// Duration for time calculations
type Duration = {
  milliseconds: number;
  hours: number;
  isNegative(): boolean;
}
```

## テスト / Testing

プロジェクトには包括的なテストカバレッジが含まれています：

The project includes comprehensive test coverage:

```bash
# すべてのテストを実行 / Run all tests
bun test

# カバレッジ付きで実行 / Run with coverage
bun test --coverage

# 特定のテストスイートを実行 / Run specific test suite
bun test tests/tgroup-parser.test.ts

# モニタリング関連のテスト / Monitoring-related tests
bun test tests/brier-score.test.ts
bun test tests/prediction-tracker.test.ts
bun test tests/monitoring-validation.test.ts
```

テストカテゴリ / Test categories:
- **ユニットテスト / Unit tests**: 特定の例とエッジケース / Specific examples and edge cases
- **プロパティベーステスト / Property-based tests**: すべての入力にわたる普遍的特性 / Universal properties across all inputs
- **統合テスト / Integration tests**: エンドツーエンドワークフロー / End-to-end workflows

現在のテスト状況 / Current test status:
- ✅ 530+ テストすべて合格 / 530+ tests passing
- ✅ 4,156+ アサーション / 4,156+ assertions
- ✅ 型安全性検証 / Type safety validation
- ✅ METAR解析精度 / METAR parsing accuracy
- ✅ 確率計算正確性 / Probability calculation correctness
- ✅ リスク管理ロジック / Risk management logic
- ✅ モニタリングモード検証 / Monitoring mode validation

## リスク管理 / Risk Management

### キルスイッチ / Kill-Switches

1. **マクロキルスイッチ / Macro Kill-Switch**: 24時間損失が予算の20%を超えた場合に発動
   - Activates when 24-hour loss > 20% of budget
   
2. **データ品質キルスイッチ / Data Quality Kill-Switch**: 以下の場合に発動
   - METAR温度がNOAAから5°F以上乖離 / METAR temperature diverges > 5°F from NOAA
   - METARがnull/N/A値を返す / METAR returns null/N/A values

キルスイッチ発動時の動作 / When activated, kill-switches:
- すべての未決済注文をキャンセル / Cancel all open orders
- 新規注文の発注を防止 / Prevent new order placement
- 発動理由をログに記録 / Log activation reason
- 自動復旧を試行（データ品質の場合）/ Attempt automatic recovery (for data quality)

### ポジションサイジング / Position Sizing

- EVと利用可能資本に基づいて計算 / Calculated based on EV and available capital
- 設定された予算を超えない / Never exceeds configured budget
- 最高EVの機会を優先 / Prioritizes highest EV opportunities
- 最小ポジションサイズ：1 USDC / Minimum position size: 1 USDC

## サポート対象市場 / Supported Markets

現在サポートしている天候市場 / Currently supports weather markets for:

- **KLGA** (ラガーディア空港、ニューヨーク / LaGuardia Airport, NYC) - 東部時間 / Eastern Time
  - ボラティリティ / Volatility: σ = 3.5°C（中程度 / moderate）
  - 特徴 / Characteristics: 海洋性気候の影響 / Maritime climate influence
  
- **KORD** (オヘア空港、シカゴ / O'Hare Airport, Chicago) - 中部時間 / Central Time
  - ボラティリティ / Volatility: σ = 4.2°C（高い / higher）
  - 特徴 / Characteristics: 大陸性気候、温度変動大 / Continental climate, high temperature variability
  
- **EGLC** (ロンドンシティ空港 / London City Airport) - グリニッジ標準時 / Greenwich Mean Time
  - ボラティリティ / Volatility: σ = 2.8°C（低い / lower）
  - 特徴 / Characteristics: 海洋性気候、安定 / Maritime climate, stable

各ステーションには都市別ボラティリティパラメータが設定されています。これらのパラメータは過去30日間の履歴データから計算され、季節変動を考慮して定期的に更新する必要があります。

Each station has city-specific volatility parameters calculated from historical data over the past 30 days and should be periodically updated to account for seasonal variations.

## ログ / Logs

ログの出力先 / Logs are written to:
- コンソール（stdout/stderr）/ Console (stdout/stderr)
- ファイル / File: `./logs/weather-arb-bot-YYYY-MM-DD.log`
- 予測データ / Predictions: `./logs/predictions.json`

ログ形式（JSON）/ Log format (JSON):
```json
{
  "timestamp": "2024-01-15T12:34:56.789Z",
  "level": "info",
  "component": "METAR_Client",
  "event": "fetch_complete",
  "data": {
    "icao": "KLGA",
    "temperature": 20.5,
    "tgroup": "T00205"
  }
}
```

### モニタリングモードのログ出力例 / Monitoring Mode Log Example

```
[2024-01-15T12:34:56.789Z] Fetching METAR data...
  ✓ KLGA: 20.5°C
  ✓ KORD: -2.2°C
  ✓ EGLC: 12.0°C

Discovering active markets...
  Found 3 relevant markets

  Signal: BUY KLGA @ 0.6234 (EV: 0.0834)
  [Prediction Tracker] Recorded prediction: market-123-1705324496789 (P=0.6234)

Generated 1 trading signals

[Brier Score] Score: 0.0456 (15 predictions)
[Brier Score] ✓ Meets 3-day target (< 0.1)

=== Daily Brier Score Summary ===
Date: 2024-01-15
Predictions: 5
Brier Score: 0.0456 (Excellent)

3-Day Rolling Score: 0.0523 (Excellent)
Total Predictions: 15 (15 settled, 0 pending)
✓ Meets 3-day target (< 0.1) - Ready for live trading
================================
```

## トラブルシューティング / Troubleshooting

### よくある問題 / Common Issues

**"Invalid POLYMARKET_PK format"**
- 秘密鍵が64文字の16進数であることを確認（0xプレフィックスなし）
- Ensure private key is 64 hex characters (no 0x prefix)
- 余分なスペースや引用符がないか確認 / Check for extra spaces or quotes

**"Could not find observation end time"**
- 市場が非標準の補助データ形式を持っている可能性 / Market may have non-standard ancillary data format
- ログで生の補助データ内容を確認 / Check logs for raw ancillary_data content

**"METAR fetch failed"**
- aviationweather.govが一時的に利用できない可能性 / aviationweather.gov may be temporarily unavailable
- ボットは指数バックオフで自動再試行 / Bot will retry with exponential backoff

**"Rate limit exceeded"**
- POLL_INTERVALを減らす / Reduce POLL_INTERVAL
- ボットは自動的にリクエストをスロットル / Bot automatically throttles requests

**"Brier score too high"**
- σパラメータの調整が必要な可能性 / May need to adjust σ parameters
- より多くのデータを収集して検証 / Collect more data for validation
- 確率計算ロジックを確認 / Review probability calculation logic

**"No markets found"**
- TARGET_ICAOコードが正しいか確認 / Verify TARGET_ICAO codes are correct
- Polymarketに該当する市場が存在するか確認 / Check if relevant markets exist on Polymarket
- ネットワーク接続を確認 / Verify network connectivity

## セキュリティ / Security

- `.env`ファイルをバージョン管理にコミットしない / Never commit `.env` file to version control
- すべての秘密情報に環境変数を使用 / Use environment variables for all secrets
- 最小限の権限で実行（Dockerでは非rootユーザー）/ Run with minimal permissions (non-root user in Docker)
- テスト用に少額の予算（$20-100）で開始 / Start with small budget ($20-100) for testing
- 必ずモニタリングモードで最初に検証 / Always validate in monitoring mode first
- 秘密鍵は安全に保管し、決して共有しない / Keep private keys secure and never share
- 定期的にログを確認して異常な動作を監視 / Regularly review logs for unusual behavior

## パフォーマンス / Performance

期待されるレイテンシ / Expected latency:
- METAR取得から注文送信まで / METAR fetch to order submission: < 5秒 / < 5 seconds
- 確率計算 / Probability calculation: < 100ミリ秒 / < 100 milliseconds
- 注文送信 / Order submission: < 1秒 / < 1 second

目標稼働率 / Target uptime: 市場アクティブ時間中99% / 99% during market active hours

メモリ使用量 / Memory usage: ~50-100 MB（通常動作時 / normal operation）

## 免責事項 / Disclaimer

このソフトウェアは教育目的のみです。取引には損失のリスクが伴います。自己責任でご使用ください。著者は、このソフトウェアの使用によって生じたいかなる金銭的損失についても責任を負いません。

This software is for educational purposes only. Trading involves risk of loss. Use at your own risk. The authors are not responsible for any financial losses incurred through use of this software.

**重要な注意事項 / Important Notes**:
- 必ず少額の資金でテストを開始 / Always start testing with small amounts
- モニタリングモードで十分に検証 / Thoroughly validate in monitoring mode
- 市場の流動性と価格変動に注意 / Be aware of market liquidity and price volatility
- 規制要件を確認 / Check regulatory requirements in your jurisdiction

## サポート / Support

問題や質問がある場合 / For issues or questions:
- `./logs/`のログを確認 / Check logs in `./logs/`
- テスト出力を確認 / Review test output: `bun test`
- すべての環境変数が正しく設定されているか確認 / Ensure all environment variables are set correctly
- Brierスコアと予測精度を監視 / Monitor Brier score and prediction accuracy
- GitHubでIssueを作成（該当する場合）/ Create an issue on GitHub (if applicable)

## 開発ロードマップ / Development Roadmap

- [x] コア型システムと検証 / Core type system and validation
- [x] METAR T-Group解析 / METAR T-Group parsing
- [x] 確率エンジン / Probability engine
- [x] 市場発見とフィルタリング / Market discovery and filtering
- [x] リスク管理とキルスイッチ / Risk management and kill-switches
- [x] モニタリングモードとBrierスコア / Monitoring mode and Brier score
- [ ] NOAA温度データ統合（データ品質検証用）/ NOAA temperature data integration (for data quality validation)
- [ ] 時刻別ボラティリティ調整 / Time-of-day volatility adjustments
- [ ] 複数市場の同時取引最適化 / Multi-market simultaneous trading optimization
- [ ] Webダッシュボード / Web dashboard for monitoring
- [ ] バックテストフレームワーク / Backtesting framework

## 貢献 / Contributing

プルリクエストを歓迎します。大きな変更の場合は、まずIssueを開いて変更内容を議論してください。

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

テストを追加・更新してください / Please make sure to update tests as appropriate.

## ライセンス / License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
