export class CliError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.name = "CliError";
    this.code = code;
  }
}

export function fail(message, code = 1) {
  throw new CliError(message, code);
}
