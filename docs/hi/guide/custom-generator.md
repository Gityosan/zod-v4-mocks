# कस्टम जेनरेटर

विशिष्ट स्कीमा के लिए कस्टम वैल्यू या जेनरेटर फंक्शन सेट कर सकते हैं। `supply` / `supplyRef` / `supplyPath` / `override` / `register` - ये पाँच तरीके हैं, और प्रत्येक नियंत्रण की एक अलग ग्रैन्युलैरिटी के लिए है:

| मेथड | लक्ष्य | कब इस्तेमाल करें |
|---|---|---|
| `supply` | Zod *कंस्ट्रक्टर* (`z.ZodString`, ...) | "सभी strings X होने चाहिए" |
| `supplyRef` | विशिष्ट *स्कीमा रेफरेंस* | "केवल यह सब-स्कीमा X हो" |
| `supplyPath` | जेनरेटेड ट्री में *पाथ* | "`user.email` स्लॉट X हो" |
| `override` | schema + context पर कोई भी *फंक्शन* | "कोड में जो भी व्यक्त कर सकें" |
| `register` | वैल्यू कंसिस्टेंसी के लिए संबंधित स्कीमा | "`User.id` और `Comment.userId` में एक ही UUID" |

## supply - फिक्स्ड वैल्यू सेट करना

विशिष्ट Zod टाइप क्लास को **फिक्स्ड वैल्यू** असाइन करता है। "इस स्कीमा टाइप में हमेशा यह वैल्यू उपयोग करें" - ऐसे सरल केस के लिए सबसे अच्छा है।

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = initGenerator()
  .supply(z.ZodString, 'テストユーザー')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)

// => { id: "08e93b6a-...", name: "テストユーザー", email: "test@example.com" }
```

### supply की विशेषताएँ

- Zod टाइप कंस्ट्रक्टर निर्दिष्ट करके, उस टाइप के सभी इंस्टेंस पर एक ही वैल्यू सेट
- मेथड चेनिंग से कई `supply` जोड़ सकते हैं
- एक ही टाइप पर कई वैल्यू सेट करने पर, **पहले सेट की गई वैल्यू प्राथमिक** होती है

```ts
const mock = initGenerator()
  .supply(z.ZodEmail, 'first@example.com')   // यह प्राथमिक
  .supply(z.ZodEmail, 'second@example.com')  // अनदेखा किया जाता है
  .generate(schema)
// email 'first@example.com' होगा
```

### सपोर्टेड टाइप कंस्ट्रक्टर के उदाहरण

| कंस्ट्रक्टर | लक्ष्य |
|--------------|------|
| `z.ZodString` | `z.string()` |
| `z.ZodNumber` | `z.number()` |
| `z.ZodBoolean` | `z.boolean()` |
| `z.ZodEmail` | `z.email()` |
| `z.ZodUUID` | `z.uuid()` |
| `z.ZodURL` | `z.url()` |
| `z.ZodDate` | `z.date()` |

## supplyRef - स्कीमा रेफरेंस से मिलान

`supply` एक ही Zod क्लास के सभी स्कीमा पर लागू होता है। यदि सिर्फ **एक खास जगह** को फिक्स करना हो, तो `supplyRef` का उपयोग करें - यह रेफरेंस की समानता (`===`) से मिलान करता है।

```ts
const Name = z.string()

const Schema = z.object({
  user: z.object({ name: Name }),  // <- यह Name नोड
  bio: z.string(),                  // <- एक अलग z.string()
})

const mock = initGenerator()
  .supplyRef(Name, 'Alice')
  .generate(Schema)
