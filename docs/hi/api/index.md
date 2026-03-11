# API संदर्भ

## initGenerator

```ts
function initGenerator(config?: Partial<MockConfig>): MockGenerator
```

`MockGenerator` इंस्टेंस जनरेट करता है। `config` छोड़ने पर डिफ़ॉल्ट सेटिंग्स का उपयोग होता है।

```ts
import { initGenerator } from 'zod-v4-mocks'

// डिफ़ॉल्ट सेटिंग्स
const generator = initGenerator()

// कस्टम सेटिंग्स
const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})
```

## MockGenerator

`initGenerator()` द्वारा लौटाया गया क्लास इंस्टेंस है। मॉक डेटा की जनरेशन, कस्टमाइज़ेशन और आउटपुट करता है। सभी मेथड (`generate` / `multiGenerate` को छोड़कर) मेथड चेनिंग सपोर्ट करते हैं।

### generate

```ts
generate<T extends z.ZodType>(schema: T): z.infer<T>
```

स्कीमा से एक मॉक डेटा जनरेट करता है। रिटर्न वैल्यू का टाइप स्कीमा के `z.infer<T>` के आधार पर इन्फर होता है।

```ts
const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = generator.generate(schema)
// टाइप: { id: string; name: string; email: string }
```

::: info Branded टाइप
`z.string().brand<'UserId'>()` जैसे Branded टाइप भी सही ढंग से इन्फर होते हैं। जनरेट होने वाली वैल्यू आंतरिक स्कीमा (इस मामले में `string`) के अनुसार होती है, लेकिन TypeScript पर टाइप में ब्रांड शामिल होता है।

```ts
const BrandedUserId = z.string().brand<'UserId'>()
const val = generator.generate(BrandedUserId)
// val का टाइप string & { __brand: 'UserId' } है
```
:::

### multiGenerate

```ts
multiGenerate<T extends Record<string, z.ZodType>>(
  schemas: T
): { [K in keyof T]: z.infer<T[K]> }
```

कई स्कीमा से एक साथ मॉक डेटा जनरेट करता है। कुंजी नाम सीधे परिणाम की कुंजी बनते हैं।

```ts
const mocks = generator.multiGenerate({
  user: z.object({ id: z.uuid(), name: z.string() }),
  post: z.object({ id: z.number().int(), title: z.string() }),
})

console.log(mocks.user) // { id: "...", name: "..." }
console.log(mocks.post) // { id: 123, title: "..." }
```

### supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

विशिष्ट Zod टाइप को फिक्स्ड वैल्यू सेट करता है। एक ही टाइप को कई बार सेट करने पर, पहले सेट की गई वैल्यू प्राथमिक होती है।

```ts
generator
  .supply(z.ZodString, 'テスト文字列')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

### override

```ts
override(customGenerator: CustomGeneratorType): MockGenerator
```

कस्टम जेनरेटर फंक्शन रजिस्टर करता है। फंक्शन `undefined` लौटाने पर, डिफ़ॉल्ट जनरेशन लॉजिक में फॉलबैक होता है।

```ts
const customGen: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodString) {
    return options.faker.person.fullName()
  }
}

generator.override(customGen).generate(schema)
```

### register

```ts
register(schemas: z.ZodType[]): MockGenerator
```

सुसंगत डेटा जनरेशन के लिए स्कीमा रजिस्टर करता है। `consistentKey` के साथ संयोजन में, समान मेटाडेटा कुंजी वाले फ़ील्ड को एक ही वैल्यू असाइन करता है।

```ts
const UserId = z.uuid().meta({ name: 'UserId' })

generator
  .register([UserId])
  .generate(z.object({ userId: UserId }))
```

`register` आंतरिक रूप से प्रत्येक स्कीमा की वैल्यू को `config.array.max` की संख्या में प्री-जनरेट करके valueStore में सेव करता है। जनरेशन के समय समान मेटाडेटा कुंजी का स्कीमा मिलने पर, सेव की गई वैल्यू से ऐरे इंडेक्स के अनुसार वैल्यू निकाली जाती है।

### updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

सेटिंग्स अपडेट करता है। मौजूदा `supply` / `override` सेटिंग्स बरकरार रहती हैं।

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```

### output

```ts
output(data: unknown, options?: OutputOptions): string
```

मॉक डेटा को फ़ाइल में आउटपुट करता है। केवल Node.js एनवायरनमेंट में काम करता है। आउटपुट पथ स्ट्रिंग के रूप में लौटाता है।

