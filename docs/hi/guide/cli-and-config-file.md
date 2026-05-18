# CLI और साझा कॉन्फ़िग फ़ाइल

`zod-v4-mocks` एक छोटा CLI प्रदान करता है ज़रिए जरूरत के समय मॉक बनाने के लिए, साथ ही एक साझा कॉन्फ़िग फ़ाइल मैकेनिज़्म जिसे CLI और रनटाइम कोड (टेस्ट, स्क्रिप्ट) दोनों एक ही तरह लोड करते हैं।

## CLI

`zod-v4-mocks` कमांड एक JS/ESM मॉड्यूल लोड करता है, एक Zod स्कीमा एक्सपोर्ट चुनता है, और मॉक डेटा को प्रिंट (या लिख) देता है।

```bash
# एक मॉक स्टैंडर्ड आउटपुट पर (pretty JSON)
npx zod-v4-mocks generate ./schemas.js User --pretty

# 50 मॉक एक फ़ाइल में
npx zod-v4-mocks generate ./schemas.js User --count 50 --output users.json

# seed और locale निर्दिष्ट करें
npx zod-v4-mocks generate ./schemas.js User --seed 42 --locale ja
```

TypeScript स्कीमा मॉड्यूल के लिए `tsx` से चलाएँ:

```bash
npx tsx node_modules/zod-v4-mocks/dist/cli.js generate ./schemas.ts User -c 10
```

### विकल्प

| फ़्लैग | विवरण |
|---|---|
| `-c, --count <n>` | आइटम्स की संख्या। `count > 1` से array; `count = 1` से एकल वैल्यू |
| `-s, --seed <n>` | रैंडम seed (डिफ़ॉल्ट `1`) |
| `-o, --output <path>` | फ़ाइल में लिखें। फ़ॉर्मेट एक्सटेंशन से अनुमानित |
| `-f, --format <fmt>` | आउटपुट फ़ॉर्मेट: `json` / `ts` / `js` / `bin`। एक्सटेंशन से ऊपर |
| `-l, --locale <loc>` | Faker locale (जैसे `ja`, `en`, `de`) |
| `--pretty` | स्टैंडर्ड आउटपुट पर JSON को सुंदर बनाएँ |
| `--silent` | प्रगति और सूचनात्मक संदेश छिपाएँ |
| `--config <path>` | स्पष्ट कॉन्फ़िग फ़ाइल पाथ। न देने पर ऑटो-खोज |
| `--profile <name>` | कॉन्फ़िग प्रोफ़ाइल: `base` / `cli` / `test` (डिफ़ॉल्ट `cli`) |

जब फ़ाइल में बड़ी मात्रा लिखी जा रही हो तब CLI प्रगति दिखाता है (स्टैंडर्ड आउटपुट पर नहीं — वहाँ यह आउटपुट स्ट्रीम भ्रष्ट करता है)।

## साझा कॉन्फ़िग फ़ाइल

