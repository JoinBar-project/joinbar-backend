export interface GetBarCommand {
  barId: string;
}

export interface GetBarResult {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const GET_BAR_USE_CASE = 'GET_BAR_USE_CASE';

export interface GetBarUseCase {
  execute(command: GetBarCommand): Promise<GetBarResult>;
}
