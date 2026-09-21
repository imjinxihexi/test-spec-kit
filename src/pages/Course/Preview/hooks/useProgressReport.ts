import { $t } from "@/i18n";
import { useEffect, useRef, useCallback } from 'react';
import { updateCoursewareProgress } from '@/api/xp-evi-learning-student-eu-boot/progress';
interface UseProgressReportOptions {
  enabled: boolean;
  coursewareCode: number | null;
  interval?: number;
  /** 获取当前位置（PDF/PPT 返回页码，视频返回秒数）。不传时默认使用累计观看秒数 */
  getCurrentPosition?: () => number;
  onProgressUpdate?: (result: {
    coursewareCode: number;
    progress: number;
    isCompleted: boolean;
  }) => void;
}

/**
 * 定时上报课件学习进度（非 SCORM 课件使用）
 * - enabled=true 时启动定时器
 * - 每 interval 毫秒上报一次
 * - 切换课件或卸载时清理定时器并重置计时
 */
export function useProgressReport({
  enabled,
  coursewareCode,
  interval = 30000,
  getCurrentPosition,
  onProgressUpdate
}: UseProgressReportOptions) {
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;
  const getCurrentPositionRef = useRef(getCurrentPosition);
  getCurrentPositionRef.current = getCurrentPosition;
  const report = useCallback(async () => {
    if (!coursewareCode) return;
    const now = Date.now();
    const elapsed = Math.floor((now - startTimeRef.current) / 1000);
    accumulatedRef.current += elapsed;
    startTimeRef.current = now;
    try {
      const position = getCurrentPositionRef.current ? getCurrentPositionRef.current() : accumulatedRef.current;
      const res = await updateCoursewareProgress({
        coursewareCode,
        currentPosition: position,
        watchDuration: accumulatedRef.current
      });
      if (res.code === 200 && res.data) {
        onProgressUpdateRef.current?.({
          coursewareCode,
          progress: res.data.progress,
          isCompleted: res.data.isCompleted
        });
      }
    } catch (error) {
      console.error($t("[useProgressReport] 上报进度失败:"), error);
    }
  }, [coursewareCode]);
  useEffect(() => {
    if (!enabled || !coursewareCode) return;

    // 重置计时
    startTimeRef.current = Date.now();
    accumulatedRef.current = 0;

    // 启动定时器
    timerRef.current = setInterval(report, interval);

    /**
     * 页面级离开兜底（关标签页 / 刷新 / 跳转到站外）。
     *
     * 必要性：这些场景下整个 JS 运行时被销毁，React 不会执行下面的 cleanup，
     * 那次"离开时上报"压根不会触发 —— 最坏会丢掉一个 interval（30s）的进度。
     * 与 useWatchTimer（PDF/PPT 链路）的做法保持一致。
     *
     * 已知局限：beforeunload 中的异步请求可能来不及发出即被浏览器中断。
     * 更稳的方案是 navigator.sendBeacon，但它只能发 POST 且不能自定义 header，
     * 需先确认接口鉴权方式兼容，故此处先与既有链路对齐，不引入额外变量。
     */
    const handleBeforeUnload = () => { report(); };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // 离开时上报一次（SPA 内部路由跳转 / 组件卸载走这里）
      report();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, coursewareCode, interval, report]);
}