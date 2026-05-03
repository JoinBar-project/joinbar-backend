import { BarTagsData } from '../../port/out/bar/FindBarPort';

const BAR_TAG_KEYS: (keyof BarTagsData)[] = [
  'sport',
  'music',
  'student',
  'bistro',
  'drink',
  'joy',
  'romantic',
  'oldschool',
  'highlevel',
  'easy',
];

/** BarTag レコードから true のタグ名一覧を返す / 將 BarTag 記錄轉換為 true 標籤名稱陣列 */
export const toTagNames = (barTag: BarTagsData | null): string[] => {
  if (!barTag) return [];
  return BAR_TAG_KEYS.filter((key) => barTag[key]);
};
