//! src/configuration/secret.ts

/**
 * A wrapper that keeps a sensitive value out of logs and error reports.
 *
 * The inner value is only reachable through `exposeSecret()`, so every
 * read of the secret is greppable. `toString`, `toJSON` and the Node
 * inspection hook all redact, which means an accidental
 * `console.log(settings)` or `JSON.stringify(settings)` cannot leak it.
 *
 * This is the TypeScript counterpart of the `secrecy::Secret` type used by
 * the Rust project.
 */
export class Secret<T> {
  readonly #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  exposeSecret(): T {
    return this.#value;
  }

  toString(): string {
    return '[REDACTED]';
  }

  toJSON(): string {
    return '[REDACTED]';
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'Secret([REDACTED])';
  }
}
