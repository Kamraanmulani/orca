export type TestOutlineKind = 'describe' | 'it'

export type TestOutlineModifier = 'each' | 'skip' | 'only' | 'todo'

export type TestOutlineNode = {
  children: TestOutlineNode[]
  id: string
  kind: TestOutlineKind
  line: number
  modifier?: TestOutlineModifier
  title: string
}

const MAX_TEST_OUTLINE_NODES = 2000

const CALL_RE =
  /(^|[^\w$.])(describe|it|test)(\.(each|skip|only|todo))*\s*\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/

const EACH_CALL_RE =
  /(^|[^\w$.])(describe|it|test)(\.(each|skip|only|todo))*\s*\([^)]*\)\s*\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/

function matchTestCall(code: string): {
  kind: TestOutlineKind
  modifier?: TestOutlineModifier
  title: string
} | null {
  const direct = CALL_RE.exec(code)
  // Why: test.each(data)(title) carries the title in a second call — retry there.
  const match = direct ?? EACH_CALL_RE.exec(code)
  if (!match) {
    return null
  }
  const modifier = /\.(each|skip|only|todo)(?=\.|$|\s*\()/.exec(match[3] ?? '')?.at(1) as
    | TestOutlineModifier
    | undefined
  return {
    kind: match[2] === 'describe' ? 'describe' : 'it',
    modifier,
    title: match[5] ?? match[6] ?? match[7] ?? ''
  }
}

// Why: a title containing `it(` inside a comment must not become a node.
function stripLineComment(line: string): string {
  let inSingle = false
  let inDouble = false
  let inTemplate = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\') {
      i++
      continue
    }
    if (!inSingle && !inDouble && !inTemplate && ch === '/' && line[i + 1] === '/') {
      return line.slice(0, i)
    }
    if (!inDouble && !inTemplate && ch === "'") {
      inSingle = !inSingle
    } else if (!inSingle && !inTemplate && ch === '"') {
      inDouble = !inDouble
    } else if (!inSingle && !inDouble && ch === '`') {
      inTemplate = !inTemplate
    }
  }
  return line
}

function slugTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function countBraces(line: string): number {
  let delta = 0
  let inSingle = false
  let inDouble = false
  let inTemplate = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\') {
      i++
      continue
    }
    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === "'") {
        inSingle = true
      } else if (ch === '"') {
        inDouble = true
      } else if (ch === '`') {
        inTemplate = true
      } else if (ch === '{') {
        delta++
      } else if (ch === '}') {
        delta--
      }
      continue
    }
    if (inSingle && ch === "'") {
      inSingle = false
    } else if (inDouble && ch === '"') {
      inDouble = false
    } else if (inTemplate && ch === '`') {
      inTemplate = false
    }
  }
  return delta
}

export function parseTestCaseOutline(content: string): TestOutlineNode[] {
  const normalized = content.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const roots: TestOutlineNode[] = []
  const stack: { depth: number; node: TestOutlineNode }[] = []
  let depth = 0
  let inBlockComment = false
  let nodeCount = 0
  const seenIds = new Set<string>()

  for (let index = 0; index < lines.length; index++) {
    let line = lines.at(index) ?? ''
    if (inBlockComment) {
      const end = line.indexOf('*/')
      if (end === -1) {
        continue
      }
      line = line.slice(end + 2)
      inBlockComment = false
    }
    const blockStart = line.indexOf('/*')
    if (blockStart !== -1) {
      const blockEnd = line.indexOf('*/', blockStart + 2)
      if (blockEnd === -1) {
        line = line.slice(0, blockStart)
        inBlockComment = true
      } else {
        line = line.slice(0, blockStart) + line.slice(blockEnd + 2)
      }
    }

    const code = stripLineComment(line)
    const parsed = matchTestCall(code)
    if (parsed && nodeCount < MAX_TEST_OUTLINE_NODES) {
      const title = parsed.title.trim()
      if (title) {
        const lineNo = index + 1
        const slug = slugTitle(title) || 'test'
        let id = `${lineNo}-${slug}`
        let suffix = 2
        while (seenIds.has(id)) {
          id = `${lineNo}-${slug}-${suffix}`
          suffix++
        }
        seenIds.add(id)
        const node: TestOutlineNode = {
          children: [],
          id,
          kind: parsed.kind,
          line: lineNo,
          modifier: parsed.modifier,
          title
        }
        while (stack.length > 0 && (stack.at(-1)?.depth ?? 0) >= depth) {
          stack.pop()
        }
        // Why: its attach to the nearest open describe; describes nest only under describes.
        const parent = stack.at(-1)?.node ?? null
        if (parsed.kind === 'describe' && (parent === null || parent.kind === 'describe')) {
          if (parent === null) {
            roots.push(node)
          } else {
            parent.children.push(node)
          }
          stack.push({ depth, node })
        } else if (parsed.kind === 'describe') {
          roots.push(node)
          stack.push({ depth, node })
        } else if (parent === null) {
          roots.push(node)
        } else {
          parent.children.push(node)
        }
        nodeCount++
      }
    }
    depth = Math.max(0, depth + countBraces(code))
    while (stack.length > 0 && (stack.at(-1)?.depth ?? 0) >= depth) {
      stack.pop()
    }
  }

  return roots
}
