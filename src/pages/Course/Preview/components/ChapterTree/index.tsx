import { useState } from 'react';
import { DownOutlined, LeftOutlined, RightOutlined, FileTextOutlined, LockOutlined, CheckCircleFilled, DownloadOutlined } from '@ant-design/icons';
import type { ChapterWithContents } from '@/api/xp-evi-learning-admin-eu-boot/course';
import type { PreviewMode } from '../../store';
import type { CoursewareProgress, ChapterLockInfo } from '../../utils/computeChapterLocks';
import styles from './index.module.less';

interface ChapterTreeProps {
  chapters: ChapterWithContents[];
  selectedCoursewareCode: number | null;
  onSelectCourseware: (coursewareCode: number) => void;
  mode?: PreviewMode;
  coursewareProgressMap?: Map<number, CoursewareProgress>;
  chapterLockMap?: Map<number, ChapterLockInfo>;
  downloadTypeMap?: Map<number, number>;
  coursewareFileTypeMap?: Map<number, string>;
  downloadingCode?: number | null;
  onDownload?: (coursewareCode: number) => void;
}

export default function ChapterTree({
  chapters,
  selectedCoursewareCode,
  onSelectCourseware,
  mode = 'preview',
  coursewareProgressMap,
  chapterLockMap,
  downloadTypeMap,
  coursewareFileTypeMap,
  downloadingCode,
  onDownload,
}: ChapterTreeProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
    new Set(chapters.map((ch) => ch.id))
  );
  const [collapsed, setCollapsed] = useState(false);

  const isStudyMode = mode === 'study';

  const toggleChapter = (chapterId: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  return (
    <div className={`${styles.chapterTree} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!collapsed && chapters.some((ch) => ch.id !== 0 || !!ch.name) && (
          <span>Chapters</span>
        )}
        <span
          className={styles.collapseBtn}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <RightOutlined /> : <LeftOutlined />}
        </span>
      </div>
      {!collapsed && <div className={styles.chapters}>
        {chapters.map((chapter) => {
          const isExpanded = expandedChapters.has(chapter.id);
          const isVirtual = chapter.id === 0 && !chapter.name;
          const isLocked = isStudyMode && (chapterLockMap?.get(chapter.id)?.locked ?? false);

          return (
            <div key={chapter.id} className={styles.chapter}>
              {!isVirtual && (
                <div
                  className={`${styles.chapterTitle} ${isLocked ? styles.locked : ''}`}
                  onClick={() => toggleChapter(chapter.id)}
                >
                  {isLocked ? (
                    <LockOutlined className={styles.lockIcon} />
                  ) : (
                    <DownOutlined
                      className={
                        isExpanded ? styles.iconExpanded : styles.iconCollapsed
                      }
                    />
                  )}
                  <span>{chapter.name}</span>
                </div>
              )}
              {(isVirtual || isExpanded) && (
                <div className={styles.contents}>
                  {chapter.contents.map((content) => {
                    const coursewareCode = content.coursewareCode;
                    const isActive = coursewareCode === selectedCoursewareCode;
                    const cwProgress = coursewareProgressMap?.get(coursewareCode);
                    const isCompleted = cwProgress?.isCompleted ?? false;
                    const progressValue = cwProgress?.progress ?? 0;

                    return (
                      <div
                        key={content.id}
                        className={`${styles.contentItem} ${isActive ? styles.active : ''} ${isLocked ? styles.disabled : ''}`}
                        onClick={() => onSelectCourseware(coursewareCode)}
                      >
                        <FileTextOutlined className={styles.icon} />
                        <span className={styles.name}>{content.coursewareName}</span>
                        {(() => {
                          const dt = downloadTypeMap?.get(coursewareCode);
                          const ft = coursewareFileTypeMap?.get(coursewareCode);
                          const isDownloadableType = ft === 'pdf' || ft === 'ppt' || ft === 'image'
                            || ft === '1' || ft === '3' || ft === '6'; // CoursewareType numeric fallback
                          // preview mode: PPT/PDF/Image always downloadable; study mode: respect downloadType
                          const canDownload = !isStudyMode
                            ? isDownloadableType
                            : (dt === 1 || dt === 2);
                          const isDownloading = downloadingCode === coursewareCode;
                          if (!canDownload) return null;
                          return (
                            <DownloadOutlined
                              className={`${styles.downloadIcon} ${isDownloading ? styles.downloadingIcon : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDownloading) onDownload?.(coursewareCode);
                              }}
                            />
                          );
                        })()}
                        {isStudyMode && (
                          <span className={styles.progress}>
                            {isCompleted ? (
                              <CheckCircleFilled className={styles.completedIcon} />
                            ) : (
                              `${progressValue}%`
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </div>
  );
}
