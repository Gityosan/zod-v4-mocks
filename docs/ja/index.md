---
layout: home

hero:
  name: zod-v4-mocks
  text: Mock Generator for Zod v4
  tagline: Zodスキーマからモックデータを自動生成
  actions:
    - theme: brand
      text: はじめに
      link: /ja/guide/getting-started
    - theme: alt
      text: Playground
      link: /ja/playground/
    - theme: alt
      text: GitHub
      link: https://github.com/Gityosan/zod-v4-mocks

features:
  - title: シンプルなAPI
    details: initGenerator().generate(schema) だけでモックデータを生成できます。
  - title: 豊富なスキーマ対応
    details: string, number, object, array, union, tuple, record, enum, templateLiteral など幅広いZod v4スキーマに対応。
  - title: 再現性のある生成
    details: seed値を指定すれば、同じ入力に対して常に同じ出力を得られます。
  - title: カスタマイズ可能
    details: supply/overrideで特定の型に対するカスタム値やジェネレータ関数を設定できます。
---
