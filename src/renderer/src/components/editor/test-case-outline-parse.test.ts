import { describe, expect, it } from 'vitest'
import { parseTestCaseOutline } from './test-case-outline-parse'

describe('parseTestCaseOutline', () => {
  it('builds nested describe/it trees with 1-based lines', () => {
    const content = [
      'describe("login", () => {',
      '  it("rejects empty password", () => {});',
      '  it("locks after 3 attempts", () => {});',
      '});',
      'describe("signup", () => {',
      '  test("sends email", () => {});',
      '});'
    ].join('\n')
    const tree = parseTestCaseOutline(content)
    expect(tree).toHaveLength(2)
    expect(tree[0].kind).toBe('describe')
    expect(tree[0].line).toBe(1)
    expect(tree[0].children.map((c) => c.title)).toEqual([
      'rejects empty password',
      'locks after 3 attempts'
    ])
    expect(tree[0].children[0].line).toBe(2)
    expect(tree[1].children[0].kind).toBe('it')
  })

  it('captures skip/only/each/todo modifiers', () => {
    const content = [
      'describe.skip("slow", () => {',
      "  it.only('fast', () => {});",
      '  test.each([[1]])("case %i", () => {});',
      '  it.todo("later");',
      '});'
    ].join('\n')
    const tree = parseTestCaseOutline(content)
    expect(tree[0].modifier).toBe('skip')
    expect(tree[0].children.map((c) => c.modifier)).toEqual(['only', 'each', 'todo'])
  })

  it('ignores matches inside comments and normalizes CRLF', () => {
    const content =
      '// it("ghost", () => {});\r\ndescribe("real", () => {\r\n  /* test("hidden") */\r\n  it("shown", () => {});\r\n});'
    const tree = parseTestCaseOutline(content)
    expect(tree).toHaveLength(1)
    expect(tree[0].title).toBe('real')
    expect(tree[0].children.map((c) => c.title)).toEqual(['shown'])
  })

  it('returns empty for files without tests', () => {
    expect(parseTestCaseOutline('const x = 1;\n')).toEqual([])
    expect(parseTestCaseOutline('')).toEqual([])
  })
})
