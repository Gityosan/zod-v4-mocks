# सीरियलाइज़ेशन और आउटपुट

ऐसे मेथड जो जनरेट किए गए डेटा को एक स्ट्रिंग, एक बाइनरी बफ़र, या एक फ़ाइल में बदलते हैं —
और उनके मिलते-जुलते deserializers। इनमें से कोई भी चेन करने योग्य नहीं है।

## मेथड चुनना

| मेथड | आउटपुट | रनटाइम | सुरक्षित रखता है | बिना हानि राउंड-ट्रिप |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` सोर्स स्ट्रिंग | कोई भी (केवल स्ट्रिंग) | ts/js में Date, BigInt, Map, Set, Symbol, File, Blob | ❌ (सोर्स टेक्स्ट, JSON टाइप खो देता है) |
| `serializeBinary` | `Buffer` (`v8.serialize`) | **केवल Node** | Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, सर्कुलर रेफ़रेंस | ✅ |
| `serializePortable` | पोर्टेबल स्ट्रिंग (seroval) | **कोई भी** (Node ↔ ब्राउज़र) | उपरोक्त **+** `NaN`/`Infinity`, साझा रेफ़रेंस, `Symbol`, URL/URLSearchParams/Headers | ✅ |
| `output` | डिस्क पर फ़ाइल | **केवल Node** | एक्सटेंशन पर निर्भर (नीचे देखें) | ✅ `binary: true` के साथ |

अंगूठे का नियम: मानव-पठनीय fixtures के लिए **`serialize`**, बिना हानि केवल-Node ब्लॉब के लिए
**`serializeBinary`**, और जब डेटा को रनटाइम के बीच पार करना हो (जैसे Node में जनरेट किया गया,
ब्राउज़र में hydrate किया गया) तब **`serializePortable`**।

## serialize

```ts
serialize(data: unknown, options?: OutputOptions): string
```

मॉक डेटा को फ़ाइल में लिखे बिना स्ट्रिंग के रूप में सीरियलाइज़ करता है। `output` जो कंटेंट लिखता है वही स्ट्रिंग लौटाता है। जब आपको आउटपुट को और कस्टमाइज़ करके खुद फ़ाइल में लिखना हो तो यह उपयोगी है।

```ts
const data = generator.generate(schema)

// सीरियलाइज़ की गई स्ट्रिंग प्राप्त करें (डिफ़ॉल्ट: TypeScript फॉर्मेट)
const content = generator.serialize(data)
// => "export const mockData = {\n  \"id\": \"...\",\n  ...\n};\n"

