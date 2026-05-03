export interface TagItem {
  id: string;
  name: string;
}

export interface ListTagsResult {
  tags: TagItem[];
}

export const LIST_TAGS_USE_CASE = 'LIST_TAGS_USE_CASE';

export interface ListTagsUseCase {
  execute(): Promise<ListTagsResult>;
}
