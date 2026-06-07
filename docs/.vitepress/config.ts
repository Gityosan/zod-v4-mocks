import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'zod-v4-mocks',
  description: 'Mock generator for Zod v4',
  base: '/zod-v4-mocks/',
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/zod-v4-mocks/favicon.svg' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'zod-v4-mocks' }],
    ['meta', { property: 'og:description', content: 'Mock generator for Zod v4' }],
    ['meta', { property: 'og:image', content: 'https://gityosan.github.io/zod-v4-mocks/og-image.png' }],
    ['meta', { property: 'og:url', content: 'https://gityosan.github.io/zod-v4-mocks/' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://gityosan.github.io/zod-v4-mocks/og-image.png' }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'API', link: '/api/' },
          { text: 'Playground', link: '/playground/' },
        ],
        sidebar: [
          {
            text: 'Introduction',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
            ],
          },
          {
            text: 'Guide',
            items: [
              { text: 'Configuration', link: '/guide/configuration' },
              { text: 'Custom Generator', link: '/guide/custom-generator' },
              { text: 'CLI & Config File', link: '/guide/cli-and-config-file' },
              { text: 'MCP Server', link: '/guide/mcp' },
              { text: 'Schema Support', link: '/guide/schema-support' },
            ],
          },
          {
            text: 'API Reference',
            items: [
              { text: 'Overview', link: '/api/' },
              { text: 'Generation', link: '/api/generation' },
              { text: 'Customization', link: '/api/customization' },
              { text: 'Serialization & Output', link: '/api/serialization' },
              { text: 'Types', link: '/api/types' },
            ],
          },
          { text: 'Playground', link: '/playground/' },
        ],
      },
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      themeConfig: {
        nav: [
          { text: 'ガイド', link: '/ja/guide/getting-started' },
          { text: 'API', link: '/ja/api/' },
          { text: 'Playground', link: '/ja/playground/' },
        ],
        sidebar: [
          {
            text: '入門',
            items: [{ text: 'はじめに', link: '/ja/guide/getting-started' }],
          },
          {
            text: 'ガイド',
            items: [
              { text: '設定', link: '/ja/guide/configuration' },
              {
                text: 'カスタムジェネレータ',
                link: '/ja/guide/custom-generator',
              },
              {
                text: 'CLI と設定ファイル',
                link: '/ja/guide/cli-and-config-file',
              },
              { text: 'MCP サーバー', link: '/ja/guide/mcp' },
              { text: 'スキーマ対応状況', link: '/ja/guide/schema-support' },
            ],
          },
          {
            text: 'API リファレンス',
            items: [
              { text: '概要', link: '/ja/api/' },
              { text: '生成', link: '/ja/api/generation' },
              { text: 'カスタマイズ', link: '/ja/api/customization' },
              { text: 'シリアライズと出力', link: '/ja/api/serialization' },
              { text: '型定義', link: '/ja/api/types' },
            ],
          },
          { text: 'Playground', link: '/ja/playground/' },
        ],
      },
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: 'API', link: '/zh/api/' },
          { text: 'Playground', link: '/zh/playground/' },
        ],
        sidebar: [
          {
            text: '入门',
            items: [{ text: '快速开始', link: '/zh/guide/getting-started' }],
          },
          {
            text: '指南',
            items: [
              { text: '配置', link: '/zh/guide/configuration' },
              { text: '自定义生成器', link: '/zh/guide/custom-generator' },
              { text: 'CLI 与配置文件', link: '/zh/guide/cli-and-config-file' },
              { text: 'MCP 服务器', link: '/zh/guide/mcp' },
              { text: 'Schema 支持情况', link: '/zh/guide/schema-support' },
            ],
          },
          {
            text: 'API 参考',
            items: [
              { text: '概述', link: '/zh/api/' },
              { text: '生成', link: '/zh/api/generation' },
              { text: '自定义', link: '/zh/api/customization' },
              { text: '序列化与输出', link: '/zh/api/serialization' },
              { text: '类型定义', link: '/zh/api/types' },
            ],
          },
          { text: 'Playground', link: '/zh/playground/' },
        ],
      },
    },
    hi: {
      label: 'हिन्दी',
      lang: 'hi-IN',
      themeConfig: {
        nav: [
          { text: 'गाइड', link: '/hi/guide/getting-started' },
          { text: 'API', link: '/hi/api/' },
          { text: 'Playground', link: '/hi/playground/' },
        ],
        sidebar: [
          {
            text: 'परिचय',
            items: [{ text: 'शुरू करें', link: '/hi/guide/getting-started' }],
          },
          {
            text: 'गाइड',
            items: [
              { text: 'कॉन्फ़िगरेशन', link: '/hi/guide/configuration' },
              { text: 'कस्टम जेनरेटर', link: '/hi/guide/custom-generator' },
              { text: 'CLI और कॉन्फ़िग फ़ाइल', link: '/hi/guide/cli-and-config-file' },
              { text: 'MCP सर्वर', link: '/hi/guide/mcp' },
              { text: 'Schema सपोर्ट', link: '/hi/guide/schema-support' },
            ],
          },
          {
            text: 'API संदर्भ',
            items: [
              { text: 'अवलोकन', link: '/hi/api/' },
              { text: 'जेनरेशन', link: '/hi/api/generation' },
              { text: 'कस्टमाइज़ेशन', link: '/hi/api/customization' },
              { text: 'सीरियलाइज़ेशन और आउटपुट', link: '/hi/api/serialization' },
              { text: 'टाइप परिभाषाएँ', link: '/hi/api/types' },
            ],
          },
          { text: 'Playground', link: '/hi/playground/' },
        ],
      },
    },
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Gityosan/zod-v4-mocks' },
    ],
    search: {
      provider: 'local',
    },
  },

  vite: {
    ssr: {
      noExternal: ['@monaco-editor/loader'],
    },
  },
});
