import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'zod-v4-mocks',
  description: 'Mock generator for Zod v4',
  base: '/',

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
        sidebar: {
          '/guide/': [
            {
              text: 'Guide',
              items: [
                { text: 'Getting Started', link: '/guide/getting-started' },
                { text: 'Configuration', link: '/guide/configuration' },
                { text: 'Custom Generator', link: '/guide/custom-generator' },
                { text: 'Schema Support', link: '/guide/schema-support' },
              ],
            },
          ],
          '/api/': [
            {
              text: 'API Reference',
              items: [{ text: 'Overview', link: '/api/' }],
            },
          ],
        },
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
        sidebar: {
          '/ja/guide/': [
            {
              text: 'ガイド',
              items: [
                { text: 'はじめに', link: '/ja/guide/getting-started' },
                { text: '設定', link: '/ja/guide/configuration' },
                {
                  text: 'カスタムジェネレータ',
                  link: '/ja/guide/custom-generator',
                },
                { text: 'スキーマ対応状況', link: '/ja/guide/schema-support' },
              ],
            },
          ],
          '/ja/api/': [
            {
              text: 'API リファレンス',
              items: [{ text: '概要', link: '/ja/api/' }],
            },
          ],
        },
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
        sidebar: {
          '/zh/guide/': [
            {
              text: '指南',
              items: [
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '配置', link: '/zh/guide/configuration' },
                { text: '自定义生成器', link: '/zh/guide/custom-generator' },
                { text: 'Schema 支持情况', link: '/zh/guide/schema-support' },
              ],
            },
          ],
          '/zh/api/': [
            {
              text: 'API 参考',
              items: [{ text: '概述', link: '/zh/api/' }],
            },
          ],
        },
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
        sidebar: {
          '/hi/guide/': [
            {
              text: 'गाइड',
              items: [
                { text: 'शुरू करें', link: '/hi/guide/getting-started' },
                { text: 'कॉन्फ़िगरेशन', link: '/hi/guide/configuration' },
                { text: 'कस्टम जेनरेटर', link: '/hi/guide/custom-generator' },
                { text: 'Schema सपोर्ट', link: '/hi/guide/schema-support' },
              ],
            },
          ],
          '/hi/api/': [
            {
              text: 'API संदर्भ',
              items: [{ text: 'अवलोकन', link: '/hi/api/' }],
            },
          ],
        },
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
