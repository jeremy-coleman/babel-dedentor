import type { PluginObj, PluginItem, PluginPass, PluginOptions } from "@babel/core"
import type * as babelTypes from "@babel/types"
import type { Expression, TemplateElement, Identifier } from "@babel/types"
import invariant from "tiny-invariant"
import { last } from "lodash"

const { name } = require("../package.json")

const ensureArray = <T>(value?: T | null): T[] =>
  Array.isArray(value) ? value : value == null ? [] : [value]

/** Helper function to check whether an identifier matches a given name. */
type IdentifierCheckHelper = (
  expression: Expression,
  name: string
) => expression is Identifier

type DedentPluginOptions = {
  /** Default is `dedent` */
  tagName: string | string[]
  /** Default is false */
  keepFunctionCall?: boolean
  /** Default is true */
  trimLeft?: boolean
  /** Default is true */
  trimRight?: boolean

  /**
   * Custom predicate function to indicate whether a function call should be dedented.
   * The presence of this function nullifies
   * the `tagName` field.
   * @param callee `CallExpression.callee` or `TaggedTemplateExpression.tag`
   * @param t `@babel/types` helper module
   * @param matchIdentifier Helper function to check whether an identifier matches a given name.
   */
  shouldDedent?(
    callee: Expression,
    t: typeof babelTypes,
    matchIdentifier: IdentifierCheckHelper
  ): boolean
}

export function useDedentPlugin(
  options: string | string[] | DedentPluginOptions
): PluginItem {
  return Array.isArray(options) || typeof options === "string"
    ? [name, { tagName: options }]
    : [name, options]
}

export default function pluginDedent(babel: {
  types: typeof babelTypes
}): PluginObj<PluginPass & { opts: PluginOptions & DedentPluginOptions }> {
  const t = babel.types

  const identifierChecker: IdentifierCheckHelper = (callee, name): callee is Identifier =>
    t.isIdentifier(callee, { name })

  return {
    visitor: {
      CallExpression(path, { opts }) {
        const { node } = path
        if (
          opts.shouldDedent
            ? opts.shouldDedent(node.callee as Expression, t, identifierChecker)
            : t.isIdentifier(node.callee) &&
              ensureArray(opts.tagName).includes(node.callee.name)
        ) {
          const [arg] = node.arguments
          if (t.isTemplateLiteral(arg)) {
            transform(arg.quasis, opts)
            if (!opts.keepFunctionCall) path.replaceWith(arg)
          } else if (t.isTaggedTemplateExpression(arg)) {
            transform(arg.quasi.quasis, opts)
            if (!opts.keepFunctionCall) path.replaceWith(arg)
          }
        }
      },
      TaggedTemplateExpression(path, { opts }) {
        const { node } = path

        if (
          opts.shouldDedent
            ? opts.shouldDedent(node.tag, t, identifierChecker)
            : t.isIdentifier(node.tag) &&
              ensureArray(opts.tagName).includes(node.tag.name)
        ) {
          transform(node.quasi.quasis, opts)
          if (!opts.keepFunctionCall) path.replaceWith(node.quasi)
        }
      },
    },
  }
}

function replaceQuasi(
  value: TemplateElement["value"],
  pattern: RegExp,
  replacement: string
) {
  value.raw = value.raw.replace(pattern, replacement)
  value.cooked = value.cooked?.replace(pattern, replacement)
}

function transform(quasis: TemplateElement[], opts: DedentPluginOptions) {
  invariant(quasis.every(e => e.type === "TemplateElement"))

  if (opts.trimRight ?? true) {
    trimRight(last(quasis)!)
  }

  const matches = quasis
    .map(q => q.value.raw.match(/\n[\t ]+/g))
    .filter((x): x is NonNullable<typeof x> => x != null)
    .flat(1)

  if (matches.length) {
    const size = Math.min(...matches.map(value => value.length - 1))
    const pattern = RegExp(`\n[\t ]{${size}}`, "g")

    for (const { value } of quasis) {
      replaceQuasi(value, pattern, "\n")
    }
  }

  if (opts.trimLeft ?? true) {
    leftTrim(quasis[0])
  }
}

function leftTrim({ value }: TemplateElement) {
  const pattern = /^\r?\n/
  if (pattern.test(value.raw)) {
    replaceQuasi(value, pattern, "")
  }
}

function trimRight({ value }: TemplateElement) {
  const match = value.raw.match(/\r?\n([\t ]*)$/)?.[1]
  if (match) {
    replaceQuasi(value, RegExp(`\r?\n[\t ]{${match.length}}$`), "")
  }
}
