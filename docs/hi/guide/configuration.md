# कॉन्फ़िगरेशन

`initGenerator()` में ऑप्शन ऑब्जेक्ट पास करके, मॉक जनरेशन के व्यवहार को कस्टमाइज़ कर सकते हैं।

## MockConfig

```ts
interface MockConfig {
  locale?: LocaleType | LocaleType[]  // default: [en, base]
  randomizer?: Randomizer             // faker.js का रैंडमाइज़र
  seed: number                        // default: 1
  array: { min: number; max: number } // default: { min: 1, max: 3 }
  map: { min: number; max: number }   // default: { min: 1, max: 3 }
  set: { min: number; max: number }   // default: { min: 1, max: 3 }
  record: { min: number; max: number } // default: { min: 1, max: 3 }
  optionalProbability: number          // default: 0.5
  nullableProbability: number          // default: 0.5
  defaultProbability: number           // default: 0.5
  recursiveDepthLimit?: number         // default: 5
  consistentKey?: string               // मेटाडेटा का कुंजी नाम
}
```

## बुनियादी कॉन्फ़िगरेशन उदाहरण

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})

const schema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
})

const mock = generator.generate(schema)
// tags में 2 से 5 आइटम जनरेट होंगे
```

## seed (सीड वैल्यू)

`seed` निर्दिष्ट करने पर पुनरुत्पादन योग्य मॉक डेटा जनरेट होता है। एक ही सीड वैल्यू का उपयोग करने पर, हर बार एक ही परिणाम मिलता है, जो टेस्ट की स्थिरता सुनिश्चित करने के लिए उपयोगी है।

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

पुनरुत्पादन सभी सपोर्टेड स्कीमा में गारंटीड है। transform या regex पैटर्न वाले स्कीमा में भी यही लागू होता है।

```ts
const schema = z.string().transform((val) => val.toUpperCase())

const g1 = initGenerator({ seed: 444 })
const g2 = initGenerator({ seed: 444 })

const results1 = Array.from({ length: 3 }, () => g1.generate(schema))
const results2 = Array.from({ length: 3 }, () => g2.generate(schema))
// results1 और results2 पूरी तरह मेल खाते हैं
```

::: tip पुनरुत्पादन बनाए रखने के लिए सुझाव
कस्टम जेनरेटर (`override`) उपयोग करते समय, `Math.random()` या `Date.now()` के बजाय, आर्गुमेंट में दिए गए `options.faker` का उपयोग करें। `faker` इंस्टेंस seed पर आधारित RNG का उपयोग करता है।
:::

## locale (लोकेल)

faker.js का लोकेल निर्दिष्ट करता है। एक स्ट्रिंग निर्दिष्ट कर सकते हैं, या ऐरे से कई लोकेल प्राथमिकता क्रम में निर्दिष्ट कर सकते हैं।

```ts
// जापानी लोकेल
const generator = initGenerator({ locale: 'ja' })

// कई लोकेल (प्राथमिकता क्रम)
const generator = initGenerator({ locale: ['ja', 'en'] })
```

डिफ़ॉल्ट `[en, base]` (faker.js का डिफ़ॉल्ट) है। लोकेल बदलने पर, `faker.person.fullName()` आदि से जनरेट होने वाले नाम संबंधित भाषा में होंगे।

## कलेक्शन साइज़ कंट्रोल

`array`, `map`, `set`, `record` की `min`/`max` से, प्रत्येक कलेक्शन के जनरेट होने वाले एलिमेंट की संख्या कंट्रोल कर सकते हैं।

```ts
const generator = initGenerator({
  array: { min: 2, max: 5 },   // ऐरे की लंबाई: 2~5
  record: { min: 1, max: 3 },  // रिकॉर्ड एंट्री संख्या: 1~3
  map: { min: 2, max: 4 },     // Map एंट्री संख्या: 2~4
  set: { min: 1, max: 3 },     // Set एलिमेंट संख्या: 1~3
})
```

::: info स्कीमा साइड की बाधाओं के साथ प्राथमिकता
यदि स्कीमा में `.min()` / `.max()` / `.nonempty()` सेट है, तो स्कीमा साइड की बाधा प्राथमिक होती है।

```ts
const gen = initGenerator({ array: { min: 1, max: 2 } })
const schema = z.array(z.string()).min(5) // स्कीमा का min(5) प्राथमिक
const result = gen.generate(schema)
// result.length >= 5 गारंटीड
```
:::

## प्रायिकता कंट्रोल

Optional / Nullable / Default टाइप में जनरेट होने वाली वैल्यू की प्रायिकता कंट्रोल करता है। वैल्यू `0` (0%) से `1` (100%) की रेंज में निर्दिष्ट करें।

### optionalProbability

`optional` टाइप में **वैल्यू छोड़े जाने (`undefined` होने) की प्रायिकता** है।

```ts
// 30% प्रायिकता से undefined होगा
const gen = initGenerator({ optionalProbability: 0.3 })

// हमेशा वैल्यू जनरेट होगी (undefined नहीं होगा)
const gen = initGenerator({ optionalProbability: 0 })

