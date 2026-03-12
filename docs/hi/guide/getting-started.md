# शुरू करें

## zod-v4-mocks क्या है

Zod v4 स्कीमा से मॉक डेटा स्वचालित रूप से जनरेट करने वाली लाइब्रेरी है। टेस्टिंग, डेवलपमेंट और प्रोटोटाइपिंग में, स्कीमा परिभाषा से तुरंत रियलिस्टिक डमी डेटा जनरेट कर सकते हैं।

आंतरिक रूप से [@faker-js/faker](https://fakerjs.dev/) का उपयोग करती है, जिससे ईमेल एड्रेस, URL, UUID आदि फॉर्मेट के अनुरूप डेटा जनरेट होता है।

::: tip Zod v3 (v4 preview) उपयोग करने वालों के लिए
यदि आप `zod@3.25.76` में `import from 'zod/v4'` का उपयोग कर रहे हैं, तो [zod-v4-preview-mocks](https://www.npmjs.com/package/zod-v4-preview-mocks) का उपयोग करें।
:::

::: warning v2.0.0–v2.0.4 संगतता समस्या
v2.0.0–v2.0.4 में Zod v4.3.5 से पुराने संस्करणों के साथ संगतता समस्या थी (`ZodMAC`, `ZodCodec`, `ZodXor`, `ZodExactOptional` क्लास न होने के कारण क्रैश)। यदि आप Zod v4.0.0–v4.3.4 का उपयोग कर रहे हैं, तो कृपया **v2.1.0+** में अपग्रेड करें।
:::

## इंस्टॉलेशन

::: code-group
```bash [npm]
npm install zod-v4-mocks
```
```bash [pnpm]
pnpm add zod-v4-mocks
```
```bash [yarn]
yarn add zod-v4-mocks
```
:::

**आवश्यकताएँ**: Zod v4.0.0 या उससे ऊपर, Node.js 18 या उससे ऊपर

## बुनियादी उपयोग

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
})

const generator = initGenerator({ seed: 1 })
const mockUser = generator.generate(schema)
console.log(mockUser)
// => { id: "08e93b6a-...", name: "subito", email: "Dion59@gmail.com", ... }
```

जनरेट की गई वैल्यू मूल रूप से स्कीमा वैलिडेशन पास करती हैं:

```ts
schema.parse(mockUser) // OK - वैलिडेशन सफल
```

## एक साथ कई मॉक जनरेट करें

`multiGenerate` का उपयोग करके, कई स्कीमा से एक साथ मॉक डेटा जनरेट कर सकते हैं।

```ts
const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const postSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
})

const generator = initGenerator({ seed: 1 })
const mocks = generator.multiGenerate({
  user: userSchema,
  post: postSchema,
})

console.log(mocks.user) // { id: "...", name: "...", email: "..." }
console.log(mocks.post) // { id: 123, title: "...", body: "...", published: true }
```

## पुनरुत्पादन योग्य जनरेशन

एक ही `seed` वैल्यू निर्दिष्ट करने पर, हर बार वही मॉक डेटा जनरेट होता है। यह टेस्ट की स्थिरता के लिए उपयोगी है।

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

::: tip पुनरुत्पादन बनाए रखने के लिए सुझाव
`override` में कस्टम जेनरेटर परिभाषित करते समय, `Math.random()` या `Date.now()` के बजाय, आर्गुमेंट में दिए गए `options.faker` का उपयोग करें। `faker` इंस्टेंस seed पर आधारित RNG का उपयोग करता है।
:::

## जटिल स्कीमा

नेस्टेड ऑब्जेक्ट, ऐरे, रिकॉर्ड, यूनियन आदि जटिल स्कीमा को भी सपोर्ट करता है।

```ts
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
})

const mock = initGenerator().generate(complexSchema)
```

## सपोर्टेड स्कीमा

### पूर्ण सपोर्ट

| कैटेगरी | स्कीमा |
|---------|---------|
| **प्रिमिटिव** | string, number, boolean, bigint, date, null, undefined, void, any, unknown, NaN, symbol |
| **स्ट्रिंग फॉर्मेट** | email, URL, UUID (v1~v8), GUID, NanoID, ULID, CUID, CUID2, XID, KSUID, JWT, emoji, IPv4, IPv6, CIDRv4, CIDRv6, Base64, Base64URL, E164, hostname, datetime, isodate, isotime, isoduration |
| **कलेक्शन** | object, array, tuple, record, map, set |
| **कम्पोज़िट टाइप** | union, discriminatedUnion, intersection (समान टाइप), xor |
| **मॉडिफायर** | optional, exactOptional, nullable, nonoptional, readonly, default, prefault |
| **अन्य** | enum, literal, templateLiteral, lazy, pipe, codec, catch, success, file |

### आंशिक सपोर्ट

| स्कीमा | नोट |
|---------|--------|
| `z.lazy()` | गहराई सीमा सहित (डिफ़ॉल्ट 5 स्तर)। टॉप-लेवल `union` में एरर की संभावना |
| `z.intersection()` | समान टाइप आपस में सपोर्टेड। अलग-अलग टाइप सिद्धांत रूप से असपोर्टेड (object+record, array+tuple अपवाद) |
| `.refine()` | वैलिडेशन कंडीशन को अनदेखा किया जाता है |
| `.check()` | केवल `z.overwrite()` / `z.trim()` सपोर्टेड। `z.regex()` / `z.minLength()` आदि असपोर्टेड (मेथड फॉर्म `.regex()` सपोर्टेड) |

### असपोर्टेड

| स्कीमा | कारण |
|---------|------|
| `z.custom()` / `z.instanceof()` | कस्टम वैलिडेशन पार्सिंग संभव नहीं। `override` से समाधान |
| `z.function()` | फंक्शन का मॉक जनरेशन जटिल है |
| `.catchall()` | अनदेखा किया जाता है (मॉक जनरेशन पर प्रभाव नहीं) |
| `z.nativeEnum()` | Zod v4 में डेप्रिकेटेड। `z.enum()` का उपयोग करें |

## अगले कदम

- [कॉन्फ़िगरेशन](/hi/guide/configuration) - MockConfig के सभी विकल्प
- [कस्टम जेनरेटर](/hi/guide/custom-generator) - supply / override / register का उपयोग
- [API संदर्भ](/hi/api/) - सभी मेथड का विवरण
- [Playground](/hi/playground/) - ब्राउज़र में आज़माएँ
