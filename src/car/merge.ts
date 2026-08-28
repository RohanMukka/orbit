import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * three's merge helper refuses to mix indexed and non-indexed inputs, and the
 * primitives we build wheels and body furniture from are a mix of both — so
 * flatten everything to non-indexed with just the attributes we care about.
 */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone()
    for (const key of Object.keys(n.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') n.deleteAttribute(key)
    }
    if (!n.attributes.normal) n.computeVertexNormals()
    if (!n.attributes.uv) {
      const count = n.attributes.position.count
      n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2))
    }
    return n
  })
  const merged = mergeGeometries(flat, false)
  flat.forEach((g) => g.dispose())
  if (!merged) throw new Error('merge failed')
  merged.computeBoundingSphere()
  return merged
}
