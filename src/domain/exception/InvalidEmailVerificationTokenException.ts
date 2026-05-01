export class InvalidEmailVerificationTokenException extends Error {
  constructor() {
    super('Email 驗證 token 無效或已過期');
    this.name = 'InvalidEmailVerificationTokenException';
  }
}