// mock.user.name === 'Alice'
// mock.bio सामान्य रूप से जेनरेट होता है (अलग रेफरेंस इसलिए असंबंधित)
```

- मिलान **इंस्टेंस आइडेंटिटी** पर आधारित है। `z.string()` को दो बार कॉल करने से दो अलग रेफरेंस बनते हैं जो एक-दूसरे से मेल नहीं खाते।
- एक ही रेफरेंस को दो बार supply करने पर **पहले रजिस्टर हुआ जीतता है**, ठीक `supply` की तरह।

## supplyPath - स्ट्रक्चरल पाथ से मिलान

`supplyPath` जेनरेटेड ट्री में **विशिष्ट पाथ** पर वैल्यू फिक्स करता है, उस जगह का Zod टाइप जो भी हो। पाथ सेगमेंट `string | number | symbol` होते हैं, साथ में दो मार्कर:

- `'$item'` — array / tuple / set के सभी एलिमेंट
- `'$value'` — record / map के सभी वैल्यू

```ts
const Schema = z.object({
  user: z.object({ name: z.string(), createdAt: z.date() }),
  scores: z.record(z.string(), z.number()),
  pair: z.tuple([z.string(), z.string()]),
})

const mock = initGenerator()
  .supplyPath(['user', 'name'], 'Alice')              // object की key
  .supplyPath(['user', 'createdAt'], new Date(0))     // leaf पर टाइप्ड वैल्यू
  .supplyPath(['scores', 'alice'], 100)               // record की विशिष्ट key inject
  .supplyPath(['scores', '$value'], 0)                // बाकी वैल्यू के लिए डिफ़ॉल्ट
  .supplyPath(['pair', 0], 'first')                   // tuple इंडेक्स
  .generate(Schema)
```

### कंटेनर के अनुसार नियम

| कंटेनर | `string` सेगमेंट | `number` सेगमेंट | `$item` | `$value` |
|---|---|---|---|---|
| `object` | प्रॉपर्टी का नाम | — | — | — |
| `array` | — | इंडेक्स (आवश्यकतानुसार लंबाई बढ़ती है) | सभी एलिमेंट | — |
| `tuple` | — | फिक्स्ड इंडेक्स | सभी एलिमेंट | — |
| `record` | इस key को inject करें | numeric key inject करें | — | सभी वैल्यू |
| `map` | इस key को inject करें | numeric key inject करें | — | सभी वैल्यू |
| `set` | — | — | सभी मेंबर | — |

record / map के लिए विशिष्ट key देने पर वह एंट्री **inject** होती है — रैंडम जेनरेशन में नहीं होती तब भी आउटपुट में key गारंटीड रहती है। बाकी एंट्री इसके आसपास सामान्य रूप से जेनरेट होती हैं।

### विशिष्ट पाथ मार्कर पाथ से ज्यादा प्राथमिक हैं

दोनों लागू हों तो लिटरल पाथ `$item` / `$value` से ऊपर जाता है। एक ही specificity में पहले रजिस्टर हुआ जीतता है।

```ts
const mock = initGenerator({ array: { min: 3, max: 3 } })
  .supplyPath(['$item'], 'default')
  .supplyPath([1], 'middle')
  .generate(z.array(z.string()))
