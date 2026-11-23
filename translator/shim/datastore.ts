// @api/DataStore -> phoenix.storage (per-plugin JSON KV, persisted on change).
// Equicord's DataStore is an async IndexedDB kv (get/set/del/keys/update). phoenix.storage is
// sync; we wrap it in resolved promises so plugin `await` code works unchanged.

export function get<T = unknown>(key: IDBValidKey): Promise<T | undefined> {
  return Promise.resolve(phoenix.storage.get<T>(String(key)));
}
export function set(key: IDBValidKey, value: unknown): Promise<void> {
  phoenix.storage.set(String(key), value);
  return Promise.resolve();
}
export function del(key: IDBValidKey): Promise<void> {
  phoenix.storage.delete(String(key));
  return Promise.resolve();
}
export function keys(): Promise<string[]> {
  return Promise.resolve(phoenix.storage.keys());
}
export async function getMany<T = unknown>(k: IDBValidKey[]): Promise<(T | undefined)[]> {
  return k.map((key) => phoenix.storage.get<T>(String(key)));
}
export async function update<T = unknown>(
  key: IDBValidKey,
  updater: (old: T | undefined) => T,
): Promise<void> {
  phoenix.storage.set(String(key), updater(phoenix.storage.get<T>(String(key))));
}
export async function createStore() {
  /* single namespace per plugin already */
}

export const DataStore = { get, set, del, keys, getMany, update, createStore };
export default DataStore;

// Equicord's Settings "SettingsStore" / IndexedDB stores aren't needed here.
export type IDBValidKey = string | number;
