// FluxDispatcher -> phoenix gateway hooks.
// Equicord keys actions by SCREAMING_SNAKE ("MESSAGE_CREATE"); phoenix.gateway keys by
// camelCase ("messageCreate"). We translate, subscribe through phoenix.on (fires after the
// client handled the event, like a Flux store would), and keep a local listener set so
// plugin-driven dispatch() still reaches plugin subscribers.

export type FluxAction = { type: string; [k: string]: unknown };
export type FluxCallback = (action: FluxAction) => void;

const subscribers = new Map<string, Set<FluxCallback>>();
const wired = new Set<string>();

export function actionToGatewayKey(type: string): string {
  // MESSAGE_CREATE -> messageCreate
  return type
    .toLowerCase()
    .split("_")
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}

function wire(type: string) {
  if (wired.has(type)) return;
  wired.add(type);
  const key = actionToGatewayKey(type);
  const sig = (phoenix.gateway as Record<string, unknown>)[key];
  if (!sig) {
    phoenix.log.warn(`[Flux] gateway event ${type} (${key}) not found on this build`);
    return;
  }
  phoenix.on(sig as never, (payload: unknown) => {
    const action: FluxAction = { type, ...(payload as object) };
    emitLocal(action);
  });
}

function emitLocal(action: FluxAction) {
  const set = subscribers.get(action.type);
  if (!set) return;
  for (const cb of [...set]) {
    try {
      cb(action);
    } catch (e) {
      phoenix.log.error(`[Flux] subscriber for ${action.type} failed:`, String(e));
    }
  }
}

export const FluxDispatcher = {
  subscribe(type: string, cb: FluxCallback) {
    let set = subscribers.get(type);
    if (!set) subscribers.set(type, (set = new Set()));
    set.add(cb);
    wire(type);
  },
  unsubscribe(type: string, cb: FluxCallback) {
    subscribers.get(type)?.delete(cb);
  },
  dispatch(action: FluxAction) {
    // Notify local subscribers now, and try to feed the client's own handler.
    emitLocal(action);
    const sig = (phoenix.gateway as Record<string, unknown>)[actionToGatewayKey(action.type)];
    if (sig) {
      try {
        phoenix.enqueue(sig as never, action as never);
      } catch { /* enqueue only valid for registry events */ }
    }
    return Promise.resolve();
  },
  dispatchToLastSubscribed() {
    return Promise.resolve();
  },
  isDispatching() {
    return false;
  },
  wait(cb: () => void) {
    cb();
  },
  // Equicord plugins sometimes add/remove interceptors; unsupported, accepted as no-ops.
  addInterceptor() {},
};

export default FluxDispatcher;

// Minimal Flux.Store base for plugins that subclass it.
export class FluxStore {
  private cbs = new Set<() => void>();
  constructor(_dispatcher?: unknown, _actions?: Record<string, FluxCallback>) {}
  addChangeListener(cb: () => void) {
    this.cbs.add(cb);
  }
  removeChangeListener(cb: () => void) {
    this.cbs.delete(cb);
  }
  emitChange() {
    for (const cb of [...this.cbs]) cb();
  }
}

export const Flux = {
  Dispatcher: class {
    subscribe = FluxDispatcher.subscribe;
    unsubscribe = FluxDispatcher.unsubscribe;
    dispatch = FluxDispatcher.dispatch;
  },
  Store: FluxStore,
};
