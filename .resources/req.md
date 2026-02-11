Weather-Arb-Bot：Docker環境構築および実装指示書[cite_start]本プロジェクトは、Polymarketの天候市場において、航空気象データ（METAR）と市場価格の「情報の空白期間」を突く裁定取引ボットの実装を目的とする 。1. プロジェクト構成とDockerセットアップ[cite_start]ローカル環境およびAWS EC2での運用を想定し、Docker Composeによるマルチコンテナ構成とする 。ディレクトリ構造Plaintextweather-arb-bot/
├── docker-compose.yml
├── Dockerfile
├── .env                  # 秘密鍵、APIキー、RPC URL
├── requirements.txt      # py-clob-client, requests, python-dotenv, scipy
└── src/
    ├── main.py           # エントリポイント
    ├── metar_client.py   # METAR T-Group 解析ロジック
    ├── polymarket_clob.py # API連携 (signature_type=2)
    └── engine.py         # 確率計算と裁定ロジック
DockerfilePython 3.10-slim を使用し、軽量かつ高速な実行環境を構築する。.env 必須項目[cite_start]POLYMARKET_PK: 秘密鍵 [cite_start]POLYMARKET_FUNDER: 資金提供用アドレス POLYGON_RPC_URL: AlchemyまたはInfuraのURL[cite_start]TARGET_ICAO: 監視対象（例: KLGA, KORD）2. 実装すべきコア・モジュールA. METAR「T-Group」デコーダー (metar_client.py)[cite_start]aviationweather.gov のJSONエンドポイントから生データを取得し、Remarkセクションの T-Group を抽出する 。[cite_start]仕様: T01720083 という文字列から 17.2°C を浮動小数点として抽出するロジックを実装すること 。B. 確率密度関数モデル (engine.py)[cite_start]現在の精密気温 $T_t$ と、観測終了までの残り時間に基づく標準偏差 $\sigma$ を用いて、閾値 $X$ を超える確率 $P$ を算出する 。
$$P(T_{max} > X) = 1 - \Phi \left( \frac{X - \mu}{\sigma} \right)$$[cite_start][cite_start]$\Phi$ は標準正規分布の累積分布関数（scipy.stats.norm.cdf）を使用する 。C. Polymarket 実行エンジン (polymarket_clob.py)py-clob-client を使用し、以下の仕様で実装する。[cite_start]認証: L1/L2認証フローの実装 。[cite_start]ガス代最適化: signature_type: 2 (Gnosis Safe/Proxy) を選択し、リレイヤーによるガス代肩代わりを有効にする 。[cite_start]注文管理: スリッページ抑制のため、成行注文ではなく指値注文（Limit Order）を基本とする 。3. リスク管理と緊急停止（Kill-switch）[cite_start]以下の異常検知レイヤーを必ず実装すること 。[cite_start]マクロ・スイッチ: 24時間の損失が予算（$20）の 20% を超えた場合、全注文をキャンセルして停止 。[cite_start]データ・スイッチ: NOAA APIとMETARの価格乖離が $5^\circ\text{F}$ を超える、またはMETARがN/Aを返した場合、センサー故障とみなし取引を停止 。[cite_start]レートリミット監視: API 429エラー検知時の指数バックオフアルゴリズムの実装 。4. 成功指標 (KPI)[cite_start][cite_start]実行遅延: METAR取得から注文送信完了まで 5秒以内 。[cite_start]目標勝率: 65% 以上 。[cite_start]月利目標: 運用資金 $20 に対して 10% 〜 30% 。kiroへのメッセージ[cite_start]まずは、metar_client.py で T-Group を正確にパースし、現在のPolymarketのYes価格と比較して「期待値（EV）」をログ出力するモニタリングモードから作成してください。期待値の算出には、仕様書第3章の数式を用いてください 。