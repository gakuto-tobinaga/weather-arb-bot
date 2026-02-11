Polymarketにおける天候裁定取引の技術的・市場的実現可能性：METARデータと情報の非対称性に関する包括的調査報告書
緒論：情報金融としての予測市場と天候資産の台頭
予測市場「Polymarket」は、ブロックチェーン技術を活用した情報の集約エンジンとして、伝統的な金融市場では捕捉困難な「未来の事実」を取引可能な資産へと変換した。特に天候市場、とりわけ主要都市の最高気温を対象としたコントラクトは、気象観測データという客観的かつ検証可能なソースに依存しているため、純粋なデータ主導型の裁定機会を提供している 1。本報告書では、航空気象データ（METAR）と一般的な気象情報配信プラットフォームの間に存在する「構造的遅延」および「精度の非対称性」に着目し、低レイテンシ裁定取引（Weather Arbitrage）の実現可能性を、技術、市場、ガバナンスの三側面から徹底的に検証する。
天候予測市場における裁定取引の核となるのは、物理世界で発生した観測事実が、予測市場の価格に反映されるまでの「情報の空白期間」の活用である 1。この空白期間は、気象局のデータ処理プロセス、APIの配信タイムラグ、および一般投資家の認知プロセスの差によって生じる。本調査では、NOAA（米国海洋大気局）が提供する標準APIと、航空業界で利用されるMETARデータの差異を定量的に分析し、裁定者が享受可能なエッジの源泉を特定する。
データの非対称性とレイテンシ構造の深層分析
裁定取引の成否は、決済ソースが参照する公式データよりも早く、かつ正確な情報を取得できるかどうかに依存する。Polymarketの天候市場は、特定の観測地点（通常は主要空港のASOS/AWOSシステム）の記録値を最終的な決済基準とするため、データの生成から配信に至るまでのパイプラインを理解することが不可欠である 1。
NOAA標準APIとMETARデータの配信タイムラグ特定
気象データの配信経路には、複数のフィルタリングと集約のレイヤーが存在する。一般的に利用される NOAA の api.weather.gov は、アクセシビリティには優れるものの、リアルタイム性においては致命的な遅延を抱えている 1。対照的に、航空気象情報配信システム（aviationweather.gov）が提供する METAR データは、航空機の離着陸という安全上の理由から、極めて低いレイテンシで公開される。
以下の表は、各データソースにおける観測からデータ利用可能までのタイムラグを比較したものである。

データソース
更新頻度
平均遅延（実測値）
最大遅延（観測例）
特徴とボトルネック
api.weather.gov
1時間ごと
60分 ～ 120分
180分以上 1
MADIS統合プロセスによるQC遅延
aviationweather.gov (METAR)
15分 ～ 1時間
1分 ～ 5分
15分 1
航空運航向けの生データ速報
MADIS (LDAD)
1分 ～ 5分
20分 ～ 45分
60分 4
異常値除去のための品質管理期間
Wunderground
5分 ～ 15分
5分 ～ 20分
30分 1
PWSデータの集約・再配信
Xweather (AerisWeather)
随時
1分 ～ 3分
5分 1
Vaisala観測網を活用した商用フィード

NOAA の標準 API における遅延の主因は、MADIS（Meteorological Assimilation Data Ingest System）と呼ばれる統合システムにおける品質管理（QC）プロセスである 4。MADIS は、全米の観測地点から送られてくる生データを検証し、センサーの故障や異常値を排除した上で配信を行うが、このプロセスには 20 分から 45 分の固定的な滞留時間が発生する 4。裁定取引ボットが api.weather.gov を監視対象としている場合、すでに市場価格が変動した後に信号を受け取ることになり、優位性を確保することは不可能である。
一方で、METAR データは ASOS（Automated Surface Observing System）から直接、または限定的な中継を経て配信されるため、観測から数分以内にデータが公開される 7。特に、天候が急変した場合や、特定の閾値に近づいた場合に発行される特別観測報「SPECI」は、定時報告を待たずに即時配信されるため、裁定取引における強力なトリガーとなる 5。
METAR「T-Group」による精密温度の先読みアドバンテージ
裁定取引者が享受できるもう一つの決定的なエッジは、データの「精度」にある。Polymarketの決済基準や一般の気象ダッシュボード（Wunderground 等）では、温度は通常、摂氏または華氏の整数値で報告される 1。しかし、METAR データの追加情報セクション（Remark）に含まれる「T-Group」を利用することで、10分の1度単位（0.1°C）の精密な温度推移を把握することが可能である 1。
T-Group のデコードプロセスは以下の通りである。
METAR 報の中に T01720083 という文字列が含まれている場合、これは以下のように解釈される：
識別子 T：精密温度・露点情報の開始。
符号 0：正数（プラス）を示す（1 の場合は負数） 10。
精密温度 172：17.2°C。
符号 0：露点温度の正数。
精密露点 083：8.3°C。
この精密データの活用により、裁定者は以下の「先読み」アドバンテージを得る。
丸め処理の予測: Polymarket の決済において華氏（°F）が使用される場合、摂氏からの換算および整数への丸め処理が発生する。T-Group で 17.2°C（62.96°F）から 17.3°C（63.14°F）への上昇をいち早く察知すれば、一般のダッシュボードが「63°F」と表示する前に、次の価格帯への移行を統計的に確信してポジションを構築できる 1。
統計的収束の早期判定: 最高気温市場において、現在値が閾値に非常に近い場合、0.1度単位の推移と露点（湿度）の動向を監視することで、これ以上の気温上昇の可能性が物理的に低いことを、整数データしか持たない他者よりも早く判断できる 1。
この情報の非対称性は、秒単位の速度競争ではなく、数分から数十分という「情報の浸透速度の差」を収益化するものであり、ネットワーク遅延の極小化よりも、データソースの選択と解析アルゴリズムの精度に重きを置いた HFT 的アプローチが有効となる。
決済プロセスとオラクルリスクの定量的評価
Polymarket の天候市場は、UMA（Universal Market Access）のオプティミスティック・オラクル（OO）を介して最終的な決済が下される 1。裁定取引者は、技術的なデータ取得だけでなく、この決済プロセスの力学と、それに付随する特有のリスクを管理しなければならない。
UMA Optimistic Oracle の参照ソースと判定メカニズム
UMA の OO は、スマートコントラクトが直接オフチェーンデータを取得するのではなく、人間（およびボット）のインセンティブに基づいた「提案と異議申し立て」のゲームによって真実を確定させる 12。

