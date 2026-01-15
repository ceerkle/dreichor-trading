export type ObserverErrorCode = "NOT_IMPLEMENTED" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL_ERROR";

export class ObserverError extends Error {
  public readonly code: ObserverErrorCode;

  public constructor(code: ObserverErrorCode, message: string) {
    super(message);
    this.name = "ObserverError";
    this.code = code;
  }
}