`zod-v4-mocks.config.{ts,js,mjs}` फ़ाइल प्रोजेक्ट-स्तर का जेनरेटर सेटअप व्यक्त करती है और CLI **तथा** रनटाइम कोड दोनों इसका उपयोग करते हैं। लोडिंग [`c12`](https://github.com/unjs/c12) पर आधारित है, इसलिए TypeScript कॉन्फ़िग बिना अतिरिक्त टूल के काम करते हैं और फ़ाइल वर्किंग डायरेक्टरी से ऑटो-खोजी जाती है।

### तीन लेयर

`defineMockConfig` एक आवश्यक फैक्ट्री `baseConfig` और दो वैकल्पिक एक्सटेंशन कॉलबैक (`extend.cliConfig` / `extend.testConfig`) लेता है। प्रत्येक एक्सटेंशन बेस जेनरेटर लेता है और संवर्धित जेनरेटर लौटाता है।

```ts
// zod-v4-mocks.config.ts
import { defineMockConfig } from 'zod-v4-mocks/config'
import { UserId, FIXED_UUID } from './src/schemas/ids'

export default defineMockConfig({
  // प्रोजेक्ट-स्तर डिफ़ॉल्ट (हर प्रोफ़ाइल में लागू)
  baseConfig: ({ initGenerator }) =>
    initGenerator({ locale: 'ja', keyMapping: 'auto' })
      .supplyRef(UserId, FIXED_UUID),

  extend: {
    // CLI से चलाने पर लागू
    cliConfig: (base) =>
      base.updateConfig({ seed: 1 })
        .supplyPath(['createdAt'], new Date('2024-01-01')),

    // टेस्ट से उपयोग पर लागू
    testConfig: (base) =>
      base.override((schema, opts) => /* केवल-टेस्ट नियम */ undefined),
  },
})
```

प्रत्येक लेयर के उद्देश्य:

| लेयर | क्या रखें |
|---|---|
| `baseConfig` | `locale`, `customMockKey`, `consistentKey`, प्रोजेक्ट-स्तर `supplyRef`, `keyMapping` पॉलिसी |
| `extend.cliConfig` | केवल CLI जनरेशन के लिए सार्थक डिफ़ॉल्ट (फ़िक्स्ड seed, आउटपुट फ़ॉर्मेट संकेत) |
| `extend.testConfig` | क्रॉस-टेस्ट संधि (`override` नियम, अतिरिक्त `supplyRef`) — प्रति-टेस्ट विशिष्ट ओवरराइड टेस्ट के अंदर लौटे जेनरेटर पर चेन करें |

### CLI से लोडिंग

CLI वर्किंग डायरेक्टरी से `zod-v4-mocks.config.{ts,js,mjs}` ऑटो-खोजता है और डिफ़ॉल्ट रूप से `cli` प्रोफ़ाइल लागू करता है। `--config <path>` और `--profile <name>` से ओवरराइड किया जा सकता है।

### टेस्ट / Node कोड से लोडिंग

```ts
import { loadConfig } from 'zod-v4-mocks/config'

const { createBase, createCli, createTest } = await loadConfig()
// createBase / createCli / createTest फैक्ट्री हैं — हर कॉल पर एक नया
// MockGenerator इंस्टेंस लौटता है।

beforeEach(() => {
  // प्रति-टेस्ट विविधताएँ साझा base + testConfig के ऊपर चेन की जाती हैं
  gen = createTest()
    .updateConfig({ seed: testCase.seed })
    .supplyPath(['user', 'email'], 'override@x')
})
```

जब कोई कॉन्फ़िग फ़ाइल नहीं मिलती और स्पष्ट रूप से माँगी नहीं गई थी, तब `loadConfig` `null` लौटाता है — इसलिए वही कोड पाथ काम करता है चाहे प्रोजेक्ट में कॉन्फ़िग हो या नहीं।

### "फैक्ट्री" क्यों मायने रखती है

चेन API जेनरेटर को mutate करता है (`gen.supplyPath(...)` वही इंस्टेंस लौटाता है)। यदि `loadConfig` एक साझा इंस्टेंस लौटाए, तो एक टेस्ट में जोड़े गए supplies अगले टेस्ट में रिसते हैं। `create*` फैक्ट्री हर कॉल पर मूल `baseConfig` (और संगत `extend`) से जेनरेटर पुनर्निर्मित करती हैं, इसलिए हर कॉल पर एक अलग इंस्टेंस मिलता है।

```ts
const a = createTest().supplyPath(['note'], 'A')
const b = createTest()                  // b में ['note'] -> 'A' नहीं दिखता
```

### API संदर्भ

```ts
import {
  defineMockConfig,
  loadConfig,
  getProfileFactory,
  type ConfigProfile,
  type DefineMockConfigInput,
  type LoadedMockConfig,
} from 'zod-v4-mocks/config'

defineMockConfig({
  baseConfig: ({ initGenerator, z }) => MockGenerator,
  extend?: {
    cliConfig?: (base: MockGenerator) => MockGenerator,
    testConfig?: (base: MockGenerator) => MockGenerator,
  },
})

loadConfig(options?: { cwd?: string; configFile?: string })
  : Promise<LoadedMockConfig | null>

// LoadedMockConfig:
// { configFile?, raw, createBase, createCli, createTest }

getProfileFactory(loaded: LoadedMockConfig, profile?: ConfigProfile)
  : () => MockGenerator
```

## अगले कदम

- [कॉन्फ़िगरेशन](/hi/guide/configuration) - `MockConfig` के सभी विकल्प
- [कस्टम जेनरेटर](/hi/guide/custom-generator) - `supply` / `supplyRef` / `supplyPath` / `override`
- [API संदर्भ](/hi/api/) - मेथड-स्तर संदर्भ