プロセス段階
内容
裁定取引における重要性
市場終了
規定の観測期間（通常 23:59 ET まで）の終了 1
取引停止時刻の把握
提案 (Propose)
アサーターがボンド（$750）と共に結果を提出 14
最も早い決済確定への寄与
チャレンジ期間
2時間の待機期間（Liveness Period） 13
異議申し立ての監視
紛争 (Dispute)
第三者が提案に異議を唱え、DVM へ移行 16
資金拘束リスクの発生
投票 (Vote)
UMA トークンホルダーによる最終決議 12
ガバナンスリスクの顕在化

天候市場における具体的な「参照ソース」は、市場作成時に定義される「Ancillary Data（付随データ）」に記述されている 12。通常、NOAA の公開する観測地点（KLGA, KORD 等）の記録が指定されるが、重要なのは「どの時点のどの報告書か」という詳細である。METAR はあくまで速報値であり、UMA のアサーターが最終的な決済の根拠とするのは、翌日以降に確定される NOAA の日次要約データ（Daily Summary）であることが多い 1。裁定取引において、METAR データに基づき当日中にポジションを構築する場合、この「速報値と確定値の不一致」がリスクとなる。
天候市場における紛争事例：データの修正と機器障害
UMA の歴史において、天候市場は比較的論争が少ない部類に入るが、特定の条件下では深刻な紛争が発生する。具体的には、以下の 2 つのケースが裁定取引の致命的なリスクとなり得る。
観測地点の指定不備と地理的差異: ニューヨーク市場において、Kalshi がセントラルパークを参照するのに対し、Polymarket がラガーディア空港（KLGA）を参照していたケースでは、同じ「ニューヨークの気温」でありながら数度の差が生じ、混乱を招いた 1。このような「セマンティック（意味論的）な不一致」は、裁定ボットが誤った観測地点を参照してポジションを持つ原因となる 18。
センサー障害と代替ソースの選択: 特定の空港の温度センサーが故障し、データが N/A または異常値となった場合、UMA のガバナンス投票は極めて不安定になる 1。過去の事例では、近隣の別の観測地点のデータを参照して補完する判断が下されることもあれば、市場を 50-50（ドロー）で決済するという裁定が下されることもある 1。
このような機器障害が発生した際、裁定取引ボットはデータの信頼性を即座に評価し、信頼区間が低下した場合には全注文をキャンセルし、静観（Wait-and-watch）するロジックを組み込む必要がある。
UMA ガバナンス攻撃の評価と防衛策
UMA の決済システムの根本的な脆弱性は、真実の決定権が「UMA トークンの保有量」に依存する点にある。これは、経済的インセンティブが客観的事実を上回る場合に、不当な決済が下される可能性を示唆している 19。
特に「クジラ（大口保有者）」が予測市場において巨額のポジションを持っている場合、自身の利益を守るために不当な方向に投票を行うインセンティブが生じる 19。2025 年の「ウクライナの Trump 資源取引」に関する市場では、明らかな証拠が存在したにもかかわらず、UMA のクジラが反対の結果に投票し、Polymarket 側もその結果を追認せざるを得なかったという事例が報告されている 20。
天候市場における防衛策：
市場ボリュームの監視: UMA のステーキング総額やクジラの動向に対し、特定市場の未決済建玉（OI）が極端に大きい場合、ガバナンス攻撃の標的となる可能性が高まる。
オラクル・アグノスティックな設計: 単一のオラクルに依存せず、裁定ロジックにおいては「UMA が過去にどのような偏りを見せたか」を統計的にモデル化し、リスクプレミアムを価格設定に反映させる必要がある。
緊急停止とヘッジ: 決済直前に不自然な価格の吊り上げ（例：0.98 USDC での不合理な大量買い）が発生した場合は、クジラによる先行取引や攻撃の前兆とみなし、ポジションを縮小させる 1。
市場の流動性と実行コスト：HFT 実装の制約
技術的な優位性が存在しても、それを収益化するための「市場の出口（Exit）」がなければ裁定取引は成立しない。Polymarket の CLOB（Central Limit Order Book）における流動性と、Polygon ネットワーク特有の実行コストを詳述する。
Polymarket CLOB の市場深度とスリッページ
天候市場は、政治や暗号資産価格市場に比べると流動性が低い「ニッチ市場」に分類される 21。平均的な板の厚さ（Market Depth）は、閾値から離れている時期は非常に薄く、イベント終了（気温の確定）が近づくにつれて厚みを増す傾向がある。

指標
推定値（天候市場）
裁定取引への影響
平均 Market Depth
$500 ～ $2,000
1回の取引サイズを制限する必要がある 22
スプレッド
$0.01 ～ $0.05
裁定利幅の 20% ～ 50% を侵食する可能性がある 24
24h 取引高
$10,000 ～ $50,000
大規模な資金投入には適さない 23

