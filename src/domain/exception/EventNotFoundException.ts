export class EventNotFoundException extends Error {
  constructor() {
    super('活動不存在');
    this.name = 'EventNotFoundException';
  }
}
