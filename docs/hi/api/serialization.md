# सीरियलाइज़ेशन और आउटपुट

ऐसे मेथड जो जनरेट किए गए डेटा को एक स्ट्रिंग, एक बाइनरी बफ़र, या एक फ़ाइल में बदलते हैं —
और उनके मिलते-जुलते deserializers। इनमें से कोई भी चेन करने योग्य नहीं है।

## मेथड चुनना

| मेथड | आउटपुट | रनटाइम | सुरक्षित रखता है | बिना हानि राउंड-ट्रिप |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` सोर्स स्ट्रिंग | कोई भी (केवल स्ट्रिंग) | ts/js में Date, BigInt, Map, Set, Symbol, File, Blob | ❌ (सोर्स टेक्स्ट, JSON टाइप खो देता है) |
| `serializeBinary` | `Uint8Array` (`greft-codec`) | **कोई भी** (Node ↔ ब्राउज़र ↔ अन्य भाषाएँ) | Date, Map, Set, RegExp, BigInt, TypedArray, Symbol, `undefined`, `NaN`/`Infinity`, सर्कुलर/साझा रेफ़रेंस | ✅ |
| `serializePortable` | पोर्टेबल स्ट्रिंग (seroval) | **कोई भी** (Node ↔ ब्राउज़र) | उपरोक्त **+** URL/URLSearchParams/Headers | ✅ |
| `output` | डिस्क पर फ़ाइल | **केवल Node** | एक्सटेंशन पर निर्भर (नीचे देखें) | ✅ `binary: true` के साथ |

अंगूठे का नियम: मानव-पठनीय fixtures के लिए **`serialize`**, किसी भी JS रनटाइम में (या
[greft-codec](https://github.com/Gityosan/greft) पोर्ट के ज़रिए Python / Rust / Go में भी)
डिकोड होने वाले कॉम्पैक्ट बिना-हानि ब्लॉब के लिए **`serializeBinary`** (टेक्स्ट-सुरक्षित
स्ट्रिंग के लिए `{ base64: true }`), और `URL`/`Headers` सहित JS↔JS राउंड-ट्रिप करने वाले
प्लेन-टेक्स्ट के लिए **`serializePortable`**।

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
serializeBinary(data: unknown): Uint8Array
serializeBinary(data: unknown, options: { base64: true }): string
```

