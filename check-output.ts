import { z } from 'zod';
import { initGenerator } from './src';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
  createdAt: z.date(),
  isActive: z.boolean(),
});

const postSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  authorId: z.string().uuid(),
  tags: z.array(z.string()),
  publishedAt: z.date(),
  views: z.bigint(),
});

const generator = initGenerator({ seed: 42 });

// Test multiGenerate
const mocks = generator.multiGenerate({
  user: userSchema,
  post: postSchema,
});

console.log('Generated mocks:', JSON.stringify(mocks, (_, v) =>
  typeof v === 'bigint' ? v.toString() + 'n' : v instanceof Date ? v.toISOString() : v
, 2));

// Test output - TS
const tsPath = generator.output(mocks, { path: './__generated__/mocks.ts' });
console.log(`\nTS output: ${tsPath}`);

// Test output - JSON
const jsonPath = generator.output(mocks, { path: './__generated__/mocks.json' });
console.log(`JSON output: ${jsonPath}`);

// Test single generate + output
const singleUser = generator.generate(userSchema);
const singlePath = generator.output(singleUser, { path: './__generated__/single-user.ts' });
console.log(`Single user output: ${singlePath}`);

console.log('\nDone! Check ./__generated__/ folder');
