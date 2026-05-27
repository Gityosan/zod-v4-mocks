# API संदर्भ

`zod-v4-mocks` एक ही फैक्ट्री, `initGenerator`, एक्सपोज़ करता है, जो एक
`MockGenerator` लौटाती है। बाकी हर क्षमता — जनरेशन, कस्टमाइज़ेशन,
सीरियलाइज़ेशन और फ़ाइल आउटपुट — उस इंस्टेंस पर एक मेथड है।

यह संदर्भ केंद्रित पेजों में बंटा है:

- **[जेनरेशन](/hi/api/generation)** — `generate`, `multiGenerate`, `generateMany`, `factory`
- **[कस्टमाइज़ेशन](/hi/api/customization)** — `supply`, `supplyRef`, `supplyPath`, `override`, `register`, `updateConfig`
- **[सीरियलाइज़ेशन और आउटपुट](/hi/api/serialization)** — `serialize`, `serializeBinary`, `deserialize`, `serializePortable`, `deserializePortable`, `output`
- **[टाइप](/hi/api/types)** — `MockConfig`, `CustomGeneratorType`, `GeneraterOptions`, `OutputOptions`, `PortableOptions`, `PathSegment`, और re-exports

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

हर ऑप्शन के लिए [`MockConfig`](/hi/api/types#mockconfig) देखें, या विवरण के लिए
[कॉन्फ़िगरेशन गाइड](/hi/guide/configuration) देखें।

## MockGenerator

`initGenerator()` द्वारा लौटाया गया क्लास इंस्टेंस है। यह मॉक डेटा की
जनरेशन, कस्टमाइज़ेशन और आउटपुट को संभालता है।

### मेथड चेनिंग

कस्टमाइज़ेशन और कॉन्फ़िगरेशन मेथड वही इंस्टेंस लौटाते हैं, इसलिए उन्हें
चेन किया जा सकता है। टर्मिनल मेथड — जो डेटा या स्ट्रिंग उत्पन्न करते हैं — नहीं करते।

| मेथड | लौटाता है | चेन करने योग्य |
|--------|---------|-----------|
| `supply` / `supplyRef` / `supplyPath` | `MockGenerator` | ✅ |
| `override` | `MockGenerator` | ✅ |
| `register` | `MockGenerator` | ✅ |
| `updateConfig` | `MockGenerator` | ✅ |
| `generate` / `multiGenerate` / `generateMany` | data | ❌ |
| `factory` | `{ next, take }` | ❌ |
| `serialize` / `serializeBinary` / `serializePortable*` | `string` / `Buffer` | ❌ |
| `deserialize` / `deserializePortable` | data | ❌ |
| `output` | आउटपुट पथ `string` | ❌ |

```ts
const data = initGenerator({ seed: 42 })
  .supply(z.ZodString, 'fixed')
  .override(customGen)
  .generate(schema)
```

## एक्सपोर्ट सूची

```ts
import {
  initGenerator,             // फैक्ट्री फंक्शन
  ITEM_MARKER,               // '$item' — array/set/tuple एलिमेंट्स के लिए supplyPath मार्कर
  VALUE_MARKER,              // '$value' — record/map वैल्यूज़ के लिए supplyPath मार्कर
  type MockGenerator,        // जेनरेटर क्लास का टाइप
  type MockConfig,           // कॉन्फ़िगरेशन टाइप
  type CustomGeneratorType,  // कस्टम जेनरेटर टाइप
  type GeneraterOptions,     // जनरेशन ऑप्शन टाइप
  type OutputOptions,        // आउटपुट ऑप्शन टाइप
  type PortableOptions,      // पोर्टेबल सीरियलाइज़ेशन ऑप्शन टाइप
  type PathSegment,          // supplyPath सेगमेंट टाइप
  type LocaleType,           // लोकेल टाइप
  type Faker,                // faker.js का Faker टाइप (re-export)
  type Randomizer,           // faker.js का Randomizer टाइप (re-export)
} from 'zod-v4-mocks'
```
