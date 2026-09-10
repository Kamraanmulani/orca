import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TestSpecOutlinePanel } from './TestSpecOutlinePanel'
import { parseTestCaseOutline } from './test-case-outline-parse'

const sampleItems = parseTestCaseOutline(
  [
    'describe("login", () => {',
    '  it("rejects empty password", () => {});',
    '  it.skip("legacy", () => {});',
    '});'
  ].join('\n')
)

describe('TestSpecOutlinePanel', () => {
  it('renders the describe/it tree with modifiers and empty state', () => {
    const html = renderToStaticMarkup(
      <TestSpecOutlinePanel items={sampleItems} onClose={() => {}} onNavigate={() => {}} />
    )

    expect(html).toContain('Test Outline')
    expect(html).toContain('login')
    expect(html).toContain('rejects empty password')
    expect(html).toContain('skip')
    expect(html).toContain('Collapse login')
  })

  it('renders an empty state with no items', () => {
    const html = renderToStaticMarkup(
      <TestSpecOutlinePanel items={[]} onClose={() => {}} onNavigate={() => {}} />
    )

    expect(html).toContain('No test cases found')
  })
})