// => ['default', 'middle', 'default']
```

### `$key` क्यों नहीं?

"सभी keys को एक वैल्यू पर सेट करना" वाला `$key` जानबूझकर नहीं रखा गया: record / map की keys यूनीक होनी चाहिए, इसलिए "सभी keys = X" कलेक्शन को एक एंट्री तक सिकोड़ देता है। लिटरल सेगमेंट से विशिष्ट key देना यूज़फुल केस को कवर कर देता है।

### Symbol सेगमेंट

`Symbol` रेफरेंस `z.record(z.symbol(), ...)` और `z.map(z.symbol(), ...)` के लिए मान्य पाथ सेगमेंट हैं।

```ts
const KEY = Symbol('user')
const Schema = z.map(z.symbol(), z.number())
const mock = initGenerator().supplyPath([KEY], 7).generate(Schema)
// mock.get(KEY) === 7
```

`Set` प्रति-एलिमेंट टार्गेटिंग सपोर्ट नहीं करता (इसके मेंबर्स की स्थिर पहचान नहीं होती)।

## override - कस्टम जेनरेटर फंक्शन

`supply` से अधिक लचीले कस्टमाइज़ेशन की आवश्यकता होने पर `override` का उपयोग करें। स्कीमा और ऑप्शन को आर्गुमेंट के रूप में प्राप्त करके, कस्टम वैल्यू लौटाने वाला फंक्शन परिभाषित कर सकते हैं।

```ts
import { type CustomGeneratorType, initGenerator } from 'zod-v4-mocks'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  if (schema instanceof z.ZodString) {
    return 'custom: ' + faker.person.fullName()
  }
  // undefined लौटाने पर डिफ़ॉल्ट जनरेशन लॉजिक का उपयोग होता है
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(schema)
```

### CustomGeneratorType की टाइप परिभाषा

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

- **`schema`**: वर्तमान में प्रोसेस हो रहा Zod स्कीमा इंस्टेंस
- **`options`**: जनरेशन ऑप्शन (`faker` इंस्टेंस सहित)
- **रिटर्न वैल्यू**: जनरेट करने वाली वैल्यू। `undefined` लौटाने पर डिफ़ॉल्ट जनरेशन लॉजिक में फॉलबैक

### स्कीमा इंस्टेंस की तुलना

`instanceof` के अलावा, **स्कीमा के रेफरेंस** की सीधी तुलना करके, और भी बारीक कंट्रोल संभव है।

```ts
const basicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  // केवल name फ़ील्ड को कस्टमाइज़ करें (अन्य z.string() प्रभावित नहीं होते)
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName()
  }
}
```

### `z.custom()` और `z.instanceof()` का हैंडलिंग

`z.custom()` स्कीमा के पास रनटाइम पर "क्या जेनरेट करना है" का कोई संकेत नहीं होता, इसलिए यह लाइब्रेरी स्कीमा के `meta` से जेनरेटर पढ़ती है। मेटा key का नाम [`customMockKey`](/hi/guide/configuration#custommockkey) से कॉन्फ़िगर होता है और डिफ़ॉल्ट `'mock'` है।

```ts
const FileSchema = z.custom<File>((v) => v instanceof File).meta({
  mock: (faker) => new File(['x'], faker.system.fileName()),
})

const BigDec = z.instanceof(BigDecimal).meta({
  mock: () => new BigDecimal('1.5'),
})

const mock = initGenerator().generate(z.object({ file: FileSchema, n: BigDec }))
```

meta वैल्यू एक फंक्शन `(faker, options) => unknown` या एक प्लेन वैल्यू दोनों हो सकती है।

जब `z.custom` स्लॉट के लिए न तो meta `mock` है और न ही `supplyRef`, तब वह वैल्यू **छोड़ी गई (omitted)** मानी जाती है — arrays / objects / records / maps / sets से चुपचाप हट जाती है, और tuples (जिन्हें सिकोड़ा नहीं जा सकता) में चेतावनी आती है।

टेस्ट से एक-बार के लिए कोई वैल्यू पिन करनी हो तो `supplyRef` का उपयोग करें, जो meta से ऊपर जाता है:

```ts
const mock = initGenerator()
  .supplyRef(FileSchema, new File(['fixed'], 'fixed.txt'))
  .generate(FileSchema)
```

## supply और override की प्राथमिकता

एक ही टाइप के लिए `supply` और `override` दोनों सेट होने पर, **पहले सेट किया गया प्राथमिक** होता है। `supply` → `override` के क्रम में सेट करने पर `supply` प्राथमिक होगा।

```ts
const customGenerator: CustomGeneratorType = (schema) => {
  if (schema instanceof z.ZodEmail) {
    return 'override@example.com'
  }
}

const mock = initGenerator()
  .supply(z.ZodEmail, 'supply@example.com')  // पहले सेट → प्राथमिक
  .override(customGenerator)                  // बाद में सेट
  .generate(schema)