[greft-codec](https://github.com/Gityosan/greft) के भाषा-अज्ञेय बिना-हानि फ़ॉर्मैट का उपयोग करके डेटा को बाइनरी `Uint8Array` में सीरियलाइज़ करता है। `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `Symbol`, `undefined`, `NaN`/`Infinity` और सर्कुलर/साझा रेफ़रेंस को बिना किसी जानकारी हानि के सुरक्षित रखता है। परिणाम **किसी भी JS रनटाइम** में राउंड-ट्रिप करता है और greft-codec पोर्ट के ज़रिए अन्य भाषाओं (Python / Rust / Go आदि) में भी डिकोड किया जा सकता है — मॉक डेटा को क्रॉस-लैंग्वेज टेस्ट fixture के रूप में पुनः उपयोग करने के लिए आदर्श।

`{ base64: true }` पास करने पर कच्चे बाइट्स के बजाय एक टेक्स्ट-सुरक्षित **स्ट्रिंग** लौटती है। यह स्ट्रिंग शुद्ध डेटा है (कोई `node:fs` निर्भरता नहीं), इसलिए इसे सीधे JSON, env var, या बाइनरी न स्वीकारने वाले किसी भी ट्रांसपोर्ट में एम्बेड किया जा सकता है, और यह क्रॉस-लैंग्वेज बनी रहती है (कोई भी greft पोर्ट base64 डिकोड करके `decode` कर सकता है)।

```ts
const data = generator.generate(schema)
const bytes = generator.serializeBinary(data) // Uint8Array

// क्रॉस-लैंग्वेज + node-मुक्त: base64 स्ट्रिंग को कहीं भी एम्बेड करें (जैसे JSON)
const fixture = JSON.stringify({ $mock: generator.serializeBinary(data, { base64: true }) })
```

## deserialize

```ts
deserialize<T = unknown>(input: Uint8Array | string): T
deserialize<T = unknown>(input: string, options: { base64: true }): T
```

`serializeBinary` या `output({ binary: true })` से पहले सीरियलाइज़ किए गए मान को पुनर्स्थापित करता है। `Uint8Array`/`Buffer` या `.bin` फ़ाइल का पथ पास करें। `{ base64: true }` पास करने पर `serializeBinary(data, { base64: true })` से मिली base64 स्ट्रिंग को डिकोड करता है (तब स्ट्रिंग को फ़ाइल पथ नहीं, डेटा माना जाता है)। परिणाम को टाइप करने के लिए एक जेनेरिक टाइप पैरामीटर पास करें।

```ts
// जेनेरिक पैरामीटर के ज़रिए परिणाम को टाइप करें
const restored = generator.deserialize<User>('./mocks/user.bin')

// बाइट्स से
const restored = generator.deserialize<User>(generator.serializeBinary(data))

// JSON से निकाली गई base64 स्ट्रिंग से (किसी भी JS रनटाइम में)
const { $mock } = JSON.parse(fixture)
const restored = generator.deserialize<User>($mock, { base64: true })
```

## serializePortable / serializePortableAsync

[▶ Playground में आज़माएँ](/hi/playground/?example=portable)

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

[seroval](https://github.com/lxsmnsyc/seroval) के ज़रिए डेटा को एक **पोर्टेबल स्ट्रिंग** में सीरियलाइज़ करता है। `serializeBinary` की तरह परिणाम **किसी भी JS रनटाइम** के बीच राउंड-ट्रिप करता है — Node↔ब्राउज़र और ब्राउज़र↔ब्राउज़र, पर यह बाइनरी नहीं बल्कि (केवल JS वाला) प्लेन टेक्स्ट है, इसलिए तब उपयोगी है जब payload को `URL`/`URLSearchParams`/`Headers` सहित JSON, env var या HTTP हेडर में रखना हो। यह `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `TypedArray`, `undefined`, `NaN`/`Infinity`, सर्कुलर/साझा रेफ़रेंस, और (बंडल किए गए प्लगइन्स के ज़रिए) `URL`, `URLSearchParams`, `Headers` को सुरक्षित रखता है। (क्रॉस-**लैंग्वेज** या JS eval के बिना टेक्स्ट-सुरक्षित payload के लिए `serializeBinary` को प्राथमिकता दें — ज़रूरत हो तो `{ base64: true }` के साथ।)

`File`, `Blob`, और `FormData` अपने बाइट्स को एसिंक्रोनस रूप से पढ़ते हैं, इसलिए वे केवल `serializePortableAsync` के ज़रिए राउंड-ट्रिप करते हैं (सिंक्रोनस संस्करण इनसे मिलने पर एक स्पष्ट एरर फेंकता है जो एसिंक्रोनस संस्करण की ओर इशारा करता है)।

`Symbol` **समर्थित है**: रजिस्ट्री सिंबल (`Symbol.for`) पहचान बरकरार रखते हुए राउंड-ट्रिप करते हैं, और वर्णन वाले सिंबल (`Symbol('x')`, जैसे `z.symbol()`) वर्णन के आधार पर राउंड-ट्रिप करते हैं — **एक ही पेलोड के भीतर** रेफ़रेंस के बीच पहचान भी बनी रहती है। दो अंतर्निहित सीमाएँ हैं: किसी अनाम सिंबल की **क्रॉस-रनटाइम `===` पहचान** पुनर्प्राप्त नहीं की जा सकती (वह परिभाषा से अद्वितीय है), और ऑब्जेक्ट प्रॉपर्टी **कुंजी** के रूप में उपयोग किए गए सिंबल सुरक्षित नहीं रहते (केवल मान, Map कुंजी और Set सदस्य के रूप में)। कार्यान्वयन संबंधी सावधानी: सिंबल एक आंतरिक मार्कर कुंजी के तहत एन्कोड किए जाते हैं, इसलिए एक हाथ से बनाया गया plain object जिसकी **एकमात्र** कुंजी वही मार्कर (`$$zod-v4-mocks/symbol$$`) है, डिसीरियलाइज़ होने पर `Symbol` बन जाता है। जनरेट किए गए मॉक कभी ऐसी कुंजी नहीं बनाते, इसलिए यह केवल हाथ से बनाए गए समान-आकार डेटा को प्रभावित करता है।

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
// <name>.bin (greft-codec से एनकोडेड) लिखता है। रैपर इम्पोर्ट के समय उस .bin को
// आलस्यपूर्वक `decode` करता है, इसलिए मॉड्यूल सामान्य `import { mockData }` जैसा ही व्यवहार
// करता है, पर Date / Map / Set / RegExp / BigInt / TypedArray / Symbol / undefined /
// NaN/Infinity / सर्कुलर रेफ़रेंस को बिना हानि के सुरक्षित रखता है। यह .bin क्रॉस-लैंग्वेज
// आर्टिफ़ैक्ट है (किसी भी JS रनटाइम, या greft-codec पोर्ट के ज़रिए Python / Rust / Go में डिकोड)।
// रैपर `zod-v4-mocks/greft` से `decode` इम्पोर्ट करता है, इसलिए उपभोक्ता को केवल zod-v4-mocks
// चाहिए, सीधे greft-codec नहीं। एक्सपोर्ट मान `unknown` टाइप का है; कास्ट करें या `deserialize<T>()` लें।
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
  portable?: boolean               // केवल outputAsync: ts/js में क्रॉस-रनटाइम एक्सप्रेशन इनलाइन; File/Blob/FormData व सर्कुलर समर्थित; Symbol नहीं; JSON में अनदेखा
}
```

### आउटपुट फॉर्मेट

| एक्सटेंशन | फॉर्मेट | विशेष टाइप का हैंडलिंग |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Date, BigInt, Map, Set, Symbol, File, Blob को सटीक रूप से सीरियलाइज़ करता है |
| `.ts` / `.js` + `binary: true` | ESM रैपर + साथ में `.bin` (greft-codec) | Date, Map, Set, RegExp, BigInt, TypedArray, Symbol, `undefined`, `NaN`/`Infinity`, सर्कुलर/साझा रेफ़रेंस को सुरक्षित रखता है। यह `.bin` क्रॉस-लैंग्वेज है (किसी भी JS रनटाइम, या greft-codec पोर्ट के ज़रिए Python / Rust / Go में डिकोड)। रैपर `zod-v4-mocks/greft` से `decode` इम्पोर्ट करता है, इसलिए उपभोक्ता को केवल `zod-v4-mocks` चाहिए (सीधे greft-codec नहीं)। मान `unknown` के रूप में एक्सपोर्ट; कास्ट करें या `deserialize<T>()` लें। |
| `.ts` / `.js` + `portable: true` (**`outputAsync`**) | इनलाइन `export const <name> = <seroval एक्सप्रेशन>` | क्रॉस-रनटाइम (Node↔ब्राउज़र), कोई sibling फ़ाइल नहीं और consumer पर कोई निर्भरता नहीं। File/Blob/FormData की **सामग्री**, Date, Map, Set, BigInt, TypedArray, सर्कुलर/साझा रेफ़रेंस सुरक्षित। **`Symbol` नहीं।** |
| `.json` | JSON | Date ISO स्ट्रिंग के रूप में, BigInt स्ट्रिंग में, Map/Set/Symbol में जानकारी का नुकसान (चेतावनी सहित)। `binary` अनदेखा किया जाता है। |

::: warning JSON आउटपुट में डेटा लॉस
JSON में प्रस्तुत न किए जा सकने वाले टाइप (BigInt, Symbol, Map, Set, File, Blob) वाले डेटा को `.json` में आउटपुट करने पर, डेटा की सटीकता खो जाती है। चेतावनी संदेश आउटपुट होता है, इसलिए `.ts` या `.js` फॉर्मेट (वैकल्पिक रूप से `binary: true` के साथ) के उपयोग पर विचार करें।
:::

::: info `binary: true` (बिना हानि राउंड-ट्रिप)
`binary: true` के साथ, `output()` दो फ़ाइलें लिखता है:

- `<name>.bin` — एक [greft-codec](https://github.com/Gityosan/greft) बाइट स्ट्रीम, जिसे किसी भी JS रनटाइम (या पोर्ट के ज़रिए Python / Rust / Go) में डिकोड किया जा सकता है। Zod जो भी मान बना सकता है उन सभी को — `Symbol`, `NaN`/`Infinity` और सर्कुलर रेफ़रेंस सहित — पूर्ण रूप से सुरक्षित रखता है।
- `<name>.ts` / `<name>.js` — एक हल्का ESM रैपर जो इम्पोर्ट के समय साथ वाली `.bin` को आलस्यपूर्वक `decode` करता है, इसलिए उपभोक्ता केवल `import { mockData } from './user'` करते हैं और बाइनरी प्रतिनिधित्व से अनजान रहते हैं।

रैपर `zod-v4-mocks/greft` (greft-codec का री-एक्सपोर्ट) से `decode` इम्पोर्ट करता है, इसलिए उपभोक्ता को केवल `zod-v4-mocks` चाहिए (वही पैकेज जिससे फ़ाइल जनरेट की गई), ट्रांज़िटिव greft-codec निर्भरता सीधे नहीं। रैपर मान को `unknown` के रूप में एक्सपोर्ट करता है; उपभोक्ता पक्ष पर कास्ट करें, या रैपर के बिना टाइप किया हुआ मान चाहने पर सीधे `deserialize<T>('./user.bin')` कॉल करें। `.bin` फ़ाइल का नाम हमेशा रैपर के बेसनेम से प्राप्त होता है और अलग से कस्टमाइज़ नहीं किया जा सकता। रैपर ESM (`import.meta.dirname`) को लक्षित करता है और Node.js 20.11+ की आवश्यकता है।
:::

## outputAsync

```ts
outputAsync(data: unknown, options?: OutputOptions): Promise<string>
```

`output` का एसिंक्रोनस समकक्ष। `{ portable: true }` के लिए आवश्यक है, क्योंकि `File`/`Blob`/`FormData` के बाइट्स एसिंक्रोनस रूप से पढ़े जाते हैं। non-portable मोड (`json` / `ts` / `js` / `binary`) `output` जैसा ही व्यवहार करते हैं, बस एसिंक्रोनस fs से लिखते हैं। आउटपुट पथ लौटाता है।

`portable: true` (ts/js) के साथ यह एक स्व-निहित, क्रॉस-रनटाइम एक्सप्रेशन इनलाइन करता है — `export const <name> = <seroval एक्सप्रेशन>` — जिसे किसी भी JS रनटाइम (Node↔ब्राउज़र) में सामान्य `import` से पुनर्स्थापित किया जा सकता है। `binary` (जो एक sibling `.bin` लिखता है) के विपरीत, **कोई sibling फ़ाइल नहीं**, और `File`/`Blob`/`FormData` अपनी **सामग्री सहित** राउंड-ट्रिप करते हैं, साथ ही Date, Map, Set, BigInt, TypedArray और सर्कुलर/साझा रेफ़रेंस भी।

```ts
const data = generator.generate(schema)

// क्रॉस-रनटाइम, बिना हानि वाला fixture (File/Blob सामग्री सहित)
const path = await generator.outputAsync(data, {
  path: './mocks/user.ts',
  portable: true,
})
// कहीं भी उपयोग करें: import { mockData } from './mocks/user'
```

::: warning portable आउटपुट में Symbol समर्थित नहीं
सामान्य `import` में unbox चरण नहीं होता, इसलिए `portable: true` **`Symbol` मानों को अस्वीकार करता है** (वे plain object के रूप में डिसीरियलाइज़ होंगे)। Symbol वाले डेटा के लिए `portable` के बिना `ext: 'ts'`/`'js'` (जो `Symbol(...)` लिटरल देता है), या `serializePortable` / `deserializePortable` स्ट्रिंग जोड़ी का उपयोग करें। सिंक्रोनस `output()` को `portable` पास करने पर त्रुटि होती है — `outputAsync` का उपयोग करें।
:::
