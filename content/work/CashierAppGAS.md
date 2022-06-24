---
title: "MMACashierCalculator"
date: 2022-06-24T22:29:46+09:00
---

# これは何？
会計用部費計算アプリです．([ソースコード](https://gist.github.com/Nafmo2/41004dc92850683ad58b923c5c1a995c#file-mmacashiercalculator-gs))

サークルの会計役員が部費の計算を手でやっていた作業を自動化するソフト．ついでにスプレッドシートにも記載します．

以下参考画像

![GAS](/images/GAS.png)

# 仕様
 userid[^MMAID]と収めた金額を入力する．そこから部費何ヶ月分かを計算し，SpreadSheetに書き込んでくれる
 
 - 今月分からの支払う払込しか計算できない
 - 部費500円が何ヶ月分かを計算できる
 - 実装はGoogle Apps Scriptを使用
 - Slackにメンション付きで通知を飛ばせる

[^MMAID]:MMAは本名でなくuseridで部員を呼んだり管理したりする

# 今後の課題
 - 現在は誰でもアクセスできるので会計のみが使えるようにしたい
   - GoogleAppScriptなのでGoogleAccountの絞り込みで解決しそう
 - 会計しか使えないSpreadSheetから読んで更新するようにしたい
   - 権限とそのSpreadSheet用に調整が必要
   - 今月分より前は支払済と仮定しなくて済む
   - これができないといつまで支払済かを入力させなきゃいけない
 - 入部費3000円を引くボタンやスイッチなどの作成
 - デザイン誰かかっこよくしてくれ

