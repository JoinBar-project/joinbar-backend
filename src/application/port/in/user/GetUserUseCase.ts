export interface GetUserCommand {
  userId: string;
}

export interface GetUserResult {
  id: string;
  email: string | null;
  username: string;
  nickname: string | null;
  role: string;
  birthday: Date | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export const GET_USER_USE_CASE = 'GET_USER_USE_CASE';

export interface GetUserUseCase {
  execute(command: GetUserCommand): Promise<GetUserResult>;
}
