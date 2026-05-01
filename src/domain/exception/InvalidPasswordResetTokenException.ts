export class InvalidPasswordResetTokenException extends Error {
  constructor() {
    super('密碼重設 token 無效或已過期');
    this.name = 'InvalidPasswordResetTokenException';
  }
}