```ts
const data = generator.generate(schema)

// TypeScript फ़ाइल के रूप में आउटपुट (डिफ़ॉल्ट)
generator.output(data)
// => "./__generated__/generated-mock-data.ts"

// पथ और एक्सटेंशन निर्दिष्ट करें
generator.output(data, { path: './mocks/user.json' })
generator.output(data, { path: './mocks/user.ts' })
generator.output(data, { path: './mocks/user.js' })
```

#### OutputOptions

```ts
type OutputOptions = {
  path?: string    // आउटपुट पथ (डिफ़ॉल्ट: ./__generated__/generated-mock-data.ts)
  ext?: 'json' | 'js' | 'ts'  // एक्सटेंशन (path से अनुमानित, निर्दिष्ट न होने पर 'ts')
}
```

#### आउटपुट फॉर्मेट

| एक्सटेंशन | फॉर्मेट | विशेष टाइप का हैंडलिंग |
|--------|------|-------------|
| `.ts` / `.js` | `export const mockData = ...` | Date, BigInt, Map, Set, Symbol, File, Blob को सटीक रूप से सीरियलाइज़ करता है |
| `.json` | JSON | Date ISO स्ट्रिंग के रूप में, BigInt स्ट्रिंग में, Map/Set/Symbol में जानकारी का नुकसान (चेतावनी सहित) |

::: warning JSON आउटपुट में डेटा लॉस
JSON में प्रस्तुत न किए जा सकने वाले टाइप (BigInt, Symbol, Map, Set, File, Blob) वाले डेटा को `.json` में आउटपुट करने पर, डेटा की सटीकता खो जाती है। चेतावनी संदेश आउटपुट होता है, इसलिए `.ts` या `.js` फॉर्मेट के उपयोग पर विचार करें।
:::

## टाइप परिभाषाएँ

### MockConfig

```ts
interface MockConfig {
  /** @default [en, base] */
  locale?: LocaleType | LocaleType[]
  /** @default generateMersenne53Randomizer() from faker.js */
  randomizer?: Randomizer
  /** @default 1 */
  seed: number
  /** @default { min: 1, max: 3 } */
  array: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  map: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  set: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  record: { min: number; max: number }
  /** @default 0.5 */
  optionalProbability: number
  /** @default 0.5 */
  nullableProbability: number
  /** @default 0.5 */
  defaultProbability: number
  /** @default 5 @deprecated recursiveDepthLimit का उपयोग करें */
  lazyDepthLimit: number
  /** @default 5 */
  recursiveDepthLimit?: number
  /** मेटाडेटा का कुंजी नाम (register के साथ संयोजन में) */
  consistentKey?: string
}
```

प्रत्येक सेटिंग का विवरण [कॉन्फ़िगरेशन गाइड](/hi/guide/configuration) में देखें।

### CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

`undefined` लौटाने पर, डिफ़ॉल्ट जनरेशन लॉजिक का उपयोग होता है।

### GeneraterOptions

```ts
type GeneraterOptions = {
  faker: Faker                          // seeded faker इंस्टेंस
  config: MockConfig                    // वर्तमान सेटिंग्स
  customGenerator?: CustomGeneratorType // कस्टम जेनरेटर
  registry: z.core.$ZodRegistry | null  // स्कीमा रजिस्ट्री
  valueStore?: Map<string, unknown[]>   // register द्वारा प्री-जनरेट की गई वैल्यू
  arrayIndexes: number[]                // ऐरे का वर्तमान इंडेक्स
  pinnedHierarchy: Map<string, number>  // सुसंगतता जनरेशन का हायरार्की
  circularRefs: Map<z.core.$ZodType, number> // सर्कुलर रेफरेंस की गहराई ट्रैकिंग
}
```

`override` के कस्टम जेनरेटर में मुख्य रूप से `faker` और `config` का उपयोग होता है।

### OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
}
```

## एक्सपोर्ट सूची

```ts
import {
  initGenerator,        // फैक्ट्री फंक्शन
  type MockGenerator,   // जेनरेटर क्लास का टाइप
  type MockConfig,      // सेटिंग्स का टाइप
  type CustomGeneratorType,  // कस्टम जेनरेटर का टाइप
  type GeneraterOptions,     // जनरेशन ऑप्शन का टाइप
  type OutputOptions,        // आउटपुट ऑप्शन का टाइप
  type LocaleType,           // लोकेल टाइप
  type Faker,                // faker.js का Faker टाइप (re-export)
  type Randomizer,           // faker.js का Randomizer टाइप (re-export)
} from 'zod-v4-mocks'
```
