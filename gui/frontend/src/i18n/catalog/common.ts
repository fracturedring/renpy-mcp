/**
 * Shared UI vocabulary.
 *
 * Keep this to strings used by three or more surfaces. A string used by
 * one panel belongs in that panel's namespace, not here — shared buckets
 * tend to grow into a dumping ground that nobody dares delete from.
 */

const en = {
  cancel: "Cancel",
  close: "Close",
  save: "Save",
  saving: "Saving…",
  loading: "Loading…",
  working: "Working…",
  edit: "Edit",
  back: "Back",
  error: "Error",
  noMatches: "no matches",
};

export type CommonKey = keyof typeof en;

const zhHans: Record<CommonKey, string> = {
  cancel: "取消",
  close: "关闭",
  save: "保存",
  saving: "保存中…",
  loading: "加载中…",
  working: "处理中…",
  edit: "编辑",
  back: "返回",
  error: "错误",
  noMatches: "无匹配项",
};

export const common = { en, "zh-Hans": zhHans };
