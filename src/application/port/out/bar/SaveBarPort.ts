import { BarTagsInput } from '../../in/bar/CreateBarUseCase';
import { BarData } from './FindBarPort';

export interface CreateBarData {
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

export interface UpdateBarData {
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

export const SAVE_BAR_PORT = 'SAVE_BAR_PORT';

export interface SaveBarPort {
  create(data: CreateBarData): Promise<string>;
  update(barId: string, data: UpdateBarData): Promise<BarData>;
  softDelete(barId: string): Promise<void>;
}
