export class InvalidCurrentPasswordException extends Error {
  constructor() {
    super('舊密碼錯誤');
    this.name = 'InvalidCurrentPasswordException';
  }
}
