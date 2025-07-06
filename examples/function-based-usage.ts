import { z } from 'zod/v4';
import { type CustomGeneratorType, initGenerator } from '../src';

const basicSchema = z.object({
  id: z.string(),
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
  minArrayLength: 2,
  maxArrayLength: 5,
  locale: 'ja',
} as const;
const mockUserWithConfig = initGenerator(config).generate(basicSchema);
console.log(mockUserWithConfig);

// 3. override function
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

// 4. complex schema
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

// 5. register function
// please set meta's attribute name which is used to generate consistent property value
const consistentKey = 'name';
const DeviceId = z.uuid().meta({ [consistentKey]: 'DeviceId' });
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' });
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' });

const deviceSchema = z.object({
  id: DeviceId,
  name: z.string(),
  type: z.enum(['mobile', 'desktop', 'tablet']),
});
const userSchema = z.object({
  id: UserId,
  name: z.string(),
  email: z.email(),
  deviceId: DeviceId,
  device: deviceSchema,
});
const postSchema = z.object({
  id: PostId,
  title: z.string(),
  content: z.string(),
  authorId: UserId,
  author: userSchema,
});
const postsResponse = z.array(postSchema);
const mock = initGenerator({ consistentKey })
  .register([DeviceId, UserId, PostId])
  .generate(postsResponse);
console.log(JSON.stringify(mock, null, 2));
