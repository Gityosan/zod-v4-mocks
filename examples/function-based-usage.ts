import { z } from 'zod';
import { type CustomGeneratorType, initGenerator } from '../src';

const basicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
});

// 1. basic usage
const mockUser = initGenerator().generate(basicSchema);
console.log(mockUser);

// 2. custom config
const config = {
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
} as const;
const mockUserWithConfig = initGenerator(config).generate(basicSchema);
console.log(mockUserWithConfig);

// 3. supply function
const mockUserWithSupply = initGenerator()
  .supply(z.ZodString, 'custom name')
  .supply(z.ZodEmail, 'custom_email@example.com')
  .generate(basicSchema);
console.log(mockUserWithSupply);

// 4. override function
const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options;
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName();
  }
};

const mockUserWithOverride = initGenerator()
  .override(customGenerator)
  .generate(basicSchema);
console.log(mockUserWithOverride);

// 5. complex schema
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
const complexMock = initGenerator().generate(complexSchema);
console.log(JSON.stringify(complexMock, null, 2));

// 6. register function
// Please set meta's attribute name which is used to generate consistent property value
const consistentKey = 'name';
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' });
const CommentId = z.uuid().meta({ [consistentKey]: 'CommentId' });
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' });

const userSchema = z.object({
  id: UserId,
  name: z.string(),
});

const commentSchema = z.object({
  id: CommentId,
  postId: PostId,
  user: userSchema,
  userId: UserId,
});

const postSchema = z.object({
  id: PostId,
  comments: z.array(commentSchema),
});

const PostsResponse = z.array(postSchema);

const schemas = [CommentId, UserId, PostId];
const mock = initGenerator({ consistentKey })
  .register(schemas)
  .generate(PostsResponse);
console.log(JSON.stringify(mock, null, 2));

// 7. branded schema example (type inference check)
const BrandedUserId = z.string().brand<'UserId'>();
const brandedValue = initGenerator().generate(BrandedUserId);
// Type check: this should compile if generate() returns z.infer<typeof BrandedUserId>
type BrandedUserIdType = z.infer<typeof BrandedUserId>;
const _typeCheckBranded: BrandedUserIdType = brandedValue;
console.log('branded:', brandedValue);
