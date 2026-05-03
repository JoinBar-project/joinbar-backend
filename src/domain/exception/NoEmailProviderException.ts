export class NoEmailProviderException extends Error {
  constructor() {
    super('此帳號未設定 EMAIL 登入，無法更換密碼');
    this.name = 'NoEmailProviderException';
  }
}
