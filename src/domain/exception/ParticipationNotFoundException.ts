export class ParticipationNotFoundException extends Error {
  constructor() {
    super('報名記錄不存在');
    this.name = 'ParticipationNotFoundException';
  }
}
