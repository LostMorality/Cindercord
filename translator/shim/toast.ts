// showToast / Toasts -> phoenix.ui.toast

export const Toasts = {
  Type: { MESSAGE: 0, SUCCESS: 1, FAILURE: 2, CUSTOM: 3 },
  Position: { TOP: 0, BOTTOM: 1 },
  genId: () => Math.random().toString(36).slice(2),
  show(opts: { message: string }) {
    phoenix.ui.toast(opts.message);
  },
  pop() {},
};

export function showToast(message: string, _type?: number, _opts?: unknown) {
  phoenix.ui.toast(typeof message === "string" ? message : String(message));
}

export default { Toasts, showToast };