// email 'supply@example.com' होगा
```

आंतरिक रूप से, `supply` और `override` दोनों एक ही कस्टम जेनरेटर चेन में जोड़े जाते हैं। पहले जोड़ा गया पहले मूल्यांकित होता है, और `undefined` के अलावा कुछ लौटाने पर वही निश्चित होता है।

### पूरी प्राथमिकता का क्रम

सभी कस्टमाइज़ेशन तरीकों की समग्र प्राथमिकता:

1. **`supplyPath`** — मिलने वाले पाथ सब से ऊपर जीतते हैं (सबसे विशिष्ट स्थान)
2. **`consistentKey` रजिस्ट्री** — स्कीमा कंसिस्टेंट वैल्यू के लिए रजिस्टर किया गया है तो
3. **`supply` / `supplyRef` / `override`** — एकीकृत कस्टम जेनरेटर चेन (पहले रजिस्टर हुआ जीतता है)
4. **`keyMapping`** — प्रॉपर्टी नाम → faker की ऑप्ट-इन मैपिंग (केवल प्रिमिटिव लीफ़्स)
5. **`z.custom().meta(...)`** — `z.custom` / `z.instanceof` के लिए meta आधारित जेनरेटर
6. **डिफ़ॉल्ट जेनरेशन** — लाइब्रेरी के बिल्ट-इन नियम

## पुनरुत्पादन योग्य कस्टम जेनरेटर

कस्टम जेनरेटर में भी पुनरुत्पादन योग्य वैल्यू जनरेट करने के लिए, `Math.random()` के बजाय `options.faker` का उपयोग करें। `faker` इंस्टेंस seed पर आधारित रैंडम नंबर जेनरेटर (RNG) अंतर्निहित करता है।

```ts
const deterministicOverride: CustomGeneratorType = (schema, options) => {
  const { faker } = options // seeded RNG
  if (schema instanceof z.ZodEmail) {
    const user = faker.internet.userName()
    const host = faker.internet.domainName()
    return `${user}@${host}`
  }
}

const gen = initGenerator({ seed: 12345 })
  .override(deterministicOverride)

const a = gen.generate(z.email()) // एक ही seed पर हर बार एक ही वैल्यू
```

::: warning पुनरुत्पादन को नुकसान पहुँचाने वाले फंक्शन से बचें
निम्नलिखित फंक्शन सीड वैल्यू को अनदेखा करते हैं, जिससे टेस्ट की पुनरुत्पादनीयता खो जाती है:
- `Math.random()`
- `Date.now()`
- `crypto.randomUUID()`

इसके बजाय `options.faker.number.int()`, `options.faker.date.recent()` आदि का उपयोग करें।
:::

## register - सुसंगत डेटा जनरेशन

संबंधित फ़ील्ड के बीच एक ही वैल्यू साझा करने के लिए, `register` का उपयोग करें। विस्तृत जानकारी के लिए [कॉन्फ़िगरेशन - consistentKey और register](/hi/guide/configuration#consistentkey-और-register) देखें।

```ts
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })

const userSchema = z.object({
  id: UserId,
  name: z.string(),
})

const commentSchema = z.object({
  userId: UserId, // userSchema.id के समान वैल्यू जनरेट होगी
  value: z.string(),
})

const mock = initGenerator({ consistentKey })
  .register([UserId])
  .generate(commentSchema)
```

## व्यावहारिक पैटर्न

### टेस्ट के लिए फैक्ट्री फंक्शन

```ts
function createMockUser(overrides?: Partial<z.infer<typeof userSchema>>) {
  const generator = initGenerator({ seed: 1 })
  const base = generator.generate(userSchema)
  return { ...base, ...overrides }
}

// उपयोग का उदाहरण
const user = createMockUser({ name: 'テストユーザー' })
```

### कई ओवरराइड को मिलाना

```ts
const emailOverride: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodEmail) {
    return `user${options.faker.number.int({ max: 999 })}@test.com`
  }
}

const dateOverride: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodDate) {
    return options.faker.date.recent({ days: 30 })
  }
}

const mock = initGenerator({ seed: 42 })
  .override(emailOverride)
  .override(dateOverride)
  .generate(schema)
```

## अगले कदम

- [कॉन्फ़िगरेशन](/hi/guide/configuration) - MockConfig के सभी विकल्प
- [Schema सपोर्ट](/hi/guide/schema-support) - सपोर्टेड स्कीमा का विवरण
- [API संदर्भ](/hi/api/) - सभी मेथड का विवरण
