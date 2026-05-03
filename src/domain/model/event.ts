/**
 * 活動 Domain Entity
 *
 * 業務不變條件：
 * - name 不可為空白
 * - endAt 必須晚於 startAt
 * - maxPeople 若有值必須 > 0
 */
export class Event {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string | null,
    readonly barId: string | null,
    readonly barName: string,
    readonly location: string,
    readonly startAt: Date,
    readonly endAt: Date,
    readonly maxPeople: number | null,
    readonly imageUrl: string | null,
    readonly price: number | null,
    readonly hostUser: string,
    readonly deletedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  /** 活動是否仍可報名（未軟刪除且尚未結束） */
  isActive(): boolean {
    return this.deletedAt === null && this.endAt > new Date();
  }

  /** 是否已達人數上限 */
  isFull(currentCount: number): boolean {
    if (this.maxPeople === null) return false;
    return currentCount >= this.maxPeople;
  }
}
