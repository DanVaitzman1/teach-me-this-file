// An error that is safe to show to the client: it carries an HTTP status
// and a stable machine-readable code the UI can react to.
export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