// कस्टम एक्सपोर्ट नाम और हेडर/फुटर
const content = generator.serialize(data, {
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

## serializeBinary

```ts
serializeBinary(data: unknown): Buffer
```

Node.js के स्ट्रक्चर्ड क्लोन एल्गोरिथ्म (`v8.serialize`) का उपयोग करके डेटा को बाइनरी `Buffer` में सीरियलाइज़ करता है। `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `undefined` और सर्कुलर रेफ़रेंस को बिना किसी जानकारी हानि के सुरक्षित रखता है। परिणाम केवल Node.js एनवायरनमेंट में `deserialize` (या `v8.deserialize`) के ज़रिए पढ़ा जा सकता है।

```ts
const data = generator.generate(schema)
const buf = generator.serializeBinary(data) // Buffer
```

## deserialize

```ts
deserialize<T = unknown>(input: Buffer | Uint8Array | string): T
```

`serializeBinary` या `output({ binary: true })` से पहले सीरियलाइज़ किए गए मान को पुनर्स्थापित करता है। `Buffer`/`Uint8Array` या `.bin` फ़ाइल का पथ पास करें। परिणाम को टाइप करने के लिए एक जेनेरिक टाइप पैरामीटर पास करें।

```ts
// जेनेरिक पैरामीटर के ज़रिए परिणाम को टाइप करें
const restored = generator.deserialize<User>('./mocks/user.bin')

// Buffer से
const restored = generator.deserialize<User>(generator.serializeBinary(data))
```

## serializePortable / serializePortableAsync

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

[seroval](https://github.com/lxsmnsyc/seroval) के ज़रिए डेटा को एक **पोर्टेबल स्ट्रिंग** में सीरियलाइज़ करता है। `serializeBinary` (केवल Node का `v8`) के विपरीत, परिणाम **किसी भी JS रनटाइम** के बीच राउंड-ट्रिप करता है — Node↔ब्राउज़र और ब्राउज़र↔ब्राउज़र। यह `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `TypedArray`, `undefined`, `NaN`/`Infinity`, सर्कुलर/साझा रेफ़रेंस, और (बंडल किए गए प्लगइन्स के ज़रिए) `URL`, `URLSearchParams`, `Headers` को सुरक्षित रखता है।

`File`, `Blob`, और `FormData` अपने बाइट्स को एसिंक्रोनस रूप से पढ़ते हैं, इसलिए वे केवल `serializePortableAsync` के ज़रिए राउंड-ट्रिप करते हैं (सिंक्रोनस संस्करण इनसे मिलने पर एक स्पष्ट एरर फेंकता है जो एसिंक्रोनस संस्करण की ओर इशारा करता है)।

`Symbol` **समर्थित है**: रजिस्ट्री सिंबल (`Symbol.for`) पहचान बरकरार रखते हुए राउंड-ट्रिप करते हैं, और वर्णन वाले सिंबल (`Symbol('x')`, जैसे `z.symbol()`) वर्णन के आधार पर राउंड-ट्रिप करते हैं — **एक ही पेलोड के भीतर** रेफ़रेंस के बीच पहचान भी बनी रहती है। दो अंतर्निहित सीमाएँ हैं: किसी अनाम सिंबल की **क्रॉस-रनटाइम `===` पहचान** पुनर्प्राप्त नहीं की जा सकती (वह परिभाषा से अद्वितीय है), और ऑब्जेक्ट प्रॉपर्टी **कुंजी** के रूप में उपयोग किए गए सिंबल सुरक्षित नहीं रहते (केवल मान, Map कुंजी और Set सदस्य के रूप में)।

```ts
const data = generator.generate(schema)

// क्रॉस-रनटाइम स्ट्रिंग
const str = generator.serializePortable(data)

// JSON फ़ील्ड / एनवायरनमेंट वेरिएबल / हेडर में एम्बेड करने के लिए base64
const b64 = generator.serializePortable(data, { base64: true })

// एसिंक्रोनस — जब डेटा में File / Blob / FormData हो तब आवश्यक
const asyncStr = await generator.serializePortableAsync(data)
```

## deserializePortable

```ts
deserializePortable<T = unknown>(input: string, options?: PortableOptions): T
```

`serializePortable` / `serializePortableAsync` द्वारा बनाए गए मान को किसी भी JS रनटाइम में पुनर्स्थापित करता है। यदि इसे base64 में एन्कोड किया गया था तो `{ base64: true }` पास करें, और परिणाम को टाइप करने के लिए एक जेनेरिक टाइप पैरामीटर पास करें।

```ts
const restored = generator.deserializePortable<User>(str)
const restoredFromB64 = generator.deserializePortable<User>(b64, { base64: true })
```

::: warning पुनर्स्थापना के समय मूल्यांकित होता है
`deserializePortable` सीरियलाइज़्ड स्ट्रिंग का मूल्यांकन करता है, इसलिए केवल वही डेटा पुनर्स्थापित करें जो आपने स्वयं बनाया हो — कभी भी अविश्वसनीय इनपुट नहीं।
:::

### PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // स्ट्रिंग को base64 एन्कोड करें (टेक्स्ट-सेफ़); deserializePortable को भी वही फ़्लैग पास करें
}
```

## output

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

// `binary: true` — ts/js आउटपुट के लिए, एक हल्का ESM रैपर और साथ में एक
// <name>.bin (v8.serialize द्वारा बनाई गई) लिखता है। रैपर इम्पोर्ट के समय उस .bin को
// आलस्यपूर्वक डिसीरियलाइज़ करता है, इसलिए मॉड्यूल सामान्य `import { mockData }` जैसा ही
// व्यवहार करता है, पर Date / Map / Set / RegExp / BigInt / TypedArray / undefined /
// सर्कुलर रेफ़रेंस को बिना हानि के सुरक्षित रखता है। एक्सपोर्ट किया गया मान `unknown` टाइप का होता है;
// उपभोक्ता पक्ष पर कास्ट करें या टाइपिंग ज़रूरी होने पर सीधे `deserialize<T>()` का उपयोग करें।
generator.output(data, { path: './mocks/user.ts', binary: true })
generator.output(data, { path: './mocks/user.js', binary: true })

// कस्टम एक्सपोर्ट नाम और हेडर/फुटर
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### OutputOptions

```ts
type OutputOptions = {
  path?: string                    // आउटपुट पथ (डिफ़ॉल्ट: ./__generated__/generated-mock-data.<ext>)
  ext?: 'json' | 'js' | 'ts'       // एक्सटेंशन (path से अनुमानित, निर्दिष्ट न होने पर 'ts')
  exportName?: string              // कस्टम एक्सपोर्ट वेरिएबल नाम (डिफ़ॉल्ट: 'mockData', केवल ts/js)
  header?: string                  // आउटपुट कंटेंट के शुरू में जोड़ी जाने वाली स्ट्रिंग (JSON में अनदेखा)
  footer?: string                  // आउटपुट कंटेंट के अंत में जोड़ी जाने वाली स्ट्रिंग (JSON में अनदेखा)
  binary?: boolean                 // ts/js के लिए, एक <name>.bin और उसे डिसीरियलाइज़ करने वाला रैपर लिखता है; JSON में अनदेखा
}
```

### आउटपुट फॉर्मेट

| एक्सटेंशन | फॉर्मेट | विशेष टाइप का हैंडलिंग |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Date, BigInt, Map, Set, Symbol, File, Blob को सटीक रूप से सीरियलाइज़ करता है |
| `.ts` / `.js` + `binary: true` | ESM रैपर + साथ में `.bin` (v8 स्ट्रक्चर्ड क्लोन) | Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, सर्कुलर रेफ़रेंस को सुरक्षित रखता है। रैपर मान को `unknown` के रूप में एक्सपोर्ट करता है; उपभोक्ता पक्ष पर कास्ट करें या टाइपिंग के लिए `deserialize<T>()` का उपयोग करें। केवल Node.js। |
| `.json` | JSON | Date ISO स्ट्रिंग के रूप में, BigInt स्ट्रिंग में, Map/Set/Symbol में जानकारी का नुकसान (चेतावनी सहित)। `binary` अनदेखा किया जाता है। |

::: warning JSON आउटपुट में डेटा लॉस
JSON में प्रस्तुत न किए जा सकने वाले टाइप (BigInt, Symbol, Map, Set, File, Blob) वाले डेटा को `.json` में आउटपुट करने पर, डेटा की सटीकता खो जाती है। चेतावनी संदेश आउटपुट होता है, इसलिए `.ts` या `.js` फॉर्मेट (वैकल्पिक रूप से `binary: true` के साथ) के उपयोग पर विचार करें।
:::

::: info `binary: true` (बिना हानि राउंड-ट्रिप)
`binary: true` के साथ, `output()` दो फ़ाइलें लिखता है:

- `<name>.bin` — कच्चा `v8.serialize` Buffer। Zod जो भी मान बना सकता है उन सभी को, सर्कुलर रेफ़रेंस सहित, पूर्ण रूप से सुरक्षित रखता है।
- `<name>.ts` / `<name>.js` — एक हल्का ESM रैपर जो इम्पोर्ट के समय साथ वाली `.bin` को आलस्यपूर्वक `v8.deserialize` करता है, इसलिए उपभोक्ता केवल `import { mockData } from './user'` करते हैं और बाइनरी प्रतिनिधित्व से अनजान रहते हैं।

रैपर मान को `unknown` के रूप में एक्सपोर्ट करता है; उपभोक्ता पक्ष पर कास्ट करें, या रैपर के बिना टाइप किया हुआ मान चाहने पर सीधे `deserialize<T>('./user.bin')` कॉल करें। `.bin` फ़ाइल का नाम हमेशा रैपर के बेसनेम से प्राप्त होता है और अलग से कस्टमाइज़ नहीं किया जा सकता। रैपर ESM (`import.meta.dirname`) को लक्षित करता है और Node.js 20.11+ की आवश्यकता है।
:::
