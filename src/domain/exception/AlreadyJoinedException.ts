export class AlreadyJoinedException extends Error {
  constructor() {
    super('已報名此活動');
    this.name = 'AlreadyJoinedException';
  }
}
