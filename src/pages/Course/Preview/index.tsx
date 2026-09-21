import { $t } from "@/i18n";
import { useEffect, useReducer, useCallback, useState, useRef, useMemo } from 'react';
import { message, Spin, Modal } from 'antd';
import { useRequest } from 'ahooks';
import { getCourseDetail } from '@/api/xp-evi-learning-admin-eu-boot/course';
import { getCoursewareDetail, getCoursewareOpenLanguages } from '@/api/xp-evi-learning-admin-eu-boot/courseware';
import { getLearnerCourseDetail, learnerDownloadRequest } from '@/api/xp-evi-learning-student-eu-boot/course';
import type { LearnerCourseDetailResp } from '@/api/xp-evi-learning-student-eu-boot/course';
import CoursewareLearn from '@/pages/Courseware/Learn';
import { useNavigate } from '@/hooks/useRouterHook';
import { PreviewHeader, ChapterTree } from './components';
import { reducer, initialState } from './store';
import type { PreviewMode } from './store';
import type { ChapterWithContents } from '@/api/xp-evi-learning-admin-eu-boot/course';
import { Context } from './context';
import { downloadFileFromUrl } from '@/utils/download';
import styles from './index.module.less';
interface CoursePreviewProps {
  forceMode?: PreviewMode;
}
export default function CoursePreview({ forceMode }: CoursePreviewProps = {}) {
  // 缓存初始 URL 参数，防止页签切换时 window.location.search 变化导致参数丢失
  // lang:课程中心卡片点击时传入的"课程主语言"code(如 zh-HK),用于顶部语言下拉默认选中,
  //      优先级高于 UI 语言、chapters 里的第一个 langCode。
  const initialParamsRef = useRef<{ courseCode: number; mode: PreviewMode; planId: number | null; lang: string | null } | null>(null);
  if (!initialParamsRef.current) {
    const sp = new URLSearchParams(window.location.search);
    initialParamsRef.current = {
      courseCode: Number(sp.get('courseCode') || ''),
      mode: (sp.get('mode') as PreviewMode) || 'preview',
      planId: Number(sp.get('planId') || '') || null,
      lang: sp.get('lang') || null,
    };
  }
  const { courseCode, mode: urlMode, planId, lang: initialLangFromUrl } = initialParamsRef.current;
  const mode: PreviewMode = forceMode || urlMode;
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    mode,
    planId
  });
  const [downloadingCode, setDownloadingCode] = useState<number | null>(null);
  const navigate = useNavigate();

  // ============ 课程学习页 / 预览页 语言切换器 ============
  // study 模式:学员端接口 chapters 里每条 courseware 直接带 langCode/langVariants,原样存 ref
  // preview 模式:admin 端接口的 chapters.contents 也带同名字段(2026-07-24 新增),但结构不同
  //   —— 存原始 chapters(未按 groupCode 去重),用于切语言时查目标语言的 name。
  const studyRawChaptersRef = useRef<LearnerCourseDetailResp['learningCoursewareChapters']>([]);
  const previewRawChaptersRef = useRef<ChapterWithContents[]>([]);
  // 当前选中语言（初始为 null，加载完取"当前主 coursewareCode 对应的 langCode"）
  // 语言选择「按多语言分组(groupCode)记忆」：key=groupCode，value=用户为该组选择的语言。
  // 顶栏切语言只写入「当前选中课件所属组」→ 其它课件保持各自原语言；点回该课件时仍是之前选的语言(记忆生效)。
  const [langByGroup, setLangByGroup] = useState<Record<string, string>>({});
  // 语言 code → 展示名映射（用共享的 courseware-lang-codes 接口，62 种全量）
  const { data: langOptRes } = useRequest(getCoursewareOpenLanguages, {
    cacheKey: 'courseware-open-languages',
    staleTime: 5 * 60 * 1000,
  });
  // 语言展示名:课程学习页顶部下拉不带国家后缀(仅展示"日语/英语/繁体中文/..."),
  // 与弹窗/表格里的"带国家"版本区分开。直接用后端 native 名(item.value),code 兜底。
  const langNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (langOptRes?.code === 200 && Array.isArray(langOptRes.data)) {
      langOptRes.data.forEach(item => {
        map[item.code] = item.value || item.code;
      });
    }
    return map;
  }, [langOptRes]);
  // 顶栏语言下拉的候选:直接从当前选中课件的 langVariants 取。
  // 后端约定:langVariants 只包含"课程内实际挂了"的多语言课件(不覆盖组内课程未挂的语言),
  //   所以这里 keys 就是候选语言集。切语言的 remap 逻辑也依赖同一份 langVariants,自然一致。
  // 找当前选中课件:比对 coursewareCode 或 langVariants 里 value(切语言中间态时 selected 已换到新 code)。
  const currentCoursewareLangInfo = useMemo<{ langs: string[]; statusMap: Record<string, number>; groupCode: string; ownLang: string | null }>(() => {
    const selected = state.selectedCoursewareCode;
    const empty = { langs: [] as string[], statusMap: {} as Record<string, number>, groupCode: '', ownLang: null };
    if (selected == null) return empty;
    const findMatch = (langVariants: Record<string, number> | undefined | null, ownCode: number | undefined): boolean => {
      if (ownCode === selected) return true;
      if (!langVariants) return false;
      return Object.values(langVariants).includes(selected);
    };
    // 候选语言 = langVariants 的 keys(后端只给「整组已发布」) + 当前课件自身语言(去重)。
    // ⚠️ 必须并入自身语言:课程详情已对齐 develop 不再过滤停用课件,若当前选中的正是「停用」课件,
    //    它的语言不在 langVariants 里 → 顶栏 Select 的 value 不在 options 中 → antd 会直接显示原始 code
    //    (如 "fr-FR" 而非「法语」)。并入后顶栏能正确显示当前语言名,且仍可切到组内其它已发布语言。
    const mergeOwnLang = (variants: Record<string, number> | undefined | null, ownLang?: string | null): string[] => {
      const arr = variants ? Object.keys(variants) : [];
      if (ownLang && !arr.includes(ownLang)) arr.push(ownLang);
      return arr;
    };
    if (state.mode === 'study') {
      for (const ch of studyRawChaptersRef.current || []) {
        for (const cw of ch.coursewares) {
          if (findMatch(cw.langVariants, cw.coursewareCode)) {
            return {
              langs: mergeOwnLang(cw.langVariants, cw.langCode),
              statusMap: (cw.langStatusMap as Record<string, number>) || {},
              groupCode: cw.groupCode || '',
              ownLang: cw.langCode || null,
            };
          }
        }
      }
    } else {
      for (const ch of previewRawChaptersRef.current || []) {
        for (const c of ch.contents) {
          if (findMatch(c.langVariants, c.coursewareCode)) {
            return {
              langs: mergeOwnLang(c.langVariants, c.langCode),
              statusMap: (c.langStatusMap as Record<string, number>) || {},
              groupCode: c.groupCode || '',
              ownLang: c.langCode || null,
            };
          }
        }
      }
    }
    return empty;
  }, [state.selectedCoursewareCode, state.chapters, state.mode]);

  const courseLangs = currentCoursewareLangInfo.langs;
  const courseLangStatusMap = currentCoursewareLangInfo.statusMap;

  // 当前选中课件的语言 = 该课件所属多语言组的用户选择(langByGroup)，无记录则用课件自身语言。
  // 派生而非独立 state → 点到另一条课件时顶栏自动显示那条自己的语言，无需再做 fallback 同步。
  const selectedLang = langByGroup[currentCoursewareLangInfo.groupCode] ?? currentCoursewareLangInfo.ownLang;

  const handleDownload = useCallback(async (coursewareCode: number) => {
    if (downloadingCode) return;
    setDownloadingCode(coursewareCode);
    try {
      if (mode === 'study') {
        const res = await learnerDownloadRequest({
          bizKey: String(coursewareCode),
          downloadType: 'COURSEWARE',
        });
        if (res.code === 200 && res.data?.downloadUrl) {
          await downloadFileFromUrl(res.data.downloadUrl);
        } else {
          Modal.info({
            title: $t("下载任务已提交"),
            content: $t("请到下载中心查看"),
            okText: $t("确定"),
            onOk: () => { navigate('/download-center'); }
          });
        }
      } else {
        const res = await getCoursewareDetail(coursewareCode);
        if (res.code === 200 && (res.data?.downloadUrl || res.data?.url)) {
          // 优先用后端签好的下载地址（已带 Content-Disposition: attachment），保证原生下载而非内联播放
          await downloadFileFromUrl(res.data.downloadUrl || res.data.url, res.data.name);
        } else {
          message.error($t("获取下载地址失败"));
        }
      }
    } catch {
      message.error($t("下载请求失败"));
    } finally {
      setDownloadingCode(null);
    }
  }, [downloadingCode, navigate, mode]);

  // 加载课程详情
  useEffect(() => {
    if (!courseCode) {
      message.error($t("课程编码无效"));
      return;
    }
    const fetchCourseDetail = async () => {
      dispatch({
        type: 'SET_LOADING',
        payload: true
      });
      try {
        if (mode === 'study') {
          const res = await getLearnerCourseDetail(courseCode);
          // 接口数据直接平铺在根层级（非标准结构），兼容处理
          const studyData = res.data?.learningCoursewareChapters ? res.data : res as unknown as typeof res.data;
          if ((res.code === 200 || (res as unknown as {
            serverCode: number;
          }).serverCode === 200) && studyData?.learningCoursewareChapters) {
            // 保存学员端原始章节（含 langCode / langVariants），用于语言切换派生
            studyRawChaptersRef.current = studyData.learningCoursewareChapters;
            // 默认当前语言优先级:
            // 1) URL 里 lang 参数(课程中心卡片跳转时携带的"课程主语言")— 与卡片语言标签保持一致
            // 2) 组内第一条 langCode
            // 3) null(不显示切换器)
            // ⚠️ 已产品确认:不再回退到系统 UI 语言,避免用户从卡片进来看到与卡片不一致的默认语言
            const allCwLangs = studyData.learningCoursewareChapters
              .flatMap(ch => ch.coursewares)
              .map(cw => cw.langCode)
              .filter((l): l is string => !!l);
            // 初始语言:仅当 URL 带 lang(从课程中心卡片进入,代表课程主语言)且课程内存在该语言时,
            // 预置到所有多语言分组,保持"从卡片进来看到卡片语言"的既有体验;否则各课件显示自身语言。
            if (initialLangFromUrl && allCwLangs.includes(initialLangFromUrl)) {
              const initMap: Record<string, string> = {};
              studyData.learningCoursewareChapters
                .flatMap(ch => ch.coursewares)
                .forEach(cw => {
                  if (cw.groupCode) initMap[cw.groupCode] = initialLangFromUrl;
                });
              setLangByGroup(initMap);
            }
            dispatch({
              type: 'INIT_STUDY_COURSE',
              payload: studyData
            });
          } else {
            message.error(res.msg || $t("获取课程详情失败"));
            dispatch({
              type: 'SET_LOADING',
              payload: false
            });
          }
        } else {
          // 预览页与学员端、编辑页统一口径:返回课程挂载的全量课件(含发布中/失败/停用),
          // 与 develop 一致 —— 与「课程总时长」(含全量课件之和)分母对齐,避免总时长与列表对不上。
          // (后端 filterUnpublished 入参已废弃不生效,故不再传)
          const res = await getCourseDetail(courseCode);
          if (res.code === 200 && res.data) {
            // preview 模式:保留原始 chapters(未按 groupCode 去重),供切语言时查目标语言的 name
            // 兼容 hasChapter=false 的课程:数据挂在 coursewareContents,包一层虚拟章节塞入 ref
            const rawChapters: ChapterWithContents[] =
              (res.data.chapters && res.data.chapters.length > 0)
                ? res.data.chapters
                : ((res.data.coursewareContents && res.data.coursewareContents.length > 0)
                    ? [{ id: 0, name: '', sort: 0, contents: res.data.coursewareContents }]
                    : []);
            previewRawChaptersRef.current = rawChapters;
            // 默认语言:URL lang > raw chapters 里第一个 langCode > null
            const allCwLangs = rawChapters
              .flatMap(ch => ch.contents)
              .map(c => c.langCode)
              .filter((l): l is string => !!l);
            // 同 study:URL 带 lang 且课程内存在该语言时,预置到所有多语言分组;否则各课件显示自身语言
            if (initialLangFromUrl && allCwLangs.includes(initialLangFromUrl)) {
              const initMap: Record<string, string> = {};
              rawChapters.flatMap(ch => ch.contents).forEach(c => {
                if (c.groupCode) initMap[c.groupCode] = initialLangFromUrl;
              });
              setLangByGroup(initMap);
            }
            dispatch({
              type: 'INIT_COURSE',
              payload: res.data
            });
          } else {
            message.error(res.msg || $t("获取课程详情失败"));
            dispatch({
              type: 'SET_LOADING',
              payload: false
            });
          }
        }
      } catch (error) {
        message.error($t("获取课程详情失败"));
        dispatch({
          type: 'SET_LOADING',
          payload: false
        });
      }
    };
    fetchCourseDetail();
  }, [courseCode, mode]);

  const handleBack = () => {
    // 先停止当前页面所有视频/音频播放，只 pause 不清除 src（避免绕过 React 导致 DOM 不同步）
    document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(el => {
      if (!el.paused) el.pause();
    });
    window.dispatchEvent(new CustomEvent('app:closeTab', { detail: { path: window.location.pathname } }));
    window.xDragonBridge.closeTab();
    // 关闭当前页后显式回到来源页（宿主 closeTab 后默认激活哪个 tab 不确定，需显式跳转）。
    // study（学员学习）：带 planId 为培训项目详情进入 → 回 plan-detail；否则课程中心进入 → 回 course-center。
    // preview（管理端预览，从课程列表进入）：回 course/list。
    const backPath = mode === 'study'
      ? (planId
          ? `/main/smart-trains/learner/plan-detail?planId=${planId}`
          : '/main/smart-trains/course-center')
      : '/main/smart-trains/course/list';
    window.xDragonBridge.openNewTab({ path: backPath });
  };
  // ============ 按「各课件所属多语言组的语言选择」把 chapters 的 coursewareCode 映射为对应语言版本 ============
  // 规则：每条课件用 langByGroup[它的 groupCode] 决定目标语言（没记录 → 不映射，保持自身原语言）；
  //      顶栏切语言只写当前选中课件的组 → 只有那条会变，其它课件不受影响；
  //      目标语言命中不到（该组没这个语言版本）保留原 code —— 边界兜底，不让课件消失。
  // ⚠️ 位置约束：本段派生 memo 必须放在下面 handleSelectCourseware 之前 —— 因为 handleSelectCourseware 的
  //    useCallback 依赖数组引用了 remappedChapters；组件函数顺序执行时若 remappedChapters 声明在后，
  //    会因 const TDZ 抛 ReferenceError（Cannot access 'remappedChapters' before initialization）。
  const langRemapInfo = useMemo(() => {
    const codeMap = new Map<number, number>(); // 原 code → 新 code
    const nameMap = new Map<number, string>(); // 新 code → 目标语言课件名(用于左侧章节树同步换名)
    const codeToName = new Map<number, string>();
    if (state.mode === 'study') {
      // study 模式:从学员端 chapters.coursewares 里拿(code → name 全量表,含所有语言版本)
      for (const ch of studyRawChaptersRef.current || []) {
        for (const cw of ch.coursewares) codeToName.set(cw.coursewareCode, cw.name);
      }
      for (const ch of studyRawChaptersRef.current || []) {
        for (const cw of ch.coursewares) {
          // 该课件所属组的语言选择;无记录 → 不 remap(保持自身语言)
          const groupLang = cw.groupCode ? langByGroup[cw.groupCode] : undefined;
          if (!groupLang) continue;
          const target = cw.langVariants?.[groupLang];
          if (target && target !== cw.coursewareCode) {
            codeMap.set(cw.coursewareCode, target);
            // 目标语言课件名:优先课程内已挂课件的名;课程未挂该语言版本时用后端返回的 langVariantNames 兜底(否则回退原语言名)
            const targetName = codeToName.get(target) ?? cw.langVariantNames?.[groupLang];
            if (targetName) nameMap.set(target, targetName);
          }
        }
      }
    } else {
      // preview 模式:从 admin 端 chapters.contents 里拿(与 study 类似,只是字段名不同)
      for (const ch of previewRawChaptersRef.current || []) {
        for (const c of ch.contents) {
          if (c.coursewareName) codeToName.set(c.coursewareCode, c.coursewareName);
        }
      }
      for (const ch of previewRawChaptersRef.current || []) {
        for (const c of ch.contents) {
          const groupLang = c.groupCode ? langByGroup[c.groupCode] : undefined;
          if (!groupLang) continue;
          const target = c.langVariants?.[groupLang];
          if (target && target !== c.coursewareCode) {
            codeMap.set(c.coursewareCode, target);
            // 目标语言课件名:优先课程内已挂课件名;课程未挂该语言版本时用后端 langVariantNames 兜底
            const targetName = codeToName.get(target) ?? c.langVariantNames?.[groupLang];
            if (targetName) nameMap.set(target, targetName);
          }
        }
      }
    }
    return { codeMap, nameMap };
  }, [langByGroup, state.mode, state.chapters]);

  const remappedChapters: ChapterWithContents[] = useMemo(() => {
    if (langRemapInfo.codeMap.size === 0) return state.chapters;
    return state.chapters.map(ch => ({
      ...ch,
      contents: ch.contents.map(c => {
        const newCode = langRemapInfo.codeMap.get(c.coursewareCode);
        if (!newCode) return c;
        // 左侧章节树需跟随语言展示新名称:优先用目标语言的 name,拿不到则保留原名
        const newName = langRemapInfo.nameMap.get(newCode) ?? c.coursewareName;
        return { ...c, id: newCode, coursewareCode: newCode, coursewareName: newName };
      }),
    }));
  }, [state.chapters, langRemapInfo]);

  // 进度 map 也要按新 code 复制一份，否则切语言后每张卡显示为 0%（原 map 的 key 是原 code）
  const remappedProgressMap = useMemo(() => {
    if (langRemapInfo.codeMap.size === 0) return state.coursewareProgressMap;
    const next = new Map(state.coursewareProgressMap);
    langRemapInfo.codeMap.forEach((newCode, oldCode) => {
      const prog = state.coursewareProgressMap.get(oldCode);
      if (prog) next.set(newCode, prog);
    });
    return next;
  }, [state.coursewareProgressMap, langRemapInfo]);

  // 当前选中的 coursewareCode 也要映射到目标语言（否则右侧仍显示旧语言课件）
  const displayedSelectedCode = state.selectedCoursewareCode != null
    ? (langRemapInfo.codeMap.get(state.selectedCoursewareCode) ?? state.selectedCoursewareCode)
    : null;

  const handleSelectCourseware = useCallback((coursewareCode: number) => {
    // 学习模式下检查章节锁定
    // ⚠️ 用 remappedChapters（当前语言映射后的 chapters）匹配，因为传给 ChapterTree 的 code 是新的；
    //    章节 id 不变，chapterLockMap 的 key 仍是原章节 id，可继续使用。
    if (state.mode === 'study') {
      const chapter = remappedChapters.find(ch => ch.contents.some(c => c.coursewareCode === coursewareCode));
      if (chapter && state.chapterLockMap.get(chapter.id)?.locked) {
        message.warning($t("请先完成上一章节"));
        return;
      }
    }
    dispatch({
      type: 'SELECT_COURSEWARE',
      payload: coursewareCode
    });
  }, [state.mode, remappedChapters, state.chapterLockMap]);
  const handleProgressUpdate = useCallback((result: {
    coursewareCode: number;
    progress: number;
    isCompleted: boolean;
  }) => {
    dispatch({
      type: 'UPDATE_COURSEWARE_PROGRESS',
      payload: result
    });
  }, []);

  // 语言切换处理:只把「当前选中课件所属多语言组」的语言记为 lang,派生逻辑自动重算,不发接口。
  // 因此仅当前选中的那条课件会切语言,同课程其它课件保持各自语言;点回本课件时仍是这次选的语言。
  // 拦截:若目标 lang 是 status=3(已停用),忽略切换 —— UI 侧应已灰化 disabled,这里是双保险
  const handleLangChange = useCallback((lang: string) => {
    // 【已注释:停用语言拦截】原逻辑:目标语言 status=3(已停用) 时忽略切换(配合 UI 灰化的双保险)。
    // 现改为「所有候选语言均可切换」,与 PreviewHeader 去掉灰化保持一致。如需恢复,取消下面注释。
    // if (courseLangStatusMap[lang] === 3) {
    //   return;
    // }
    // 只更新当前选中课件所属组;单语言课件(无 groupCode)没有可切语言,直接返回
    const curGroupCode = currentCoursewareLangInfo.groupCode;
    if (!curGroupCode) return;
    setLangByGroup(prev => ({ ...prev, [curGroupCode]: lang }));
    // ⚠️ 这里【不要动 URL】(曾用 replaceState 删掉 lang 参数):
    // 宿主(qiankun 主应用)的多页签用「pathname + search」当页签 key,一改 query 就被判定为新页面 → 多开一个「课程学习」页签。
    // 语言已按分组记在内存(langByGroup),无需同步到 URL;代价仅是刷新页面会回到 URL 里 lang 对应的语言(刷新本就回初始态)。
    // 同步把当前选中的 coursewareCode 换成新语言版本（避免右侧还播旧的）
    // 匹配当前选中项:自身 code 相等,或其 langVariants 里任一 value 等于 selected(已切过语言的中间态)
    if (state.selectedCoursewareCode != null) {
      const selected = state.selectedCoursewareCode;
      const isCur = (ownCode: number, lv?: Record<string, number> | null) =>
        ownCode === selected || (!!lv && Object.values(lv).includes(selected));
      if (state.mode === 'study') {
        for (const ch of studyRawChaptersRef.current || []) {
          for (const cw of ch.coursewares) {
            if (isCur(cw.coursewareCode, cw.langVariants)) {
              const newCode = cw.langVariants?.[lang];
              if (newCode) dispatch({ type: 'SELECT_COURSEWARE', payload: newCode });
              return;
            }
          }
        }
      } else {
        for (const ch of previewRawChaptersRef.current || []) {
          for (const c of ch.contents) {
            if (isCur(c.coursewareCode, c.langVariants)) {
              const newCode = c.langVariants?.[lang];
              if (newCode) dispatch({ type: 'SELECT_COURSEWARE', payload: newCode });
              return;
            }
          }
        }
      }
    }
  }, [state.selectedCoursewareCode, state.mode, courseLangStatusMap, currentCoursewareLangInfo.groupCode]);

  if (state.loading) {
    return <div className={styles.loading}>
        <Spin size="large" />
      </div>;
  }
  return <Context.Provider value={{
    state,
    dispatch
  }}>
      <div className={styles.preview}>
        <PreviewHeader
          courseName={state.courseName}
          totalDuration={state.totalDuration}
          onBack={handleBack}
          langs={courseLangs}
          langNameMap={langNameMap}
          langStatusMap={courseLangStatusMap}
          currentLang={selectedLang ?? undefined}
          onLangChange={handleLangChange}
        />
        <div className={styles.main}>
          <ChapterTree chapters={remappedChapters} selectedCoursewareCode={displayedSelectedCode} onSelectCourseware={handleSelectCourseware} mode={state.mode} coursewareProgressMap={remappedProgressMap} chapterLockMap={state.chapterLockMap} downloadTypeMap={state.downloadTypeMap} coursewareFileTypeMap={state.coursewareFileTypeMap} downloadingCode={downloadingCode} onDownload={handleDownload} />
          <div className={styles.content}>
            {/* coursewareCode 用 feat 侧的语言重映射值 displayedSelectedCode(切语言后指向对应版本课件);
                courseCode / planId 是 develop 侧新增 prop(供 CoursewareLearn 内部关联课程/计划上下文) */}
            {displayedSelectedCode && <CoursewareLearn coursewareCode={displayedSelectedCode} courseCode={courseCode} planId={planId || undefined} showHeader={false} mode={state.mode} onProgressUpdate={handleProgressUpdate} />}
          </div>
        </div>
      </div>
    </Context.Provider>;
}