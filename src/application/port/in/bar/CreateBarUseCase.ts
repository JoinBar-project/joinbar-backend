import { GetBarResult } from './GetBarUseCase';

export interface BarTagsInput {
  sport?: boolean;
  music?: boolean;
  student?: boolean;
  bistro?: boolean;
  drink?: boolean;
  joy?: boolean;
  romantic?: boolean;
  oldschool?: boolean;
  highlevel?: boolean;
  easy?: boolean;
}

export interface CreateBarCommand {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  tags?: BarTagsInput;
}

/** 建立後回傳與 GetBarResult 相同結構 */
export type CreateBarResult = GetBarResult;

export const CREATE_BAR_USE_CASE = 'CREATE_BAR_USE_CASE';

export interface CreateBarUseCase {
  execute(command: CreateBarCommand): Promise<CreateBarResult>;
}
