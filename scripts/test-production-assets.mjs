import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync, gzipSync } from 'node:zlib'

const names = ['space_boi', '24_dizzying_space_travel_-_inktober2019', 'space_ame_camping_-_amelia_watson_hololive', 'tilt_brush_-_falling']
let rawTotal = 0, gzipTotal = 0
for (const name of names) {
  const bytes = readFileSync(`public/models/${name}.glb`)
  const gzip = gzipSync(bytes, { level: 9 })
  assert.deepEqual(gunzipSync(gzip), bytes, 'Lossless transport compression')
  rawTotal += bytes.length; gzipTotal += gzip.length
  console.log(`${name}: ${(bytes.length / 1e6).toFixed(2)} MB → ${(gzip.length / 1e6).toFixed(2)} MB gzip`)
}
assert(gzipTotal < rawTotal * 0.65, 'Story assets should compress by at least 35% without altering artwork')
const config = readFileSync('deploy/nginx.conf', 'utf8')
assert(config.includes('location ^~ /assets/'), 'Hashed asset caching must win over file-extension regex')
assert(config.includes('try_files $uri =404'), 'Missing GLBs must not receive HTML')
assert(config.includes('gzip_static on'))
const story = readFileSync('src/components/experience/album/AlbumJourneyScenes.tsx', 'utf8')
assert(!story.includes('PATHS.forEach'), 'No all-story preload burst on module import')
assert(story.includes('scrollProgress > 0.58'), 'Defer distant campsite')
const portal = readFileSync('src/components/experience/album/AlbumPortal.tsx', 'utf8')
assert(!portal.includes('EffectComposer'), 'The album cannot bypass portal blending with a fullscreen composer')
assert(!portal.includes('AlbumJourneyScenes') && !portal.includes('AlbumAtmosphere'), 'Unrelated GLB scenes must stay out of the active album')
assert(portal.includes('!entered.current'), 'Camera entry must finish before scroll takes over')
assert(portal.includes('AlbumAssetBoundary'), 'Asset failures must remain inside the album')
console.log(`Production asset checks passed: ${(rawTotal / 1e6).toFixed(2)} MB → ${(gzipTotal / 1e6).toFixed(2)} MB (${Math.round((1 - gzipTotal / rawTotal) * 100)}% smaller), byte-identical after decoding.`)