裁定ボットは、単純な成行注文（Market Order）を避け、py-clob-client 等を用いた指値注文（Limit Order）を基本とするべきである 1。また、板の情報を WebSocket (wss://ws-subscriptions-clob.polymarket.com/ws/) でリアルタイムに監視し、Mid-price の変動に合わせてミリ秒単位で指値を更新する「マーケットメイク的な裁定」手法が、スリッページを最小化するために推奨される 22。
Polygon 上での実行コストと Signature Type 2 の制限
Polymarket の大きな特徴は、Polygon ネットワーク上で動作しながら、ユーザーのガス代をリレイヤーが肩代わりする仕組みを提供している点にある 1。
Signature Type 2 (Gnosis Safe/Proxy): ボット実装において signature_type=2 を選択することで、Gnosis Safe ベースのプロキシウォレットを介した取引が可能になる 1。この形式では、ユーザーの秘密鍵による EIP-712 署名を Polymarket の API に送信するだけで注文が執行され、ガス代（MATIC）の保持や管理が不要となる 1。
実装制限: プロキシウォレット経由の取引はガス代が無料である一方、Polymarket 側のリレイヤーの負荷状況により、注文のオンチェーン反映に数秒の遅延が生じることがある。真の HFT（マイクロ秒単位）を目指す場合、この「リレイヤー待ち」がボトルネックとなるため、自前でガス代を支払う EOA（signature_type=0）の使用も検討の余地があるが、取引頻度が高まるとガス代が収益を圧迫するトレードオフが存在する 1。
API レートリミットと高頻度取引（HFT）への影響
Polymarket の API は Cloudflare によって保護されており、過度なリクエストはスロットリングの対象となる 30。

API 種類
注文作成 (POST /order)
注文削除 (DELETE /order)
市場データ (GET /book)
バースト制限
3,500 / 10s 30
3,000 / 10s 30
1,500 / 10s 30
継続制限
36,000 / 10m 30
30,000 / 10m 30
なし

天候裁定取引において、毎秒 10 回程度のデータチェックと、必要に応じた注文更新を行う分には、これらの制限は十分に寛容である。しかし、複数の市場を同時に監視し、大量の指値を並べるアルゴリズムを組む場合、post_orders() による一括送信（Batching）を活用し、リクエスト回数を節約する実装が求められる 1。
エッジの持続性：予測モデルの進化と競合環境
裁定取引の利益は「情報の非対称性」から生まれる。このエッジが将来にわたって持続可能かどうか、予測モデルの進歩と競合の動向から考察する。
同様戦略を採用する既存プレイヤーの分析
Polymarket において、2024 年 4 月から 2025 年 4 月までの 1 年間で、裁定取引ボットは 4,000 万ドル以上の利益を抽出したと推定されている 22。天候市場に特化したボットも既に複数存在し、その多くが METAR データの取得を自動化している 1。
しかし、現在の競合ボットの多くは「整数値の更新」に反応するタイプであり、Remark セクションの T-Group までを解析し、正規分布モデルに基づいた確率密度関数からエントリー閾値を算出する高度なクオンツ・アプローチをとっているものは、依然として少数派である 1。また、多くのプレイヤーは api.weather.gov の遅延を十分に理解しておらず、Wunderground 等のサードパーティ API を介した「2次、3次情報」に基づいている。したがって、直接 ASOS/AWOS の生データにアクセスし、自前でデコードを行う技術力があれば、エッジの優位性は当面維持される。
短期予測精度向上（ECMWF, GFS）の裁定への影響
ECMWF（欧州中期予報センター）や GFS（米国全地球予報システム）といった気象予測モデルの精度は年々向上しており、特に AI を統合した予測モデルは驚異的な的中率を誇る 1。これにより、数日先の気温予測に基づく「投機的な価格形成」は非常に効率化されている。
しかし、本戦略の対象とするのは「既に発生した観測事実のラグ」である。どんなに優れた予測モデルであっても、実際の空港の気温計が「今この瞬間に何℃を指しているか」という実測値を完全に置き換えることはできない 1。裁定取引の有効時間枠は、観測から市場への反映までの 1 分から 60 分という「実測値の伝播ラグ」に依存するため、予測精度の向上はむしろ「市場価格が実測値に収束しようとする圧力」を強め、裁定機会の利益幅を確定させる助けとなる 1。
期待 ROI の推計とリスク・マトリクス
資金規模に応じた期待収益と、直面するリスクの所在を整理する。
資金規模別の運用シミュレーション
裁定取引の性質上、複利による指数関数的な成長よりも、市場の流動性に制約された一定の収益（キャッシュフロー型）となる傾向がある。
資金規模
1取引あたりのサイズ
期待月間 ROI
主要な実行戦略
$20 ～ $100
$1 ～ $5
15% ～ 30%
アルゴリズムの検証、手数料負けを回避するための高精度エントリー
$100 ～ $500
$10 ～ $50
10% ～ 25%
複数都市の同時監視。指値注文によるスリッページ抑制
$500 ～ $1,000
$50 ～ $100
5% ～ 15%
板の厚みを考慮した分割注文。UMA ガバナンスリスクの積極的管理

$20 という極小予算であっても、Polygon のガス代無料化（Signature Type 2）の恩恵により、理論上は 1 セント単位の利幅を積み上げることが可能である 1。一方、$1,000 を超える規模になると、板の薄さによるスリッページが顕在化し、単純な裁定から「指値を置いて他者の注文を待つ」受動的な戦略への移行が必要となる。
特定されたリスクの一覧と評価
リスク要因
カテゴリ
影響度
回避・軽減策
UMA 誤裁定（ガバナンス攻撃）
市場構造
致命的
OI が過大な市場を避ける。特定アドレスのクジラの動向を監視。
観測地点のデータ欠損・故障
技術的
高
複数ソース（METAR + Wunderground）の乖離を監視し、異常時は即停止。
スリッページによる利幅消失
実行
中
常に Limit Order を使用。Mid-price からの乖離率を厳格に制限。
API レート制限による機会損失
技術的
低
指数バックオフアルゴリズムの実装。WebSocket への移行。
データの修正（Revision）
市場ルール
中
UMA の判定基準が「速報」か「確報」かを Ancillary Data で確認。

結論と投資判断
Polymarket における METAR T-Group を利用した天候裁定取引は、現在の予測市場のインフラ状況において、依然として「アルファ（超過収益）」が存在する領域であると結論付けられる。特に、情報の取得元を aviationweather.gov の METAR 報に特化し、0.1度単位の精密な温度推移を正規分布モデルで処理することで、一般の投資家が視認する数分から数十分前に結果を予見できる。
しかし、この裁定機会は「マーケットの非効率性」に依存しており、Polymarket が提供する流動性報酬プログラム（Liquidity Rewards）や institutional な参加者の増加により、将来的にはスプレッドが縮小し、エッジが減衰する可能性がある 2。また、UMA オラクルのガバナンスリスクという「予測不能な外的要因」が存在するため、資産の 100% をこの戦略に投じるのは無謀であり、ポートフォリオの一部として、自動化された低リスク運用に留めるのが賢明である。
本報告書に基づき実装を行う場合、まずは $20 程度の少額資金で、KLGA（ニューヨーク）や KORD（シカゴ）といった流動性の高い市場からペーパー・トレーディングを開始し、自身の確率モデルと実際の決済結果の相関（Brier Score）を十分に検証することを推奨する 1。情報の非対称性を収益に変える鍵は、物理世界のセンサーが発する微細な信号を、誰よりも早く、かつ論理的にブロックチェーン上の価値へと変換する技術的誠実さにある。
引用文献
Polymarket天候予測ボット技術仕様書
Polymarket - Decentralized Prediction Market | BUVCG Research - Medium, 2月 11, 2026にアクセス、 https://medium.com/buvcg-research/polymarket-deep-dive-06afa8c9a02b
Arbitrage Bots Dominate Polymarket With Millions in Profits as Humans Fall Behind, 2月 11, 2026にアクセス、 https://johnlothiannews.com/arbitrage-bots-dominate-polymarket-with-millions-in-profits-as-humans-fall-behind/
Why Do API and Website Timestamps Differ? · weather-gov api ..., 2月 11, 2026にアクセス、 https://github.com/weather-gov/api/discussions/777
Weather Observations at Aerodromes | SKYbrary Aviation Safety, 2月 11, 2026にアクセス、 https://skybrary.aero/articles/weather-observations-aerodromes
A Meteorologist's Guide To Get More And The Best Quality Weather Station Data, 2月 11, 2026にアクセス、 https://scottdimmich.com/?p=3171
How to Read METAR Weather Report? - JOUAV, 2月 11, 2026にアクセス、 https://www.jouav.com/blog/how-to-read-metar.html
Weather update frequency question (ASOS / AWOS / etc.) : r/flying - Reddit, 2月 11, 2026にアクセス、 https://www.reddit.com/r/flying/comments/c9wvdc/weather_update_frequency_question_asos_awos_etc/
Observing and Coding Temperature and Dew Point Groups, 2月 11, 2026にアクセス、 http://www.moratech.com/aviation/metar-class/metar-pg11-t-td.html
METAR Remarks - FNL Pilots Association, 2月 11, 2026にアクセス、 https://www.fnlpilots.org/blog/2018/10/metar-remarks/
Lee's Guide to Decoding METARS, 2月 11, 2026にアクセス、 https://www.e-education.psu.edu/files/meteo101/image/Section13/metar_decoding1203.html
Inside UMA Oracle | How Prediction Markets Resolution Works - Rock'n'Block, 2月 11, 2026にアクセス、 https://rocknblock.io/blog/how-prediction-markets-resolution-works-uma-optimistic-oracle-polymarket
FAQs | UMA Documentation, 2月 11, 2026にアクセス、 https://docs.uma.xyz/faqs
How Are Markets Disputed? - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/polymarket-learn/markets/dispute
UMA Oracle | PolymarketGuide - GitBook, 2月 11, 2026にアクセス、 https://polymarketguide.gitbook.io/polymarketguide/resolution/uma-oracle
Resolution - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/resolution/UMA
Semantic Non-Fungibility and Violations of the Law of One Price in Prediction Markets - arXiv, 2月 11, 2026にアクセス、 https://arxiv.org/pdf/2601.01706
Semantic Non-Fungibility and Violations of the Law of One Price in Prediction Markets, 2月 11, 2026にアクセス、 https://arxiv.org/html/2601.01706v1
Why Is Polymarket's UMA Controversial? - Webopedia, 2月 11, 2026にアクセス、 https://www.webopedia.com/crypto/learn/polymarkets-uma-oracle-controversy/
Polymarket voters just verifiably got scammed after the UMA Oracle ..., 2月 11, 2026にアクセス、 https://www.reddit.com/r/CryptoCurrency/comments/1jki1lj/polymarket_voters_just_verifiably_got_scammed/
Polymarket Liquidity Analysis Reveals Key Insights into Prediction Markets - Phemex, 2月 11, 2026にアクセス、 https://phemex.com/news/article/polymarket-liquidity-analysis-reveals-key-insights-into-prediction-markets-52184
Automated Trading on Polymarket: Bots, Arbitrage & Execution ..., 2月 11, 2026にアクセス、 https://www.quantvps.com/blog/automated-trading-polymarket
Weather Predictions & Real-Time Odds | Polymarket, 2月 11, 2026にアクセス、 https://polymarket.com/predictions/weather
Liquidity Rewards - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/market-makers/liquidity-rewards
Polymarket | NautilusTrader Documentation, 2月 11, 2026にアクセス、 https://nautilustrader.io/docs/latest/integrations/polymarket/
Trading - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/market-makers/trading
Authentication - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/authentication
Orders Overview - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/orders/orders
Quickstart - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/quickstart
API Rate Limits - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/quickstart/introduction/rate-limits
Aviation Weather - NOAA Science Council, 2月 11, 2026にアクセス、 https://sciencecouncil.noaa.gov/noaa-by-the-numbers/thematic-areas/environmental-data-and-information/aviation-weather/
[2508.03474] Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets - arXiv, 2月 11, 2026にアクセス、 https://arxiv.org/abs/2508.03474
@automatedAItradingbot on Polymarket, 2月 11, 2026にアクセス、 https://polymarket.com/@automatedAItradingbot
Best Weather API 2025: A Comparison With the Most Popular APIs - stormglass.io, 2月 11, 2026にアクセス、 https://stormglass.io/best-weather-api-2025/


Polymarket天候市場における高精度裁定取引システム「Weather-Arb-Bot」技術仕様書
予測市場、特にPolymarketにおける天候予測市場は、情報の透明性とリアルタイム性が収益に直結する典型的なデータ主導型市場である。本報告書では、公式な気象観測データ（NOAA等）と市場価格の間に生じる「情報の空白期間」を特定し、それを高速な実行アルゴリズムで捕捉するための自動取引ボット「Weather-Arb-Bot」の実装について、その技術的根拠からインフラ構成、リスク管理に至るまでを詳述する。
第1章：データインフラストラクチャと遅延分析の深層
裁定取引の成否は、市場価格が参照する「公的な決済ソース」よりも早く、正確な生データを取得できるかどうかにかかっている。Polymarketの天候市場は、特定の観測地点における記録値を最終的な決済基準とするため、まず各都市の参照地点を特定する必要がある。
1.1 主要市場における決済参照地点の特定
Polymarketの天候市場（Temperature Markets）は、UMA（Universal Market Access）のオプティミスティック・オラクルを介して決済されるが、その背後には特定の観測ステーションが存在する 1。特にニューヨーク（NYC）、シカゴ（Chicago）、ロンドン（London）の市場において参照される公式ソースを以下の表にまとめる。
都市名
市場の種類
参照ソース
観測地点 ID (ICAO)
精密度
単位
ニューヨーク (NYC)
最高気温
NOAA / LaGuardia Airport
KLGA
整数
華氏 (°F)
シカゴ (Chicago)
最高気温
NOAA / O'Hare Intl Airport
KORD
整数
華氏 (°F)
ロンドン (London)
最高気温
Wunderground / London City Airport
EGLC
整数
摂氏 (°C)

ニューヨーク市場を例に挙げると、競合プラットフォームであるKalshiがセントラルパーク（Central Park）のデータを使用するのに対し、Polymarketはラガーディア空港（LaGuardia Airport）のデータを参照するという重要な差別化がある 3。この地理的差異により、同じ「NYCの気温」を対象としながらも、異なる決済結果が生じることが頻繁に発生する。裁定取引ボットは、これらの観測地点ごとのマイクロクライメイト（微気候）の差を認識しなければならない。
1.2 データプロバイダー間のレイテンシと更新頻度の解析
気象データの配信経路には複数の層が存在し、各層で数分から数時間の遅延が発生する。裁定取引において最も致命的なのは、NOAAの標準的なAPI（api.weather.gov）が、航空気象（METAR）や生データ配信システム（MADIS）に比べて著しく遅いことである 5。

データソース
更新頻度
実測遅延（観測から）
特徴と利用可能性
api.weather.gov
1時間ごと
60分 ～ 180分
公共サービスとして提供されるが、同期遅延が激しい 5
aviationweather.gov (METAR)
毎分 ～ 15分
1分 ～ 5分
航空運用向けの生データ。最も高速な無料ソース 5
OpenWeatherMap (Enterprise)
10分以内
2分 ～ 10分
有料。多くのAPIを統合しているが、仲介による遅延がある 7
Xweather (AerisWeather)
随時
1分 ～ 3分
Vaisalaの観測網を使用。極めて低レイテンシ 8
MADIS (LDAD)
1分 ～ 5分
20分前後
品質管理（QC）プロセスによる固定的な遅延が存在する 5

NOAAの api.weather.gov は、近年遅延が悪化しており、観測からAPIへの反映までに3時間以上かかるケースも報告されている 5。一方で、aviationweather.gov が提供するMETARデータは、航空機運航の安全性のためにリアルタイム性が確保されており、これが裁定取引の主要な「武器」となる。ボットは api.weather.gov を使用するのではなく、直接METARのJSONエンドポイントを監視すべきである。
1.3 METARデータの秘匿情報：「T-Group」による先読み
METARデータには、標準的な報告気温とは別に、追加情報セクション（Remark）に「T-Group」と呼ばれる4桁の精密温度データが含まれている 9。

この T01720083 は、実際には 17.2°C（華氏 62.96°F）であることを示している。Polymarketの市場参加者の多くは、Wunderground等のダッシュボードに表示される整数（例：17°C）だけを見ているため、この小数点以下の数値を捕捉することで、「次に気温が繰り上がる確率」を統計的に優位な状態で予測することが可能になる 9。この情報の非対称性こそが、ボットが利益を生み出す源泉である。
第2章：Polymarket CLOB APIの技術的実装
Polymarketは、オフチェーンのマッチングエンジンとオンチェーンの決済（Polygon）を組み合わせたハイブリッド型のCLOB（Central Limit Order Book）を採用している。注文の管理には py-clob-client ライブラリを使用し、EIP-712規格に従った暗号署名が必要となる 10。
2.1 認証プロセスと多階層署名
Polymarketの認証は、L1（秘密鍵による署名）とL2（API認証情報）の二段階で構成される。ボットの起動時には、まずウォレットの秘密鍵を使用してAPIキーを派生（Derive）させる必要がある 10。

Python


from py_clob_client.client import ClobClient
import os

def initialize_clob_client():
    host = "https://clob.polymarket.com"
    chain_id = 137 # Polygon Mainnet
    private_key = os.getenv("POLYMARKET_PK")
    funder = os.getenv("POLYMARKET_FUNDER")
    
    # L1認証: APIキーの作成または取得
    client = ClobClient(host, chain_id, private_key)
    api_creds = client.create_or_derive_api_creds()
    
    # L2認証: 注文実行用クライアントの初期化
    # signature_type=2 は Gnosis Safe などのプロキシウォレットを指す
    trading_client = ClobClient(host, chain_id, private_key, api_creds, signature_type=2, funder=funder)
    return trading_client


ここで重要なのは signature_type の選択である。多くのPolymarketユーザーは、Magic Linkやプロキシウォレット（Gnosis Safe）を介して取引を行っており、ボットもこれに合わせた設定を行わなければならない 10。特に signature_type=2 を使用する場合、注文はプロキシウォレットから実行され、ガス代の支払いはPolymarketのリレイヤーが肩代わりする構造となっているため、ガス代の最適化を考慮する必要がなくなる 12。
2.2 マーケットIDとトークンIDの動的取得
天候市場は日付ごとに異なるマーケット（Condition ID）を持つ。ボットは、Gamma APIを使用して、監視対象の市場を自動的に特定する。

API種類
エンドポイント
用途
Gamma API
/markets
市場の質問内容、Slug、Condition ID、トークンIDの取得 14
CLOB API
/book
板情報（Bids/Asks）の取得 14
CLOB API
/price
最新の約定価格の取得 14

特定のSlug（例：highest-temperature-in-nyc-on-february-11）から、取引に必要なトークンID（YesトークンとNoトークン）を取得するプロセスは以下の通りである。

Python


import requests

def get_market_details(slug):
    gamma_url = f"https://gamma-api.polymarket.com/markets?slug={slug}"
    data = requests.get(gamma_url).json()
    if not data:
        return None
    
    market = data
    # clobTokenIds が Yes,  が No であることが一般的
    return {
        "condition_id": market['conditionId'],
        "yes_token": market,
        "no_token": market
    }


2.3 注文管理とリミットオーダーの実装
裁定取引では、スリッページを最小限に抑えるために指値注文（Limit Order）が基本となる。py-clob-client では、注文の作成、ハッシュ化、署名、送信が高度に抽象化されている 11。

Python


from py_clob_client.clob_types import OrderArgs
from py_clob_client.order_builder.constants import BUY

async def execute_trade(client, token_id, price, size):
    # 指値注文のパラメータ設定
    order = OrderArgs(
        token_id=token_id,
        price=price,
        size=size,
        side=BUY
    )
    # 署名と投稿を一括実行
    response = await client.create_and_post_order(order)
    if response.get("success"):
        print(f"Order Matched: {response}")
    return response


注意点として、Polymarketの板には「Tick Size」のルールがあり、価格が 0.96 以上または 0.04 以下になると最小刻み幅が変化する場合がある 15。ボットは get_tick_size(token_id) を定期的に呼び出し、無効な価格で注文を送らないように制御する必要がある 17。
第3章：裁定取引アルゴリズムのロジックと数学的モデル
裁定取引の本質は、現在の観測気温データから「最終的な最高気温の分布」を予測し、その期待値と市場価格との乖離を特定することにある。
3.1 確率変換モデル：ガウス分布による超過確率の算出
気温の変動は短期的には正規分布（ガウス分布）に従うと仮定できる 19。ある時刻  における現在気温を 、その日の最高気温の期待値を 、過去の統計から導き出された残りの時間における変動の標準偏差を  とすると、最高気温が閾値  を超える（Yesとなる）確率  は以下の累積分布関数を用いて算出される。

ここで  は標準正規分布の累積分布関数である。 ボットは、1分ごとに METAR から  を取得し、 を現在の最高値に更新しつつ、観測終了（通常は現地時間の23:59）までの時間が短くなるにつれて  を減少させる 19。これにより、観測終了間際には確率は 0 または 1 に急速に収束する。
3.2 期待値 (EV) とエントリー閾値
期待値  が取引コスト（スリッページ、ガス代、取引手数料）を上回る場合にのみエントリーを行う。


パラメータ
設定値（推奨）
理由
最小期待値 (Min EV)
0.05 USDC
5セント以上の利幅を確保し、微小な変動を無視 20
信頼区間
95% ()
統計的に十分な確実性がある場合のみ実行 21
スリッページ許容度
1%
流動性が低い市場での予期せぬ損失を防止 22
最大ポジションサイズ
総資金の 10%
単一イベントのリスクを分散 22

3.3 スリッページと手数料の考慮
Polymarket自体には取引手数料（Trading Fees）は現在存在しないが、AMM（自動マーケットメイカー）時代とは異なり、CLOBでは板の薄さによる「暗黙の手数料」としてのスリッページが重要となる 24。ボットは、注文を出す前に必ず get_order_book(token_id) を呼び出し、希望するサイズ  を約定させた場合の平均価格  を計算しなければならない 14。
第4章：インフラとセキュリティの構築
24時間365日の稼働が前提となる裁定取引ボットには、堅牢な実行環境と厳格なセキュリティ管理が求められる。
4.1 AWS EC2 最小構成とデプロイメント
裁定取引においてレイテンシは重要であるが、天候データ自体の更新が分単位であることを考えると、超高速なHFT環境よりも安定性が優先される。
インスタンス: AWS EC2 t3.micro（無料枠対象）または t3.small。
OS: Ubuntu 22.04 LTS。
地域: us-east-1 (バージニア北部)。NOAAのデータサーバーおよびPolymarketのインフラ（Cloudflare経由）への近接性を考慮 26。
プロセス管理: PM2 を使用。クラッシュ時の自動再起動とログローテーションを実現 28。
4.2 セキュリティ：秘密鍵とAPIキーの保護
秘密鍵の漏洩は全資産の喪失を意味する。以下の実装ガイドラインを厳守する。
環境変数の利用: .env ファイルに PRIVATE_KEY を保存し、python-dotenv で読み込む 10。
IAMロールの制限: EC2インスタンスには、必要最小限の権限を持つIAMロールを付与する 26。
Vaultの使用（推奨）: HashiCorp Vault などの外部シークレット管理サービスを使用し、メモリ上でのみ鍵を保持する。
IP制限: PolymarketのAPIキー設定（可能な場合）において、EC2の固定IPアドレスからのアクセスのみを許可する 23。
4.3 異常検知と緊急停止（Kill-switch）
ボットが暴走して資産を食いつぶすのを防ぐため、二重の緊急停止ロジックを組み込む 17。

レイヤー
検知条件
実行アクション
マクロ・スイッチ
24時間の損失が予算の 20% 超
全注文キャンセル、プロセス停止 31
ミクロ・スイッチ
API 429 エラー（レート制限）の頻発
取引一時停止、指数バックオフ実行 27
データ・スイッチ
NOAA API と METAR の価格乖離が 5°F 超
データの信頼性低下とみなし、静観 5

第5章：リスク評価と過去の失敗事例
予測市場における裁定取引には、技術的なバグ以外の「市場構造的リスク」が存在する。
5.1 データの誤報と決済修正のリスク
決済ソースである気象局が、後からデータを修正（Revision）することがある。しかし、Polymarketのルールでは「一度決済が提案され、異議申し立て期間が終了した後の修正は反映されない」のが一般的である 32。 また、観測地点の機器故障によりデータが「null」や「N/A」になる場合、UMAオラクルは代替ソースを探すか、あるいは「50-50（ドロー）」で決済する可能性がある 6。この場合、ボットの予測モデルは完全に無効化される。
5.2 UMAオラクル紛争と「クジラ」の支配
UMAの紛争プロセスはゲーム理論に基づいているが、必ずしも「科学的正解」が選ばれるとは限らない。過去には、UMAトークンの大量保有者が自身の予測市場でのポジション（利益）を守るために、客観的事実に反する投票を行ったのではないかという疑惑が浮上したケースがある（例：ウクライナの資源に関する賭け） 36。 天候市場においても、決済間際に不自然な価格の吊り上げ（例：0.99 USDCでの大量買い）が発生した場合、それはオラクルへの攻撃やガバナンス操作の前兆である可能性があり、注意を要する 37。
5.3 流動性の罠（Liquidity Risk）
天候市場は政治やクリプト価格市場に比べて流動性が極めて低い 34。ボットが有利なデータを取得しても、対抗注文（Exit Liquidity）が存在しなければ利益を確定できない。特に、イベント終了直前にポジションを解消しようとしても、板が消失しているケースが多い 22。
第6章：20ドルの予算で検証するためのテスト戦略
実資金を投入する前に、最小構成でのサンドボックス検証を行う。
6.1 ステップバイステップの実装ガイド
フェーズ1：観測（Budget: $0）
Pythonスクリプトを EC2 で稼働させ、METARデータと Polymarket の価格（WebSocket使用 27）を DB（SQLite等）に記録する。
自身の確率モデルと実際の決済結果の相関（Brier Score）を計算する 39。
フェーズ2：ペーパー・トレーディング（Budget: $0）
実際には注文を出さず、ログ上で「ここで 1 USDC 投入」と記録し、仮想的な損益を算出する。
スリッページを厳しめ（Ask価格の +1セント）に見積もる。
フェーズ3：実戦検証（Budget: $20）
20ドルの USDC.e を Polygon 上のプロキシウォレットに送金する。
1取引あたりのサイズを 1 USDC に制限する。
signature_type: 2 を使用してガス代を無料にする 13。
1週間稼働させ、APIのレートリミット（3500 requests / 10s 40）に触れずに安定稼働するかを確認する。
6.2 成功のベンチマーク
勝率 (Win Rate): 65% 以上。天候データは客観的であるため、情報の先読みができていればこの数値は達成可能である 22。
シャープレシオ: 2.0 以上。ドローダウンが限定的であることを確認する。
実行遅延: METAR取得から注文送信までが 5秒以内。
本仕様書に基づく「Weather-Arb-Bot」は、気象学的な精密データとブロックチェーンの実行速度を組み合わせることで、従来のトレーダーには見えない収益機会を創出する。しかし、UMAオラクルのガバナンスリスクや決済ソースの不確実性は常に存在するため、緊急停止機能と徹底したリスク管理を設計の根幹に据えるべきである。
引用文献
Resolution - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/resolution/UMA
Inside UMA Oracle | How Prediction Markets Resolution Works - Rock'n'Block, 2月 11, 2026にアクセス、 https://rocknblock.io/blog/how-prediction-markets-resolution-works-uma-optimistic-oracle-polymarket
Semantic Non-Fungibility and Violations of the Law of One Price in Prediction Markets, 2月 11, 2026にアクセス、 https://arxiv.org/html/2601.01706v1
Semantic Non-Fungibility and Violations of the Law of One Price in Prediction Markets - arXiv, 2月 11, 2026にアクセス、 https://arxiv.org/pdf/2601.01706
Observations delayed 1+ hours or more lately · weather-gov api ..., 2月 11, 2026にアクセス、 https://github.com/weather-gov/api/discussions/751
API Web Service - National Weather Service, 2月 11, 2026にアクセス、 https://www.weather.gov/documentation/services-web-api
Pricing - OpenWeather, 2月 11, 2026にアクセス、 https://openweathermap.org/price
Top weather APIs in 2026 - Xweather, 2月 11, 2026にアクセス、 https://www.xweather.com/blog/article/top-weather-apis-for-production-2026
Highest temperature in NYC on July 24? Betting Odds & Predictions | Polymarket, 2月 11, 2026にアクセス、 https://base.polymarket.com/event/highest-temperature-in-nyc-on-july-24
Authentication - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/authentication
py-clob-client - PyPI, 2月 11, 2026にアクセス、 https://pypi.org/project/py-clob-client/
Quickstart - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/quickstart
Polymarket/turnkey-safe-builder-example - GitHub, 2月 11, 2026にアクセス、 https://github.com/Polymarket/turnkey-safe-builder-example
Fetching Market Data - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/quickstart/fetching-data
Market Channel - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/websocket/market-channel
Orders Overview - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/orders/orders
Trading - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/market-makers/trading
When creating a market order, the tick size was invalid. · Issue #232 · Polymarket/clob-client, 2月 11, 2026にアクセス、 https://github.com/Polymarket/clob-client/issues/232
CPC "Probability of Exceedance" Temperature Forecast, 2月 11, 2026にアクセス、 https://www.cpc.ncep.noaa.gov/pacdir/NFORdir/INTRdd.html
Polymarket trading bot - exploiting market inefficiencies to make arbitrage trades. - Reddit, 2月 11, 2026にアクセス、 https://www.reddit.com/r/SideProject/comments/1qz11e5/polymarket_trading_bot_exploiting_market/
Drawdown Monte Carlo Simulation Calculator for Sports Betting - Winner Odds, 2月 11, 2026にアクセス、 https://winnerodds.com/drawdown-monte-carlo-simulation-calculator-for-sports-betting/
Polymarket Copy Trading Bot: How Traders Find Alpha by Mirroring Profitable Wallets, 2月 11, 2026にアクセス、 https://www.quantvps.com/blog/polymarket-copy-trading-bot
zydomus219/Polymarket-betting-bot - GitHub, 2月 11, 2026にアクセス、 https://github.com/zydomus219/Polymarket-betting-bot
CLOB Introduction - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/developers/CLOB/introduction
Polymarket Documentation: What is Polymarket?, 2月 11, 2026にアクセス、 https://docs.polymarket.com/polymarket-learn/get-started/what-is-polymarket
Stop and start EC2 instances automatically on a schedule using Quick Setup - AWS Systems Manager, 2月 11, 2026にアクセス、 https://docs.aws.amazon.com/systems-manager/latest/userguide/quick-setup-scheduler.html
Automated Trading on Polymarket: Bots, Arbitrage & Execution Strategies | QuantVPS, 2月 11, 2026にアクセス、 https://www.quantvps.com/blog/automated-trading-polymarket
Keep Your Node.js App Alive on EC2 with PM2: A Beginner's Guide | by Raghu Anand, 2月 11, 2026にアクセス、 https://medium.com/@raghuaanand/keep-your-node-js-app-alive-on-ec2-with-pm2-a-beginners-guide-9808667c4021
Host your Discord Bot on EC2 instance(AWS) - Rishab Kumar, 2月 11, 2026にアクセス、 https://rishabkumar.com/_blog/dicord-bot-on-aws/
How to Build an AI Trading Bot: A Complete Developer's Guide (2026) - Alchemy, 2月 11, 2026にアクセス、 https://www.alchemy.com/blog/how-to-build-an-ai-trading-bot
I've spent months building a multi-layer Python trading bot. Here's what I've learned (and what failed). : r/Daytrading - Reddit, 2月 11, 2026にアクセス、 https://www.reddit.com/r/Daytrading/comments/1ovcbxj/ive_spent_months_building_a_multilayer_python/
Highest temperature in London on February 10? Betting Odds & Predictions (Feb. 8, 2026) | Polymarket, 2月 11, 2026にアクセス、 https://polymarket.com/event/highest-temperature-in-london-on-february-10-2026/highest-temperature-in-london-on-february-10-2026-11c
Highest temperature in London on February 8? Betting Odds & Predictions | Polymarket, 2月 11, 2026にアクセス、 https://polymarket.com/event/highest-temperature-in-london-on-february-8
Highest temperature in Chicago on February 3? Betting Odds & Predictions (Feb. 1, 2026), 2月 11, 2026にアクセス、 https://polymarket.com/event/highest-temperature-in-chicago-on-february-3-2026/highest-temperature-in-chicago-on-february-3-2026-21forbelow
How Are Markets Disputed? - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/polymarket-learn/markets/dispute
Why Is Polymarket's UMA Controversial? - Webopedia, 2月 11, 2026にアクセス、 https://www.webopedia.com/crypto/learn/polymarkets-uma-oracle-controversy/
Polymarket faces major credibility crisis after whales forced a “YES” UFO vote without evidence | Bitget News, 2月 11, 2026にアクセス、 https://www.bitget.com/news/detail/12560605105613
Highest temperature in Chicago on February 9? Betting Odds & Predictions (Feb. 7, 2026), 2月 11, 2026にアクセス、 https://polymarket.com/event/highest-temperature-in-chicago-on-february-9-2026
Conditional Exceedance Probabilities - American Meteorological Society, 2月 11, 2026にアクセス、 https://journals.ametsoc.org/view/journals/mwre/135/2/mwr3284.1.pdf
API Rate Limits - Polymarket Documentation, 2月 11, 2026にアクセス、 https://docs.polymarket.com/quickstart/introduction/rate-limits