// हमेशा undefined होगा
const gen = initGenerator({ optionalProbability: 1 })
```

### nullableProbability

`nullable` टाइप में **`null` जनरेट होने की प्रायिकता** है।

```ts
// 30% प्रायिकता से null होगा
const gen = initGenerator({ nullableProbability: 0.3 })
```

### defaultProbability

`default` टाइप में **डिफ़ॉल्ट वैल्यू उपयोग होने की प्रायिकता** है।

```ts
const gen = initGenerator({ defaultProbability: 0.8 })

const schema = z.boolean().default(true)
// 80% प्रायिकता से true (डिफ़ॉल्ट वैल्यू), 20% प्रायिकता से रैंडम boolean
```

## recursiveDepthLimit

रिकर्सिव स्कीमा (`z.lazy()` या गेटर-बेस्ड सर्कुलर रेफरेंस) की अधिकतम गहराई है। डिफ़ॉल्ट `5` है।

```ts
const generator = initGenerator({ recursiveDepthLimit: 3 })
```

गहराई सीमा पर पहुँचने पर, खाली ऑब्जेक्ट `{}` टर्मिनेटर के रूप में लौटाया जाता है।

```ts
type Category = {
  name: string
  subcategories: Category[]
}

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  }),
)

const gen = initGenerator({ recursiveDepthLimit: 2 })
const result = gen.generate(categorySchema)
// => { name: "...", subcategories: [{ name: "...", subcategories: [{}] }] }
//                                                        ↑ गहराई सीमा पर खाली ऑब्जेक्ट
```

गेटर-बेस्ड सर्कुलर रेफरेंस में भी समान रूप से काम करता है।

```ts
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional()
  },
})

const gen = initGenerator({ recursiveDepthLimit: 3 })
const result = gen.generate(Node) // सामान्य रूप से समाप्त होता है
```

::: info lazyDepthLimit (डेप्रिकेटेड)
`lazyDepthLimit` का `recursiveDepthLimit` के समान कार्य है। यदि `recursiveDepthLimit` सेट है, तो वह प्राथमिक होता है। नए कोड में `recursiveDepthLimit` का उपयोग करें।
:::

## consistentKey और register

संबंधित फ़ील्ड के बीच **सुसंगत वैल्यू** जनरेट करने के लिए उपयोग किया जाता है। उदाहरण के लिए, `User.id` और `Comment.userId` में एक ही UUID असाइन करने के लिए उपयोगी है।

### कार्यप्रणाली

1. साझा स्कीमा में `.meta()` से मेटाडेटा कुंजी सेट करें
2. `initGenerator` में `consistentKey` निर्दिष्ट करें
3. `.register()` से स्कीमा रजिस्टर करें
4. रजिस्टर किए गए स्कीमा जहाँ उपयोग होते हैं, वहाँ सुसंगत वैल्यू जनरेट होती है

### व्यावहारिक उदाहरण

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

// मेटाडेटा का कुंजी नाम सेट करें
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })
const CommentId = z.uuid().meta({ [consistentKey]: 'CommentId' })
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' })

// स्कीमा परिभाषा
const userSchema = z.object({
  id: UserId,       // ← एक ही UserId जनरेट होगा
  name: z.string(),
})

const commentSchema = z.object({
  id: CommentId,
  postId: PostId,   // ← एक ही PostId जनरेट होगा
  user: userSchema,
  userId: UserId,   // ← userSchema.id के समान वैल्यू
  value: z.string(),
})

const postSchema = z.object({
  id: PostId,       // ← commentSchema.postId के समान वैल्यू
  comments: z.array(commentSchema),
  value: z.string(),
})

// register से स्कीमा रजिस्टर करें और generate से जनरेट करें
const schemas = [CommentId, UserId, PostId]
const mock = initGenerator({ consistentKey })
  .register(schemas)
  .generate(z.array(postSchema))
```

उपरोक्त उदाहरण में, निम्नलिखित सुसंगतता गारंटीड है:

- प्रत्येक Post का `id` और उस Post के भीतर Comment का `postId` मेल खाता है
- प्रत्येक User का `id` और `userId` मेल खाता है

```json
[
  {
    "id": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
    "comments": [
      {
        "id": "b438b6fa-765b-4706-8b22-88adb9b5534a",
        "postId": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
        "user": {
          "id": "c9b26358-a125-4ad8-ad65-52d58980fe34",
          "name": "acceptus"
        },
        "userId": "c9b26358-a125-4ad8-ad65-52d58980fe34",
        "value": "antepono"
      }
    ],
    "value": "ut"
  }
]
```

## updateConfig

कॉन्फ़िगरेशन को `updateConfig()` से बाद में भी बदला जा सकता है।

```ts
const generator = initGenerator({ seed: 1 })
generator.generate(z.string()) // seed: 1 से जनरेट

generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
generator.generate(z.string()) // seed: 42 से जनरेट
```

`updateConfig` मौजूदा `supply` / `override` सेटिंग्स को बनाए रखते हुए, केवल config को अपडेट करता है।

## अगले कदम

- [कस्टम जेनरेटर](/hi/guide/custom-generator) - supply / override / register का उपयोग
- [Schema सपोर्ट](/hi/guide/schema-support) - सपोर्टेड स्कीमा का विवरण
- [API संदर्भ](/hi/api/) - सभी मेथड का विवरण
