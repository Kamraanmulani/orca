import type { TestOutlineNode } from './test-case-outline-parse'

export function collectTestOutlineParentIds(items: TestOutlineNode[]): Set<string> {
  const parentIds = new Set<string>()

  function visit(nodes: TestOutlineNode[]): void {
    for (const item of nodes) {
      if (item.children.length > 0) {
        parentIds.add(item.id)
        visit(item.children)
      }
    }
  }

  visit(items)
  return parentIds
}

export function pruneTestOutlineCollapsedIds(
  collapsedIds: ReadonlySet<string>,
  items: TestOutlineNode[]
): Set<string> {
  const parentIds = collectTestOutlineParentIds(items)
  const next = new Set<string>()
  for (const id of collapsedIds) {
    if (parentIds.has(id)) {
      next.add(id)
    }
  }
  return next
}

export function toggleTestOutlineCollapsedId(
  collapsedIds: ReadonlySet<string>,
  id: string
): Set<string> {
  const next = new Set(collapsedIds)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

export function isTestOutlineItemExpanded(
  collapsedIds: ReadonlySet<string>,
  item: TestOutlineNode
): boolean {
  return item.children.length === 0 || !collapsedIds.has(item.id)
}
