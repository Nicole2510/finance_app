// Throw this from a route to send a specific status and message,
// e.g. throw new HttpError(404, "Category not found")
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
