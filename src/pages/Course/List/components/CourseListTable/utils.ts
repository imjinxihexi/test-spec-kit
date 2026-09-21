import { $t } from "@/i18n";
import dayjs from 'dayjs';

/**
 * 格式化时长（秒 → 分钟）
 * @param seconds - 秒数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return $t("0分钟");
  const minutes = Math.round(seconds / 60);
  return $t("{{minutes}}分钟", {
    minutes
  });
}

/**
 * 格式化日期时间
 * @param dateStr - 日期字符串
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
}