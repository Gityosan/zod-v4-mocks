# कस्टम जेनरेटर

विशिष्ट स्कीमा के लिए कस्टम वैल्यू या जेनरेटर फंक्शन सेट कर सकते हैं। `supply`, `override`, `register` - ये तीन तरीके हैं, और प्रत्येक अलग-अलग यूज़ केस के लिए है।

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

### असपोर्टेड स्कीमा के लिए समाधान

`z.custom()` या `z.instanceof()` जैसे लाइब्रेरी द्वारा असपोर्टेड स्कीमा के लिए, `override` से वैल्यू प्रदान कर सकते हैं।

```ts
const myCustomSchema = z.custom<MyClass>((val) => val instanceof MyClass)

const customGenerator: CustomGeneratorType = (schema) => {
  if (schema === myCustomSchema) {
    return new MyClass()
  }
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(myCustomSchema)
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
