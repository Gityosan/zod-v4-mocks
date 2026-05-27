# टाइप

एक्सपोर्ट की गई टाइप परिभाषाएँ। अधिकांश को `import type { … } from 'zod-v4-mocks'` के रूप में इम्पोर्ट किया जाता है।

## MockConfig

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
  /** @default 5 @deprecated इसके बजाय recursiveDepthLimit का उपयोग करें */
  lazyDepthLimit: number
  /** @default 5 — रिकर्सिव स्कीमा के लिए अधिकतम गहराई (z.lazy / circular getters) */
  recursiveDepthLimit?: number
  /** मेटाडेटा का कुंजी नाम (register के साथ संयोजन में) */
  consistentKey?: string
  /** @default 'mock' — z.custom()/z.instanceof() पर कस्टम मॉक जेनरेटर के लिए meta key */
  customMockKey?: string
  /** @default 'off' — property keys को faker फंक्शन से मैप करें: 'off' | 'auto' | KeyMapper */
  keyMapping?: 'off' | 'auto' | KeyMapper
  /** @default true — एक प्री-फ्लाइट स्कीमा वॉक चलाता है जो मॉक न किए जा सकने वाले स्कीमा को अस्वीकार करता है */
  preflightCheck?: boolean
}
```

प्रत्येक सेटिंग के विवरण के लिए [कॉन्फ़िगरेशन गाइड](/hi/guide/configuration) देखें।

::: info preflightCheck
`preflightCheck` सक्षम होने पर (डिफ़ॉल्ट), `generate` जनरेट करने से पहले स्कीमा को
एक बार वॉक करता है और उन स्कीमा पर एरर फेंकता है जिन्हें वह सुरक्षित रूप से मॉक नहीं कर सकता — उदाहरण के लिए
किसी फिक्स्ड-लंबाई tuple स्थिति पर एक बिना-मॉक किया गया `z.custom()`। चेतावनी-स्तर की समस्याएँ
लॉग की जाती हैं और स्वतः ठीक की जाती हैं। इसे `initGenerator({ preflightCheck: false })` से अक्षम करें।
:::

## CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

`undefined` लौटाने पर, डिफ़ॉल्ट जनरेशन लॉजिक का उपयोग होता है। [`override`](/hi/api/customization#override) को पास किया जाता है।

## GeneraterOptions

```ts
type GeneraterOptions = {
  faker: Faker                          // seeded faker इंस्टेंस
  config: MockConfig                    // वर्तमान कॉन्फ़िगरेशन
  customGenerator?: CustomGeneratorType // कस्टम जेनरेटर
  registry: z.core.$ZodRegistry | null  // स्कीमा रजिस्ट्री
  valueStore?: Map<string, unknown[]>   // register द्वारा प्री-जनरेट की गई वैल्यू
  arrayIndexes: number[]                // वर्तमान array इंडेक्स
  pinnedHierarchy: Map<string, number>  // सुसंगत जनरेशन के लिए हायरार्की
  circularRefs: Map<z.core.$ZodType, number> // सर्कुलर रेफ़रेंस की गहराई ट्रैकिंग
  pathSupplies: PathSupply[]            // इस बिंदु पर स्कोप में मौजूद supplyPath एंट्रीज़
  keyMappingKey?: string                // यहाँ keyMapping के योग्य property नाम
  supplyRefTargets: Set<z.core.$ZodType> // supplyRef के ज़रिए रजिस्टर किए गए स्कीमा refs
  hasOpaqueCustomizer: boolean          // supply/override रजिस्टर होते ही true हो जाता है
  preflightFixes: Map<z.core.$ZodType, z.core.$ZodType> // preflight से स्वतः ठीक की गई चीज़ें
}
```

`override` के कस्टम जेनरेटर में मुख्य रूप से `faker` और `config` का उपयोग होता है; बाकी आंतरिक जनरेशन state है।

## OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
  exportName?: string
  header?: string
  footer?: string
  binary?: boolean
}
```

[`serialize`](/hi/api/serialization#serialize) और [`output`](/hi/api/serialization#output) द्वारा उपयोग किया जाता है। फ़ील्ड-दर-फ़ील्ड नोट्स [सीरियलाइज़ेशन और आउटपुट](/hi/api/serialization#outputoptions) पेज पर हैं।

## PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // स्ट्रिंग को base64 एन्कोड करें (टेक्स्ट-सेफ़)
}
```

[`serializePortable`](/hi/api/serialization#serializeportable-serializeportableasync) और [`deserializePortable`](/hi/api/serialization#deserializeportable) द्वारा उपयोग किया जाता है। दोनों पक्षों को वही फ़्लैग पास करें।

## PathSegment

```ts
type PathSegment = string | number | symbol
```

[`supplyPath`](/hi/api/customization#supplypath) path में एक एकल चरण। Object
keys स्ट्रिंग होती हैं, array/tuple स्थितियाँ number होती हैं, और दो मार्कर
कॉन्स्टेंट किसी स्थान के सभी एलिमेंट्स को लक्षित करते हैं:

```ts
import { ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

ITEM_MARKER  // '$item'  — array / set / tuple का हर एलिमेंट
VALUE_MARKER // '$value' — record / map की हर वैल्यू
```

## Re-exports

```ts
type LocaleType   // keyof typeof allLocales — मान्य faker locale keys
type Faker        // faker.js का Faker टाइप (re-export)
type Randomizer   // faker.js का Randomizer टाइप (re-export)
```
