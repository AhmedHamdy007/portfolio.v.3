import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

// Build artifacts only. Precompression avoids spending server CPU on GLBs.
async function compress(directory) {
  let raw = 0, packed = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      const result = await compress(path)
      raw += result.raw; packed += result.packed
    } else if (/\.(?:js|css|html|json|svg|glb|wasm|ttf)$/.test(entry.name)) {
      const source = await readFile(path)
      if (source.length < 1024) continue
      const gzip = gzipSync(source, { level: 9 })
      if (gzip.length >= source.length * 0.95) continue
      await writeFile(`${path}.gz`, gzip)
      raw += source.length; packed += gzip.length
    }
  }
  return { raw, packed }
}
const result = await compress('dist')
console.log(`Precompressed ${(result.raw / 1e6).toFixed(2)} MB → ${(result.packed / 1e6).toFixed(2)} MB. Originals retained for clients without gzip.`)
