export interface TagData {
  id: string;
  name: string;
}

export const FIND_TAG_PORT = 'FIND_TAG_PORT';

export interface FindTagPort {
  findAll(): Promise<TagData[]>;
  findByNames(names: string[]): Promise<TagData[]>;
}
