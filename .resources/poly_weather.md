GakutonoMacBook-Air:onepla tobinaga$ curl "https://gamma-api.polymarket.com/events/pagination?limit=50&active=true&archived=false&tag_slug=weather&closed=false&order=volume24hr&ascending=false&offset=0" | jq '.data[] | select(.title | contains("temperature")) | {
>   title: .title,
>   closed: .markets[0].closed
> }'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 1138k    0 1138k    0     0  6284k      0 --:--:-- --:--:-- --:--:-- 6288k
{
  "title": "Highest temperature in Seoul on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in Toronto on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in NYC on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in London on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in Atlanta on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in Dallas on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in London on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Seattle on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in Miami on February 11?",
  "closed": false
}
{
  "title": "Highest temperature in Buenos Aires on February 11?",
  "closed": false
}
{
  "title": "Highest temperature in NYC on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Ankara on February 11?",
  "closed": true
}
{
  "title": "Highest temperature in Seoul on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Wellington on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Chicago on February 11?",
  "closed": false
}
{
  "title": "Highest temperature in Atlanta on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Dallas on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Chicago on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Miami on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Seattle on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Buenos Aires on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Toronto on February 12?",
  "closed": false
}
{
  "title": "Highest temperature in Ankara on February 12?",
  "closed": false
}
GakutonoMacBook-Air:onepla tobinaga$ # 2月12日の温度マーケットだけを抽出
GakutonoMacBook-Air:onepla tobinaga$ curl "https://gamma-api.polymarket.com/events/pagination?limit=50&active=true&archived=false&tag_slug=weather&closed=false&order=volume24hr&ascending=false&offset=0" | jq '.data[] | select(.title | contains("temperature") and contains("February 12")) | .title'
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100 1138k    0 1138k    0     0  6710k      0 --:--:-- --:--:-- --:--:-- 6734k
"Highest temperature in London on February 12?"
"Highest temperature in NYC on February 12?"
"Highest temperature in Seoul on February 12?"
"Highest temperature in Wellington on February 12?"
"Highest temperature in Atlanta on February 12?"
"Highest temperature in Dallas on February 12?"
"Highest temperature in Chicago on February 12?"
"Highest temperature in Miami on February 12?"
"Highest temperature in Seattle on February 12?"
"Highest temperature in Buenos Aires on February 12?"
"Highest temperature in Toronto on February 12?"
"Highest temperature in Ankara on February 12?"
GakutonoMacBook-Air:onepla tobinaga$ 