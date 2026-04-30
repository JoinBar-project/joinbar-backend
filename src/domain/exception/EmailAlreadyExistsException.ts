export class EmailAlreadyExistsException extends Error {
  constructor() {
    super('Email 已被註冊');
    this.name = 'EmailAlreadyExistsException';
  }
}
