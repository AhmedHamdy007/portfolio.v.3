import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Keep source downloads intact. Remove unused image payloads from the two
// models whose materials are art-directed at runtime, preserving animation.
const sources = [
  ['low_poly_crystal_game_ready_asset.glb', 'crystal.glb'],
  ['wandering_asteroids_of_andromeda.glb', 'asteroids.glb'],
]
const output = resolve('public/models/album')
mkdirSync(output, { recursive: true })
for (const [source, name] of sources) {
  const file = readFileSync(resolve('public/models', source))
  const jsonLength = file.readUInt32LE(12)
  const document = JSON.parse(file.subarray(20, 20 + jsonLength).toString())
  const binary = file.subarray(28 + jsonLength)
  const imageViews = new Set((document.images ?? []).map(image => image.bufferView))
  const mapping = new Map()
  const chunks = []
  let offset = 0
  document.bufferViews = document.bufferViews.flatMap((view, index) => {
    if (imageViews.has(index)) return []
    mapping.set(index, mapping.size)
    const data = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
    const padding = Buffer.alloc((4 - data.length % 4) % 4)
    chunks.push(data, padding)
    const result = { ...view, byteOffset: offset }
    offset += data.length + padding.length
    return [result]
  })
  for (const accessor of document.accessors ?? []) {
    if (accessor.bufferView !== undefined) accessor.bufferView = mapping.get(accessor.bufferView)
    if (accessor.sparse) {
      accessor.sparse.indices.bufferView = mapping.get(accessor.sparse.indices.bufferView)
      accessor.sparse.values.bufferView = mapping.get(accessor.sparse.values.bufferView)
    }
  }
  if (name === 'asteroids.glb') {
    // Convert the old specular-glossiness extension into supported glTF PBR,
    // retaining the original surface colors in separately resized textures.
    document.materials = document.materials.map((material, i) => ({
      name: material.name,
      pbrMetallicRoughness: { baseColorTexture: { index: i * 3 }, metallicFactor: 0, roughnessFactor: 0.92 },
      normalTexture: { index: i * 3 + 1, scale: 0.85 },
      occlusionTexture: { index: i * 3 + 2, strength: 1 },
    }))
    document.images = document.materials.flatMap((_, i) => [{ uri: `asteroid-color-${i}.jpg` }, { uri: `asteroid-normal-${i}.png` }, { uri: `asteroid-ao-${i}.jpg` }])
    document.textures = document.images.map((_, i) => ({ source: i }))
  } else {
    document.materials = [{ name: 'Album runtime material', pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 } }]
    for (const mesh of document.meshes) for (const primitive of mesh.primitives) primitive.material = 0
    delete document.images
    delete document.textures
  }
  delete document.samplers
  document.extensionsUsed = (document.extensionsUsed ?? []).filter(name => !name.startsWith('KHR_materials_'))
  document.extensionsRequired = (document.extensionsRequired ?? []).filter(name => !name.startsWith('KHR_materials_'))
  document.buffers = [{ byteLength: offset }]
  document.asset.extras.modifications = name === 'asteroids.glb' ? 'PBR conversion; resized original color and normal maps. Geometry and animation retained.' : 'Removed embedded textures; custom album materials. Geometry retained.'
  const rawJson = Buffer.from(JSON.stringify(document))
  const json = Buffer.concat([rawJson, Buffer.alloc((4 - rawJson.length % 4) % 4, 32)])
  const bin = Buffer.concat(chunks)
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + json.length + bin.length, 8)
  header.writeUInt32LE(json.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  writeFileSync(resolve(output, name), Buffer.concat([header, json, binHeader, bin]))
  console.log(`${name}: ${(file.length / 1024).toFixed(0)} KB → ${((28 + json.length + bin.length) / 1024).toFixed(0)} KB`)
}
