---
layout: home

hero:
  name: zod-v4-mocks
  text: Mock Generator for Zod v4
  tagline: 从 Zod Schema 自动生成 Mock 数据
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: Playground
      link: /zh/playground/
    - theme: alt
      text: GitHub
      link: https://github.com/Gityosan/zod-v4-mocks

features:
  - title: 简洁的 API
    details: 只需 initGenerator().generate(schema) 即可生成 Mock 数据。
  - title: 丰富的 Schema 支持
    details: 支持 string, number, object, array, union, tuple, record, enum, templateLiteral 等多种 Zod v4 Schema。
  - title: 可复现的生成
    details: 指定 seed 值后，相同输入始终产生相同输出。
  - title: 可自定义
    details: 通过 supply/override 为特定类型设置自定义值或生成器函数。
---
