export interface DeleteAvatarCommand {
  userId: string;
}

export const DELETE_AVATAR_USE_CASE = 'DELETE_AVATAR_USE_CASE';

export interface DeleteAvatarUseCase {
  execute(command: DeleteAvatarCommand): Promise<void>;
}
