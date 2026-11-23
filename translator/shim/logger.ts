// @utils/Logger -> phoenix.log

export class Logger {
  constructor(public name: string, public color?: string) {}
  private tag(args: unknown[]) {
    return [`[${this.name}]`, ...args];
  }
  log(...args: unknown[]) {
    phoenix.log.info(...this.tag(args));
  }
  info(...args: unknown[]) {
    phoenix.log.info(...this.tag(args));
  }
  warn(...args: unknown[]) {
    phoenix.log.warn(...this.tag(args));
  }
  error(...args: unknown[]) {
    phoenix.log.error(...this.tag(args));
  }
  debug(...args: unknown[]) {
    phoenix.log.debug(...this.tag(args));
  }
  errorCustomFmt(..._fmt: unknown[]) {
    /* no custom console formatting on Phoenix */
  }
}
export default Logger;
