import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, relative, extname } from 'node:path'

// Local lab server only: per-response latency/bandwidth, or one failed model.
// Not an Internet-facing server and not an exact shared-bandwidth 4G emulator.
const root = resolve('dist')
const port = Number(process.env.LAB_PORT ?? 4175)
const latency = Number(process.env.LAB_LATENCY_MS ?? 0)
const bytesPerSecond = Number(process.env.LAB_KBPS ?? 0) * 1024
const fail = process.env.LAB_FAIL_ASSET ?? ''
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff': 'font/woff', '.ttf': 'font/ttf' }
const delay = ms => new Promise(done => setTimeout(done, ms))
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (fail && pathname.includes(fail)) { res.writeHead(503); res.end('Simulated asset failure'); return }
    let path = resolve(root, `.${pathname}`)
    if (relative(root, path).startsWith('..')) { res.writeHead(403); res.end(); return }
    if (pathname.endsWith('/')) path = resolve(path, 'index.html')
    await stat(path)
    let encoded = false
    if (req.headers['accept-encoding']?.includes('gzip')) {
      try { await stat(`${path}.gz`); encoded = true } catch { /* original file */ }
    }
    const body = await readFile(encoded ? `${path}.gz` : path)
    await delay(latency)
    res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store', ...(encoded ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}) })
    const chunk = bytesPerSecond ? Math.max(1024, bytesPerSecond / 10) : body.length
    for (let offset = 0; offset < body.length && !res.destroyed; offset += chunk) {
      res.write(body.subarray(offset, offset + chunk))
      if (bytesPerSecond) await delay(100)
    }
    res.end()
  } catch { if (!res.headersSent) res.writeHead(404); res.end('Not found') }
}).listen(port, '127.0.0.1', () => console.log(`Local production lab: http://127.0.0.1:${port} · ${latency}ms latency · ${bytesPerSecond || 'unlimited'} bytes/s per response · fail=${fail || 'none'}`))
