import { useSyncExternalStore } from 'react'

export interface Paint {
  id: string
  name: string
  code: string
  color: string
  flake: string
  finish: 'gloss' | 'satin' | 'chrome'
}

export const PAINTS: Paint[] = [
  { id: 'ember', name: 'Ember Flare', code: 'OR-01', color: '#ff4d1c', flake: '#ffb37a', finish: 'gloss' },
  { id: 'void', name: 'Void Black', code: 'OR-02', color: '#0b0b0d', flake: '#4a4d57', finish: 'gloss' },
  { id: 'glacier', name: 'Glacier Satin', code: 'OR-03', color: '#c9d3da', flake: '#ffffff', finish: 'satin' },
  { id: 'cobalt', name: 'Deep Cobalt', code: 'OR-04', color: '#17307a', flake: '#6f92ff', finish: 'gloss' },
  { id: 'moss', name: 'Verdant', code: 'OR-05', color: '#1d3b2a', flake: '#7ad6a0', finish: 'satin' },
  { id: 'liquid', name: 'Liquid Metal', code: 'OR-06', color: '#8f949c', flake: '#ffffff', finish: 'chrome' },
]

export const RIMS = [
  { id: 'graphite', name: 'Graphite', color: '#2a2c31', metal: 1, rough: 0.35 },
  { id: 'polished', name: 'Polished', color: '#cfd4da', metal: 1, rough: 0.09 },
  { id: 'bronze', name: 'Bronze', color: '#8a5a24', metal: 1, rough: 0.28 },
] as const

export type ViewMode = 'render' | 'clay' | 'wire'

export const VIEWS: { id: ViewMode; name: string }[] = [
  { id: 'render', name: 'Render' },
  { id: 'clay', name: 'Clay' },
  { id: 'wire', name: 'Blueprint' },
]

export interface Store {
  view: ViewMode
  paint: Paint
  rim: (typeof RIMS)[number]
  night: boolean
  spin: boolean
  chapter: number
  progress: number
  loaded: boolean
  entered: boolean
}

const urlView = new URLSearchParams(location.search).get('view') as ViewMode | null
/** ?view=clay pins the surface mode so the chapter script can't override it. */
export const viewLocked = !!urlView && VIEWS.some((v) => v.id === urlView)

let state: Store = {
  view: urlView && VIEWS.some((v) => v.id === urlView) ? urlView : 'render',
  paint: PAINTS[0],
  rim: RIMS[0],
  night: false,
  spin: true,
  chapter: 0,
  progress: 0,
  loaded: false,
  entered: false,
}

const listeners = new Set<() => void>()

export function set(patch: Partial<Store>) {
  let changed = false
  for (const k of Object.keys(patch) as (keyof Store)[]) {
    if (state[k] !== patch[k]) changed = true
  }
  if (!changed) return
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => state

export function useStore<T>(selector: (s: Store) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot())
  )
}

/** Read outside React (render loop) without triggering re-renders. */
export const peek = () => state
