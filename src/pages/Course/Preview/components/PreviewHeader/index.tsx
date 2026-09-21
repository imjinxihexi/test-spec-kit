import { $t } from '@/i18n';
import { LeftOutlined, GlobalOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { formatDuration } from '../../utils/formatDuration';
import { getCoursewareLangShortName, getCurrentUiLang } from '@/i18n/coursewareLangNames';
import styles from './index.module.less';

interface PreviewHeaderProps {
  courseName: string;
  totalDuration: number;
  onBack: () => void;
  /** 课程内出现过的语言候选（无候选或仅 1 种时不渲染切换器） */
  langs?: string[];
  /** 语言 code → 后端返回的 native 名(如 zh-CN → 简体中文/English/Deutsch);仅作 fallback,首选走 UI 语言译名字典 */
  langNameMap?: Record<string, string>;
  /** 语言 code → 组内该语言课件 status(1=已发布/3=已停用);status=3 的 tag 灰化 + hover 提示"课件未启用",且不可点 */
  langStatusMap?: Record<string, number>;
  /** 当前选中语言 code */
  currentLang?: string;
  /** 语言切换回调 */
  onLangChange?: (lang: string) => void;
}

export default function PreviewHeader({
  courseName,
  totalDuration,
  onBack,
  langs,
  langNameMap,
  langStatusMap,
  currentLang,
  onLangChange,
}: PreviewHeaderProps) {
  const durationText = formatDuration(totalDuration);
  const showLangSwitcher = Array.isArray(langs) && langs.length > 1 && !!onLangChange;

  // 语言名走「当前 UI 语言下译名 - 去国家后缀」,字典未命中时兜底走后端 native 名再兜底 code,
  // 与 CoursewareLearn/LangSwitcher 保持一致(仅编辑弹窗展示带国家后缀版本)
  const uiLang = getCurrentUiLang();
  const getDisplayName = (code: string) => getCoursewareLangShortName(code, uiLang, langNameMap?.[code]);

  // 已发布语言置顶,已停用沉底,各自保持接口原顺序
  const sortedLangs = Array.isArray(langs)
    ? [...langs].sort((a, b) => {
        const aOk = (langStatusMap?.[a] ?? 1) === 1 ? 0 : 1;
        const bOk = (langStatusMap?.[b] ?? 1) === 1 ? 0 : 1;
        return aOk - bOk;
      })
    : [];

  return (
    <div className={styles.header}>
      <div className={styles.title}>
        <LeftOutlined className={styles.backIcon} onClick={onBack} />
        <span className={styles.courseName}>{courseName}</span>
        {showLangSwitcher && (
          <span className={styles.langSwitcher}>
            <GlobalOutlined className={styles.langIcon} />
            <Select
              size="small"
              value={currentLang}
              onChange={onLangChange}
              dropdownMatchSelectWidth={false}
              style={{ minWidth: 120 }}
              optionLabelProp="label"
            >
              {sortedLangs.map(code => {
                const label = getDisplayName(code);
                // 【已注释:灰化逻辑】原按 langStatusMap[code]===3 把停用语言置灰 + hover 提示「课件未启用」+ 不可点。
                // 现改为「所有候选语言均可选」。如需恢复置灰,取消下面注释并还原 Select.Option 的 disabled/Tooltip 分支。
                // const disabled = langStatusMap?.[code] === 3;
                return (
                  <Select.Option key={code} value={code} label={label}>
                    {label}
                  </Select.Option>
                );
              })}
            </Select>
          </span>
        )}
      </div>
      <div className={styles.subtitle}>
        {$t("课程总时长为 {{duration}}", {
          duration: durationText
        })}
      </div>
    </div>
  );
}
