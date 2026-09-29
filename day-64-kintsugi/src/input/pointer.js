// Screen ↔ world helpers for pointer interaction in the R3F scene.

import * as THREE from 'three'

const ndc = new THREE.Vector2()
const ray = new THREE.Raycaster()

/** Ray through a client-space point for the given camera + canvas. */
export function rayFromClient(clientX, clientY, camera, canvas) {
  const r = canvas.getBoundingClientRect()
  ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  return ray.ray
}

/** Intersect the client ray with a plane; returns false if parallel. */
export function pointOnPlane(clientX, clientY, camera, canvas, plane, out) {
  const r = rayFromClient(clientX, clientY, camera, canvas)
  return r.intersectPlane(plane, out) !== null
}

/** A vertical plane through `point`, facing the camera horizontally. */
export function facingPlane(camera, point, out = new THREE.Plane()) {
  const n = new THREE.Vector3()
  camera.getWorldDirection(n)
  n.y = 0
  if (n.lengthSq() < 1e-8) n.set(0, 0, -1)
  n.normalize().negate()
  return out.setFromNormalAndCoplanarPoint(n, point)
}

/** Project a world point to client pixels. */
export function toClient(p, camera, canvas, out = { x: 0, y: 0 }) {
  const v = project.copy(p).project(camera)
  const r = canvas.getBoundingClientRect()
  out.x = r.left + (v.x * 0.5 + 0.5) * r.width
  out.y = r.top + (-v.y * 0.5 + 0.5) * r.height
  out.z = v.z
  return out
}
const project = new THREE.Vector3()

/** Is this pointer event from a touch screen? */
export const isTouch = (e) => e.pointerType === 'touch'
