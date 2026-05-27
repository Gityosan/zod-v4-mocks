# कस्टमाइज़ेशन

ऐसे मेथड जो यह आकार देते हैं कि *क्या* जनरेट होगा, इससे पहले कि आप कोई
[जेनरेशन](/hi/api/generation) मेथड कॉल करें। ये सभी चेन करने योग्य हैं — ये
वही `MockGenerator` इंस्टेंस लौटाते हैं।

तीनों `supply*` मेथड बढ़ती हुई परिशुद्धता के स्तरों पर वैल्यू पिन करते हैं:
**type** द्वारा (`supply`), **schema reference** द्वारा (`supplyRef`), और **path** द्वारा
(`supplyPath`)।

## supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

विशिष्ट Zod टाइप को फिक्स्ड वैल्यू सेट करता है। एक ही टाइप को कई बार सेट करने पर, पहले सेट की गई वैल्यू प्राथमिक होती है।

```ts
generator
  .supply(z.ZodString, 'test string')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

## supplyRef

```ts
supplyRef(subSchema: z.core.$ZodType, value: unknown): MockGenerator
```

किसी **विशिष्ट स्कीमा इंस्टेंस** के लिए (reference द्वारा) एक फिक्स्ड वैल्यू पिन करता है,
न कि उस टाइप के हर स्कीमा के लिए। इसका उपयोग तब करें जब दो फ़ील्ड एक ही Zod
टाइप साझा करते हों पर उनमें से केवल एक को फिक्स किया जाना हो, या किसी ऐसे
स्कीमा को वैल्यू देने के लिए जिसे अन्यथा मॉक नहीं किया जा सकता जैसे एक खाली `z.custom()`। टकराव होने पर
पहला रजिस्टर किया गया जीतता है।

```ts
const SpecialId = z.string()

const schema = z.object({
  id: z.string(),        // रैंडम ही रहता है
  specialId: SpecialId,  // हमेशा 'FIXED'
})

generator
  .supplyRef(SpecialId, 'FIXED')
  .generate(schema)
```

## supplyPath

```ts
supplyPath(path: PathSegment[], value: unknown): MockGenerator
```

जनरेट की गई संरचना के अंदर एक **विशिष्ट स्थान** पर फिक्स्ड वैल्यू पिन करता है,
जिसे सेगमेंट्स के एक path से संबोधित किया जाता है ([`PathSegment`](/hi/api/types#pathsegment)
`string | number | symbol` है):

- **object** → string key
- **array / tuple** → number index
- **record / map** → literal key (भले ही यह रैंडमली जनरेट न हुई हो, फिर भी इंजेक्ट की जाती है)

दो मार्कर कॉन्स्टेंट किसी एक के बजाय किसी स्थान के *सभी* एलिमेंट्स को संबोधित करते हैं:

| मार्कर | वैल्यू | मैच करता है |
|--------|-------|---------|
| `ITEM_MARKER` | `'$item'` | array / set / tuple का हर एलिमेंट |
| `VALUE_MARKER` | `'$value'` | record / map की हर वैल्यू |

टकराव होने पर एक literal सेगमेंट हमेशा मार्कर से जीतता है (अधिक विशिष्टता जीतती है)।
किसी `'$key'` को लक्षित करना जानबूझकर समर्थित नहीं है।

```ts
import { initGenerator, ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

const schema = z.object({
  user: z.object({ name: z.string() }),
  tags: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
})

generator
  .supplyPath(['user', 'name'], 'Alice')   // सटीक फ़ील्ड
  .supplyPath(['tags', 0], 'first')         // पहला array एलिमेंट
  .supplyPath(['tags', ITEM_MARKER], 'x')   // हर array एलिमेंट
  .supplyPath(['scores', VALUE_MARKER], 0)  // हर record वैल्यू
  .generate(schema)
```

::: tip Array की लंबाई
एक literal न्यूमेरिक इंडेक्स जनरेट किए गए array को इतना बढ़ा देता है कि लक्षित इंडेक्स
मौजूद रहे (एक आंतरिक हार्ड लिमिट तक सीमित, ताकि `supplyPath(['x', 1e8], …)` जैसी
टाइपिंग गलतियों से बचाव हो सके)।
:::

## override

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

फंक्शन सिग्नेचर के लिए [`CustomGeneratorType`](/hi/api/types#customgeneratortype) और
[`GeneraterOptions`](/hi/api/types#generateroptions) देखें, और पैटर्न के लिए
[कस्टम जेनरेटर गाइड](/hi/guide/custom-generator) देखें।

## register

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

## updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

सेटिंग्स अपडेट करता है। मौजूदा `supply` / `override` सेटिंग्स बरकरार रहती हैं।

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```
