export class InvalidRefreshTokenException extends Error {
  constructor() {
    super('Refresh token 無效或已過期');
    this.name = 'InvalidRefreshTokenException';
  }
}
