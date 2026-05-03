export interface DeleteBarCommand {
  barId: string;
}

export const DELETE_BAR_USE_CASE = 'DELETE_BAR_USE_CASE';

export interface DeleteBarUseCase {
  execute(command: DeleteBarCommand): Promise<void>;
}
