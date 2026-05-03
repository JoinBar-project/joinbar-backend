export class ForbiddenOperationException extends Error {
  constructor(message?: string) {
    super(message ?? '操作不允許');
    this.name = 'ForbiddenOperationException';
  }
}
