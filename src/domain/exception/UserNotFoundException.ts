export class UserNotFoundException extends Error {
  constructor() {
    super('使用者不存在');
    this.name = 'UserNotFoundException';
  }
}
