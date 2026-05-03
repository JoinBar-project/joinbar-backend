export class InvalidTagException extends Error {
  constructor() {
    super('包含無效的標籤名稱');
    this.name = 'InvalidTagException';
  }
}
