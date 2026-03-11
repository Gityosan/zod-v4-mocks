import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outdir = resolve(__dirname, '../public/types')
const nodeModules = resolve(__dirname, '../../node_modules')

mkdirSync(outdir, { recursive: true })

function readDtsFile(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

function collectDtsFiles(dir: string, prefix: string): Array<{ moduleName: string; content: string }> {
  const results: Array<{ moduleName: string; content: string }> = []

  function walk(currentDir: string, currentPrefix: string) {
    for (const entry of readdirSync(currentDir)) {
      const fullPath = resolve(currentDir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath, `${currentPrefix}/${entry}`)
      } else if (entry.endsWith('.d.ts') && !entry.endsWith('.d.cts')) {
        const moduleName = `${currentPrefix}/${entry.replace('.d.ts', '')}`
        results.push({ moduleName, content: readFileSync(fullPath, 'utf-8') })
      }
    }
  }

  walk(dir, prefix)
  return results
}

// Collect all .d.ts files from zod's internal modules
const zodCoreDts = collectDtsFiles(resolve(nodeModules, 'zod/v4/core'), 'zod/v4/core')
const zodClassicDts = collectDtsFiles(resolve(nodeModules, 'zod/v4/classic'), 'zod/v4/classic')

// Build the combined types file
let zodTypes = ''

for (const { moduleName, content } of [...zodCoreDts, ...zodClassicDts]) {
  const cleaned = content
    .replace(/from\s+["']\.\/([^"']+)["']/g, (_, p: string) => {
      const base = moduleName.substring(0, moduleName.lastIndexOf('/'))
      return `from "${base}/${p.replace(/\.js$/, '')}"`
    })
    .replace(/from\s+["']\.\.\/([^"']+)["']/g, (_, p: string) => {
      const base = moduleName.substring(0, moduleName.lastIndexOf('/'))
      const parent = base.substring(0, base.lastIndexOf('/'))
      return `from "${parent}/${p.replace(/\.js$/, '')}"`
    })
    .replace(/import\s+["']\.\/([^"']+)["']/g, (_, p: string) => {
      const base = moduleName.substring(0, moduleName.lastIndexOf('/'))
      return `import "${base}/${p.replace(/\.js$/, '')}"`
    })
    .replace(/import\s+["']\.\.\/([^"']+)["']/g, (_, p: string) => {
      const base = moduleName.substring(0, moduleName.lastIndexOf('/'))
      const parent = base.substring(0, base.lastIndexOf('/'))
      return `import "${parent}/${p.replace(/\.js$/, '')}"`
    })

  zodTypes += `declare module "${moduleName}" {\n${cleaned}\n}\n\n`
}

// Add the main zod module
const zodMainDts = readDtsFile(resolve(nodeModules, 'zod/index.d.ts'))
const cleanedMain = zodMainDts
  .replace(/from\s+["']\.\/v4\/classic\/([^"']+)["']/g, (_, p: string) => {
    return `from "zod/v4/classic/${p.replace(/\.js$/, '')}"`
  })

zodTypes += `declare module "zod" {\n${cleanedMain}\n}\n`

writeFileSync(resolve(outdir, 'zod.d.ts'), zodTypes, 'utf-8')
console.log(`Generated zod.d.ts (${(zodTypes.length / 1024).toFixed(1)} KB)`)

// --- zod-v4-mocks types ---
const mocksWrapped = `declare module "zod-v4-mocks" {
  import { z } from 'zod';

  export type LocaleType = string;

  export interface Faker {
    [key: string]: any;
  }

  export interface Randomizer {
    next(): number;
    seed(seed: number | number[]): void;
  }

  export type GeneraterOptions = {
    faker: Faker;
    config: MockConfig;
    customGenerator?: CustomGeneratorType;
    registry: any;
    valueStore?: Map<string, unknown[]>;
    arrayIndexes: number[];
    pinnedHierarchy: Map<string, number>;
    circularRefs: Map<z.core.$ZodType, number>;
  };

  export type CustomGeneratorType = (
    schema: z.core.$ZodType,
    options: GeneraterOptions,
  ) => unknown;

  export interface MockConfig {
    locale?: LocaleType | LocaleType[];
    randomizer?: Randomizer;
    seed: number;
    array: { min: number; max: number };
    map: { min: number; max: number };
    set: { min: number; max: number };
    record: { min: number; max: number };
    optionalProbability: number;
    nullableProbability: number;
    defaultProbability: number;
    lazyDepthLimit: number;
    recursiveDepthLimit?: number;
    consistentKey?: string;
  }

  export type OutputOptions = {
    path?: string;
    ext?: "json" | "js" | "ts";
  };

  export declare class MockGenerator {
    constructor(config?: Partial<MockConfig>);
    updateConfig(newConfig?: Partial<MockConfig>): MockGenerator;
    supply(constructor: z.core.$constructor<any>, value: any): MockGenerator;
    override(customGenerator: CustomGeneratorType): MockGenerator;
    register(schemas: z.ZodType[]): this;
    generate<T extends z.ZodType>(schema: T): z.infer<T>;
    multiGenerate<T extends Record<string, z.ZodType>>(schemas: T): {
      [K in keyof T]: z.infer<T[K]>;
    };
    output(data: unknown, options?: OutputOptions): string;
  }

  export declare function initGenerator(config?: Partial<MockConfig>): MockGenerator;
}
`

writeFileSync(resolve(outdir, 'zod-v4-mocks.d.ts'), mocksWrapped, 'utf-8')
console.log(`Generated zod-v4-mocks.d.ts (${(mocksWrapped.length / 1024).toFixed(1)} KB)`)
