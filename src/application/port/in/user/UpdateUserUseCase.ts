import { GetUserResult } from './GetUserUseCase';

export interface UpdateUserCommand {
  userId: string;
  username?: string;
  nickname?: string;
  birthday?: Date;
}

/** 更新後回傳與 GetUserResult 相同結構 */
export type UpdateUserResult = GetUserResult;

export const UPDATE_USER_USE_CASE = 'UPDATE_USER_USE_CASE';

export interface UpdateUserUseCase {
  execute(command: UpdateUserCommand): Promise<UpdateUserResult>;
}
