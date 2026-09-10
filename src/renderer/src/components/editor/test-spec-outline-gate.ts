import { detectLanguage } from '@/lib/language-detect'

const SPEC_BASENAME_RE = /\.(spec|test)\.[^.]+$/i

// Why: keep the outline off untitled drafts and non-test code to bound parse cost and panel noise.
export function isTestSpecFile(relativePath: string, resolvedLanguage: string): boolean {
  if (resolvedLanguage !== 'typescript' && resolvedLanguage !== 'javascript') {
    return false
  }
  const parts = relativePath.split(/[\\/]/)
  const basename = parts.at(-1) ?? ''
  return SPEC_BASENAME_RE.test(basename)
}

export function detectTestSpecLanguage(filePath: string): string {
  return detectLanguage(filePath)
}
