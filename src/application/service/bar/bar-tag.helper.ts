import { BAR_TAG_KEYS, BarTagsData } from '../../port/out/bar/FindBarPort';

/** BarTag レコードから true のタグ名一覧を返す / 將 BarTag 記錄轉換為 true 標籤名稱陣列 */
export const toTagNames = (barTag: BarTagsData | null): string[] => {
  if (!barTag) return [];
  return BAR_TAG_KEYS.filter((key) => barTag[key]);
};
