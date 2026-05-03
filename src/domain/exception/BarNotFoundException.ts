export class BarNotFoundException extends Error {
  constructor() {
    super('酒吧不存在');
    this.name = 'BarNotFoundException';
  }
}
