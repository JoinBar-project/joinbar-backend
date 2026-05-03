export class MessageNotFoundException extends Error {
  constructor() {
    super('留言不存在');
    this.name = 'MessageNotFoundException';
  }
}
