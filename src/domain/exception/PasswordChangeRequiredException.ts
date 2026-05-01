export class PasswordChangeRequiredException extends Error {
  constructor() {
    super('密碼已過期，請先更新密碼');
    this.name = 'PasswordChangeRequiredException';
  }
}
