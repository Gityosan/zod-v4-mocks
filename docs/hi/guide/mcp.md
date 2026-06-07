# MCP सर्वर

`zod-v4-mocks` एक [MCP (Model Context Protocol)](https://modelcontextprotocol.io) सर्वर प्रदान करता है ताकि AI एजेंट आपके Zod schema से mock डेटा खोज और जेनरेट कर सकें। यह **stdio** पर MCP बोलता है और CLI से शुरू होता है:

```bash
npx zod-v4-mocks mcp
```

## क्लाइंट में रजिस्टर करना

किसी भी MCP क्लाइंट (Claude Desktop, Cursor, आदि) को इस पैकेज की ओर इंगित करें:

```json
{
  "mcpServers": {
    "zod-v4-mocks": {
      "command": "npx",
      "args": ["-y", "zod-v4-mocks", "mcp"]
    }
  }
}
```

पाथ उस डायरेक्टरी के सापेक्ष हल होते हैं जहाँ सर्वर शुरू हुआ था, इसलिए क्लाइंट की working directory को अपने प्रोजेक्ट रूट पर सेट करें (या टूल्स को absolute path दें)।

## Schema अनुबंध: फ़ाइल पाथ

Zod schema को JSON से सटीक रूप से पुनर्निर्मित नहीं किया जा सकता, इसलिए — ठीक [`generate` CLI कमांड](/hi/guide/cli-and-config-file) की तरह — schema को **फ़ाइल पाथ** से संदर्भित किया जाता है: एक JS/ESM मॉड्यूल जो Zod schema export करता है, साथ में export नाम। TypeScript मॉड्यूल सीधे लोड नहीं होते; पहले `.js` / `.mjs` में बिल्ड करें।

working directory में मौजूद `zod-v4-mocks.config.{ts,js,mjs}` अपने-आप खोज लिया जाता है (या `config` से दें), और `profile` से `base` / `cli` / `test` चुनें (डिफ़ॉल्ट `cli`)।

## टूल्स

| टूल | इनपुट | यह क्या करता है |
|---|---|---|
| `usage` | — | सर्वर, फ़ाइल-पाथ अनुबंध और सामान्य वर्कफ़्लो समझाता है। अनिश्चित होने पर पहले इसे कॉल करें। |
| `list_schemas` | `{ module }` | मॉड्यूल द्वारा export किए गए सभी Zod schema नाम सूचीबद्ध करता है। इन्हें `export` आर्ग्युमेंट के रूप में उपयोग करें। |
| `preflight` | `{ module, export?, config?, profile? }` | डेटा जेनरेट किए **बिना** [pre-flight जाँच](/hi/guide/schema-support) चलाता है, और उन संरचनाओं की रिपोर्ट करता है जिन्हें सुरक्षित रूप से mock नहीं किया जा सकता (`error`) या जो `.parse()` पास न करें / अपने-आप ठीक की गई हों (`warning`)। |
| `generate_mock` | `{ module, export?, count?, seed?, locale?, format?, pretty?, config?, profile? }` | mock डेटा जेनरेट करता है, `json` (डिफ़ॉल्ट) / `ts` / `js` में लौटाता है। `count > 1` पर array, `seed` से आउटपुट deterministic होता है। |

## सामान्य वर्कफ़्लो

1. **`list_schemas`** `{ module: "./dist/schemas.js" }` — exports खोजें।
2. **`preflight`** `{ module: "./dist/schemas.js", export: "User" }` — (वैकल्पिक) पुष्टि करें कि schema सुरक्षित रूप से mock हो सकता है।
3. **`generate_mock`** `{ module: "./dist/schemas.js", export: "User", count: 5, seed: 42 }` — डेटा जेनरेट करें।

## वैकल्पिक निर्भरता

सर्वर [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) पर आधारित है, जिसे **optionalDependency** के रूप में घोषित किया गया है ताकि यह उन उपयोगकर्ताओं पर थोपा न जाए जिन्हें केवल कोर जेनरेटर चाहिए। `npx` इसे अपने-आप इंस्टॉल कर देता है; यदि कभी अनुपस्थित हो, तो `mcp` कमांड इंस्टॉल निर्देश दिखाता है:

```bash
npm install @modelcontextprotocol/sdk
```

## अगले कदम

- [CLI और कॉन्फ़िग फ़ाइल](/hi/guide/cli-and-config-file) - `generate` कमांड और साझा config
- [Schema सपोर्ट](/hi/guide/schema-support) - preflight किसके लिए जाँच करता है
- [API संदर्भ](/hi/api/) - मेथड-स्तरीय संदर्भ
