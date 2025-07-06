import { z } from 'zod/v4';
import { createMockConfig, generateMock } from '../src/mock-generator';

// 基本的な使用例
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
});

// 関数ベースAPI - シンプルな使用法
console.log('基本的な使用法:');
const mockUser = generateMock(userSchema).generate();
console.log(mockUser);

// カスタム設定を使用
console.log('\nカスタム設定付き:');
const customConfig = createMockConfig({
  seed: 42,
  minArrayLength: 2,
  maxArrayLength: 5,
  locale: 'ja',
});

const mockUserWithConfig = generateMock(userSchema, customConfig).generate();
console.log(mockUserWithConfig);

// オーバーライド機能の使用例
console.log('\nオーバーライド機能を使用:');
const mockUserWithOverride = generateMock(userSchema)
  .override((faker, schema) => {
    if (schema instanceof z.ZodString && schema === userSchema.shape.name) {
      return 'カスタム名前: ' + faker.person.fullName();
    }
    return null;
  })
  .generate();
console.log(mockUserWithOverride);

// 複雑なスキーマの例
const complexSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      notifications: z.boolean().default(true),
    }),
  }),
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      publishedAt: z.date().nullable(),
      tags: z.array(z.string()),
    }),
  ),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
});

console.log('\n複雑なスキーマ:');
const complexMock = generateMock(complexSchema, { seed: 123 }).generate();
console.log(JSON.stringify(complexMock, null, 2));
