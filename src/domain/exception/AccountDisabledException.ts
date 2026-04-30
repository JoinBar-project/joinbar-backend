export class AccountDisabledException extends Error {
  constructor() {
    super('帳號已停用');
    this.name = 'AccountDisabledException';
  }
}
