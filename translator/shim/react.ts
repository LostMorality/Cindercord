// Minimal React stub. Phoenix has no DOM/React, so plugin settings panels that build React
// components do not render; this exists so plugin code that imports React still loads and its
// non-UI logic runs. createElement returns a plain descriptor that our UI layer ignores.

type Element = { $$typeof: symbol; type: unknown; props: Record<string, unknown>; key: unknown };
const ELEMENT = Symbol.for("phoenix.react.element");

export function createElement(type: unknown, props?: Record<string, unknown>, ...children: unknown[]): Element {
  return { $$typeof: ELEMENT, type, props: { ...(props ?? {}), children }, key: (props?.key as unknown) ?? null };
}
export const Fragment = Symbol.for("phoenix.react.fragment");

// Hooks: run once, no re-render machinery. Enough for simple deterministic components.
export function useState<T>(init: T | (() => T)): [T, (v: T) => void] {
  const value = typeof init === "function" ? (init as () => T)() : init;
  return [value, () => {}];
}
export function useEffect(fn: () => void | (() => void)) {
  try {
    fn();
  } catch { /* ignore */ }
}
export function useLayoutEffect(fn: () => void | (() => void)) {
  useEffect(fn);
}
export function useRef<T>(init: T): { current: T } {
  return { current: init };
}
export function useMemo<T>(factory: () => T): T {
  return factory();
}
export function useCallback<T>(cb: T): T {
  return cb;
}
export function useReducer<S>(_r: unknown, init: S): [S, (a: unknown) => void] {
  return [init, () => {}];
}
export function memo<T>(c: T): T {
  return c;
}
export function forwardRef<T>(c: T): T {
  return c;
}
export function useContext() {
  return undefined;
}
export function createContext<T>(d: T) {
  return { Provider: Fragment, Consumer: Fragment, _currentValue: d };
}

export const React = {
  createElement,
  Fragment,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
  memo,
  forwardRef,
  useContext,
  createContext,
};
export default React;
