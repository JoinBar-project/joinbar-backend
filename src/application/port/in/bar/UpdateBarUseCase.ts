import { BarTagsInput } from './CreateBarUseCase';
import { GetBarResult } from './GetBarUseCase';

export interface UpdateBarCommand {
  barId: string;
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  tags?: BarTagsInput;
}

/** 更新後回傳與 GetBarResult 相同結構 */
export type UpdateBarResult = GetBarResult;

export const UPDATE_BAR_USE_CASE = 'UPDATE_BAR_USE_CASE';

export interface UpdateBarUseCase {
  execute(command: UpdateBarCommand): Promise<UpdateBarResult>;
}
