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
const mockUser = initGenerator(basicSchema).generate();
console.log(mockUser);

// 2. custom config
const config = {
  seed: 42,
  minArrayLength: 2,
  maxArrayLength: 5,
  locale: 'ja',
} as const;
const mockUserWithConfig = initGenerator(basicSchema, config).generate();
console.log(mockUserWithConfig);

// 3. override function
const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options;
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName();
  }
};

const mockUserWithOverride = initGenerator(basicSchema)
  .override(customGenerator)
  .generate();
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
const complexMock = initGenerator(complexSchema).generate();
console.log(JSON.stringify(complexMock, null, 2));

// 5. register function
const DeviceId = z.uuid().meta({ name: 'DeviceId' });
const UserId = z.uuid().meta({ name: 'UserId' });
const PostId = z.uuid().meta({ name: 'PostId' });

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
const schemas = [DeviceId, UserId, PostId];
const mock = initGenerator(z.array(postSchema), {
  consistentName: 'name', // please set meta's attribute name which is used to generate consistent property value
  minArrayLength: 2,
  seed: 123,
})
  .register(schemas)
  .generate();
console.log(JSON.stringify(mock, null, 2));
