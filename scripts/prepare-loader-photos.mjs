// One-time asset generation. Originals and full-size album images are untouched.
// Usage: node scripts/prepare-loader-photos.mjs [absolute path to the sharp entry module]
import { readFileSync, mkdirSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
const { default: sharp } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'sharp')
const code = ts.transpileModule(readFileSync('src/constants/album.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const { DRIFT_MOMENTS } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
const indices = [2, 1, 4, 6, 7, 8, 10, 3]
mkdirSync('public/loader', { recursive: true })
let before = 0, after = 0
for (const index of indices) {
  const source = 'public' + DRIFT_MOMENTS[index].src
  const destination = `public/loader/memory-${index}.webp`
  await sharp(source).rotate().resize(500, 625, { fit: 'cover', position: 'centre' }).webp({ quality: 84 }).toFile(destination)
  before += statSync(source).size; after += statSync(destination).size
}
console.log(JSON.stringify({ images: indices.length, beforeBytes: before, afterBytes: after, savedPercent: Math.round((1 - after / before) * 100) }))
