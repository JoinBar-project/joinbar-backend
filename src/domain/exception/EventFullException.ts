export class EventFullException extends Error {
  constructor() {
    super('活動人數已額滿');
    this.name = 'EventFullException';
  }
}
