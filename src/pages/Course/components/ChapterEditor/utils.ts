import { $t } from "@/i18n";
import { Chapter } from './types';

/**
 * 校验章节名称
 * @param name 章节名称
 * @param chapters 所有章节列表
 * @param currentId 当前章节的 id 或 tempId（用于排除自身）
 * @returns 错误信息，无错误返回空字符串
 */
export function validateChapterName(name: string, chapters: Chapter[], currentId: string | number | undefined): string {
  // 检查是否为空
  if (!name || name.trim().length === 0) {
    return $t("章节名称不能为空");
  }

  // 检查长度
  if (name.length > 100) {
    return $t("章节名称长度不能超过100个字符");
  }

  // 检查是否重复（排除自身）
  const isDuplicate = chapters.some(chapter => {
    const chapterId = chapter.id;
    return chapterId !== currentId && chapter.name === name;
  });
  if (isDuplicate) {
    return $t("章节名称不能重复");
  }
  return '';
}

/**
 * 重新计算章节的 sort 字段
 * @param chapters 章节列表
 * @returns 重新排序后的章节列表（新数组）
 */
export function reorderChapters(chapters: Chapter[]): Chapter[] {
  return chapters.map((chapter, index) => ({
    ...chapter,
    sort: index + 1
  }));
}

/**
 * 获取章节的唯一标识（id 或 tempId）
 * @param chapter 章节对象
 * @returns 唯一标识
 */
export function getChapterId(chapter: Chapter): string | number {
  return chapter.id || '';
}