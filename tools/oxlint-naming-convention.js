// Local oxlint JS plugin: a type-info-free port of the subset of
// `@typescript-eslint/naming-convention` this project used with ESLint.
// The upstream rule always requests parser services (type information),
// which oxlint's JS plugin runtime does not provide, so it cannot be loaded
// directly. The selectors/format/underscore semantics below mirror the
// previous `eslint.config.js` configuration:
//
//   default               camelCase              leading `_` allowed
//   variable              camelCase              leading/trailing `_` allowed
//   variable (const, module scope)
//                         camelCase|PascalCase|UPPER_CASE
//   function              camelCase|PascalCase
//   parameter, import     camelCase|PascalCase   leading/trailing `_` allowed
//                         (import = default/namespace imports only)
//   typeLike              PascalCase
//   typeProperty          camelCase|PascalCase   leading `_`/`__` allowed
//   objectLiteralProperty (not checked)

const isCamelCase = (n) =>
  n.length === 0 || (n[0] === n[0].toLowerCase() && !n.includes('_'));
const isPascalCase = (n) =>
  n.length === 0 || (n[0] === n[0].toUpperCase() && !n.includes('_'));
const isUpperCase = (n) => n === n.toUpperCase() && !n.includes('__');

const FORMATS = {
  camelCase: isCamelCase,
  PascalCase: isPascalCase,
  UPPER_CASE: isUpperCase,
};

const RULES = {
  default: { formats: ['camelCase'], leading: 'single' },
  variable: { formats: ['camelCase'], leading: 'single', trailing: 'single' },
  globalConst: {
    formats: ['camelCase', 'PascalCase', 'UPPER_CASE'],
    leading: 'single',
    trailing: 'single',
  },
  function: { formats: ['camelCase', 'PascalCase'] },
  parameter: {
    formats: ['camelCase', 'PascalCase'],
    leading: 'single',
    trailing: 'single',
  },
  import: {
    formats: ['camelCase', 'PascalCase'],
    leading: 'single',
    trailing: 'single',
  },
  typeLike: { formats: ['PascalCase'] },
  typeProperty: { formats: ['camelCase', 'PascalCase'], leading: 'double' },
};

const LABELS = {
  default: 'Identifier',
  variable: 'Variable',
  globalConst: 'Variable',
  function: 'Function',
  parameter: 'Parameter',
  import: 'Import',
  typeLike: 'Type',
  typeProperty: 'Type Property',
};

function trim(name, rule) {
  let n = name;
  if (rule.leading === 'double' && n.startsWith('__')) n = n.slice(2);
  else if (
    (rule.leading === 'single' || rule.leading === 'double') &&
    n.startsWith('_')
  )
    n = n.slice(1);
  if (rule.trailing === 'single' && n.endsWith('_')) n = n.slice(0, -1);
  return n;
}

function patternIdentifiers(node, out = []) {
  if (!node) return out;
  switch (node.type) {
    case 'Identifier':
      out.push(node);
      break;
    case 'ObjectPattern':
      for (const p of node.properties) {
        patternIdentifiers(
          p.type === 'RestElement' ? p.argument : p.value,
          out,
        );
      }
      break;
    case 'ArrayPattern':
      for (const e of node.elements) patternIdentifiers(e, out);
      break;
    case 'AssignmentPattern':
      patternIdentifiers(node.left, out);
      break;
    case 'RestElement':
      patternIdentifiers(node.argument, out);
      break;
    case 'TSParameterProperty':
      patternIdentifiers(node.parameter, out);
      break;
  }
  return out;
}

function keyName(node) {
  if (node.computed) return null;
  const { key } = node;
  if (key.type === 'Identifier') return key.name;
  return null; // quoted / numeric keys are left alone
}

function isModuleScope(declaration) {
  let p = declaration.parent;
  if (
    p &&
    (p.type === 'ExportNamedDeclaration' ||
      p.type === 'ExportDefaultDeclaration')
  )
    p = p.parent;
  return !!p && p.type === 'Program';
}

const namingConvention = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce the project naming convention (type-info-free).',
    },
    schema: [],
  },
  create(context) {
    const check = (node, name, kind) => {
      if (typeof name !== 'string' || name.length === 0) return;
      const rule = RULES[kind];
      const trimmed = trim(name, rule);
      if (rule.formats.some((f) => FORMATS[f](trimmed))) return;
      context.report({
        node,
        message: `${LABELS[kind]} name \`${name}\` must match one of the following formats: ${rule.formats.join(', ')}`,
      });
    };
    const checkParams = (fn) => {
      for (const param of fn.params) {
        for (const id of patternIdentifiers(param))
          check(id, id.name, 'parameter');
      }
    };

    return {
      VariableDeclarator(node) {
        const decl = node.parent;
        const kind =
          decl.kind === 'const' && isModuleScope(decl)
            ? 'globalConst'
            : 'variable';
        for (const id of patternIdentifiers(node.id)) check(id, id.name, kind);
      },
      FunctionDeclaration(node) {
        if (node.id) check(node.id, node.id.name, 'function');
        checkParams(node);
      },
      TSDeclareFunction(node) {
        if (node.id) check(node.id, node.id.name, 'function');
        checkParams(node);
      },
      FunctionExpression: checkParams,
      ArrowFunctionExpression: checkParams,
      TSEmptyBodyFunctionExpression: checkParams,
      ImportDefaultSpecifier(node) {
        check(node.local, node.local.name, 'import');
      },
      ImportNamespaceSpecifier(node) {
        check(node.local, node.local.name, 'import');
      },
      ClassDeclaration(node) {
        if (node.id) check(node.id, node.id.name, 'typeLike');
      },
      ClassExpression(node) {
        if (node.id) check(node.id, node.id.name, 'typeLike');
      },
      TSInterfaceDeclaration(node) {
        check(node.id, node.id.name, 'typeLike');
      },
      TSTypeAliasDeclaration(node) {
        check(node.id, node.id.name, 'typeLike');
      },
      TSEnumDeclaration(node) {
        check(node.id, node.id.name, 'typeLike');
      },
      TSTypeParameter(node) {
        const name =
          typeof node.name === 'string' ? node.name : node.name?.name;
        check(node, name, 'typeLike');
      },
      TSPropertySignature(node) {
        check(node.key, keyName(node), 'typeProperty');
      },
      TSMethodSignature(node) {
        check(node.key, keyName(node), 'default');
      },
      PropertyDefinition(node) {
        if (node.key.type === 'PrivateIdentifier')
          check(node.key, node.key.name, 'default');
        else check(node.key, keyName(node), 'default');
      },
      MethodDefinition(node) {
        if (node.kind === 'constructor') return;
        if (node.key.type === 'PrivateIdentifier')
          check(node.key, node.key.name, 'default');
        else check(node.key, keyName(node), 'default');
      },
      // objectLiteralMethod falls back to the `default` selector
      // (only plain objectLiteralProperty is exempt).
      Property(node) {
        if (node.parent.type !== 'ObjectExpression' || node.kind !== 'init')
          return;
        const isMethod =
          node.method ||
          node.value.type === 'FunctionExpression' ||
          node.value.type === 'ArrowFunctionExpression';
        if (isMethod) check(node.key, keyName(node), 'default');
      },
      TSEnumMember(node) {
        if (node.id.type === 'Identifier')
          check(node.id, node.id.name, 'default');
      },
    };
  },
};

export default {
  meta: { name: 'project' },
  rules: { 'naming-convention': namingConvention },
};
