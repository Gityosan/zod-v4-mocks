# जेनरेशन

ऐसे मेथड जो Zod स्कीमा को मॉक डेटा में बदलते हैं। इनमें से कोई भी चेन करने योग्य नहीं है —
ये किसी भी [कस्टमाइज़ेशन](/hi/api/customization) के बाद का टर्मिनल चरण हैं।

## generate

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

## multiGenerate

[▶ Playground में आज़माएँ](/hi/playground/?example=multi-generate)

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

## generateMany

[▶ Playground में आज़माएँ](/hi/playground/?example=discriminated-union)

```ts
generateMany<T extends z.ZodType>(schema: T, count: number): z.infer<T>[]
```

एक ही स्कीमा से `count` स्वतंत्र मॉक का एक array जनरेट करता है। seeded RNG
हर कॉल पर डिटरमिनिस्टिक लेकिन भिन्न वैल्यू उत्पन्न करता है। `count`
एक नॉन-नेगेटिव इंटीजर होना चाहिए — अन्यथा एक एरर फेंका जाता है।

```ts
const users = generator.generateMany(UserSchema, 10)
// टाइप: User[] (10 आइटम)
```

यह वही मेथड है जो CLI के `--count` फ़्लैग के पीछे है।

## preflight

```ts
preflight(schema: z.core.$ZodType): PreflightDiagnostic[]
```

[प्रीफ़्लाइट schema walk](/hi/guide/configuration#preflightcheck) को चलाता है और उसके डायग्नॉस्टिक्स को **डेटा के रूप में** लौटाता है — न तो कोई एक्सेप्शन फेंकता है और न ही जनरेटर की स्थिति बदलता है। यह `generate()` के अंदर चलने वाली जाँच का read-only रूप है — वह error स्तर पर एक्सेप्शन फेंकती है और warning स्तर पर लॉग करती है, जबकि `preflight()` हर डायग्नॉस्टिक को वैसे ही लौटा देता है, ताकि आप जनरेट करने से पहले schema की जाँच कर सकें (टूलिंग, लिंटिंग, [Playground](/hi/playground/) आदि के लिए)। जब `preflightCheck` अक्षम हो तो यह एक खाली array लौटाता है।

```ts
const schema = z.object({
  username: z.string().refine((s) => s.startsWith('@')),
  score: z.number().min(100).max(10),
})

const diagnostics = generator.preflight(schema)
// [
//   { level: 'warning', path: 'username', message: 'A .refine() ... is ignored ...' },
//   { level: 'warning', path: 'score',    message: 'Unsatisfiable number range ...' },
// ]
```

प्रत्येक `PreflightDiagnostic` में `level` (`'error' | 'warning'`), समस्या वाले नोड का `path`, और एक पठनीय `message` होता है।

## factory

[▶ Playground में आज़माएँ](/hi/playground/?example=factory)

```ts
factory<T extends z.ZodType>(
  schema: T
): { next: () => z.infer<T>; take: (n: number) => z.infer<T>[] }
```

एक स्कीमा से बंधी हुई factory लौटाता है। तब उपयोगी है जब आप एक ही
स्कीमा से बार-बार जनरेट करते हैं — उदाहरण के लिए किसी fixture को पंक्ति-दर-पंक्ति seed करना, या
पूरे array को पहले से बनाए बिना एक बड़े बैच को स्ट्रीम करना।

- `next()` — एक नया मॉक उत्पन्न करता है (`generate(schema)` के समतुल्य)।
- `take(n)` — `n` मॉक का एक array उत्पन्न करता है (`generateMany(schema, n)` के समतुल्य)।

```ts
const userFactory = generator.factory(UserSchema)

const first = userFactory.next()       // User
const batch = userFactory.take(100)    // User[]

// पूरे array को मेमोरी में रखे बिना स्ट्रीम करें
for (let i = 0; i < 1000; i++) {
  await db.insert(userFactory.next())
}
```
