import { $t } from "@/i18n";
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRequest, useMemoizedFn } from 'ahooks';
import { Modal, Button, Select, message } from 'antd';
import { EllipsisToolTip } from '@friday/components';
import { CURD, LayoutTable } from 'xui-pro';
import type { ActionRefType } from 'xui-pro';
import { queryCoursewarePage, type Courseware, type CoursewarePageResp, type LabelInfo } from '@/api/xp-evi-learning-admin-eu-boot/courseware';
import { getCoursewareOpenLanguages } from '@/api/xp-evi-learning-admin-eu-boot/courseware';
// 语言展示走「当前 UI 语言下译名 - 去国家后缀」,与课程编辑基础信息里的语言下拉保持一致
import { getCoursewareLangShortName, getCurrentUiLang } from '@/i18n/coursewareLangNames';
import dayjs from 'dayjs';
import styles from './index.module.less';
import { getTypeLabel } from '@/pages/Courseware/components/CoursewareFormModal/utils';
import CategoryTreeSelect from '../CategoryTreeSelect';

// 表格行类型：主行是原始接口结构;children 是同组子成员(与主行结构一致),用 antd Table tree-mode 渲染
type SelectorRow = Courseware & { children?: SelectorRow[] };

// 虚拟主行 id:多语言组的主行不再复用某个真实 coursewareCode,改为造一个负数 id 占位,
// 与真实 coursewareCode(雪花算法生成正数)不冲突;所有真实课件(含 zh-CN 那条)统一降为子行。
// 提交时通过 isVirtualGroupId 过滤,虚拟主行不出现在业务侧的 code 列表。
const isVirtualGroupId = (id: number) => id < 0;

// 由 groupCode 生成稳定的虚拟负数 id(简单 hash,冲突概率极低,即使冲突也只影响 UI 分组归属)
const groupCodeToVirtualId = (groupCode: string): number => {
  let hash = 0;
  for (let i = 0; i < groupCode.length; i++) {
    hash = ((hash << 5) - hash) + groupCode.charCodeAt(i);
    hash |= 0; // 保持 32-bit
  }
  return -Math.abs(hash) - 1; // 保证负数且非 0
};
export interface CoursewareSelectorProps {
  visible: boolean;
  categoryId?: number;
  lang: string;
  /**
   * 已在课程中的课件 code 列表。作用:
   * 1) 打开弹窗时预勾选(左侧 checkbox 打勾、右侧"已选"回填)
   * 2) 确认提交时与最终勾选态 diff:新增 → onSelect;取消勾中的 → onRemove
   */
  existingCoursewareIds?: number[];
  /**
   * 已在课程中的课件 record 预填(可选,但强烈建议传)。
   * 打开弹窗时用它预填 selectedMap → 右侧「已选」表格能立刻显示 name/duration,
   * 避免仅传 existingCoursewareIds 时,因当前列表按 lang 过滤查不到这些课件、record 拿不回来 → 右侧空白。
   * 至少要有 { id, name, duration } 三个字段。
   */
  existingCoursewares?: Array<Partial<Courseware> & { id: number; name?: string; duration?: number }>;
  /** 新增课件(不含已存在项);仅 added 部分,父组件 ADD_COURSEWARES */
  onSelect: (coursewares: Courseware[]) => void;
  /** 从课程中移除已存在的课件(existing 里但被用户取消勾选);父组件 DELETE_COURSEWARE */
  onRemove?: (removedIds: number[]) => void;
  onClose: () => void;
}
export default function CoursewareSelector({
  visible,
  categoryId,
  lang,
  existingCoursewareIds = [],
  existingCoursewares = [],
  onSelect,
  onRemove,
  onClose
}: CoursewareSelectorProps) {
  const actionRef = useRef<ActionRefType>(null);
  const rightTableRef = useRef<ActionRefType>(null);

  // 弹窗打开计数器:每次 visible=true 时 +1,作为 CURD 组件 key,强制重挂载 → initialValues 生效一次。
  // 目的:清空 lang 后再点查询不会被 CURD 内部 reset 回 initialValues。
  const [openKey, setOpenKey] = useState(0);
  // 语言筛选:走本地受控 state,不依赖 xui-pro form。
  // 【锁定语言】按需求：课程编辑页的课件搜索弹窗，语言筛选固定为外层课程基础信息里选中的语言(lang prop)，
  // 用户不可修改。打开弹窗时带入 lang prop(见下方 visible useEffect)，Select 设为 disabled。
  const [langFilter, setLangFilter] = useState<string | undefined>(lang);

  // 已选课件(保持勾选顺序)
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<number, Courseware>>(new Map());
  // 分类筛选:xui-pro CURD 的 `type: 'custom'` FormItem 里,CategoryTreeSelect 的 onChange 无法把值回写到 form store
  // (点查询时 form.getFieldsValue 拿到 categoryId 是 undefined,导致丢筛选)。
  // 解法:分类走本地受控 state,在 request 里合并到 params,视觉上仍显示在搜索栏
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(categoryId);


  // 右侧表格勾选要删除的课件
  const [toDeleteKeys, setToDeleteKeys] = useState<number[]>([]);

  // 主从聚合下:表格展开的主行 id 集合。勾主行时自动展开该组,方便看清子行被联动勾中
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
  // 右侧「已选」的展开态(受控):默认所有虚拟主行都展开,方便看清组内已选子行
  const [rightExpandedRowKeys, setRightExpandedRowKeys] = useState<number[]>([]);
  // 主从聚合下:所有子行 id 集合。左侧表格的子行 checkbox 禁用,防止用户拆散语言组
  const [childRowIds, setChildRowIds] = useState<Set<number>>(new Set());
  // 子行 id → 所属虚拟主行 id 的反查表。用 ref 存,避免修改触发 rerender。
  // 用途:点子行取消勾选时,需要同步把虚拟父从 selectedKeys 移除,否则 antd
  // checkStrictly=false 会把父仍勾着的子"补回"打勾态,表现为子行 checkbox 点不动。
  const childToVirtualParentRef = useRef<Map<number, number>>(new Map());
  // 虚拟主行 id → 所有子行 id[](反向,用于"点子行勾中时判断是否整组全中,若是则父也加入")。
  const virtualParentToChildrenRef = useRef<Map<number, number[]>>(new Map());
  // 虚拟主行 id → 该组的 groupCode。selectedList 兜底时组装虚拟主行 name,与左侧一致。
  const virtualIdToGroupCodeRef = useRef<Map<number, string>>(new Map());
  // 虚拟主行 id → 该组用于汇总展示的业务 code(取组内第一条非空)。selectedList 兜底同款。
  const virtualIdToAggregatedCodeRef = useRef<Map<number, string>>(new Map());

  // 语言列表：构建 code → 展示名 映射，用于表格「Language」列展示
  // 数据源使用课件多语言可选范围（courseware-lang-codes，62 种全量），与课件/课程实际语言集合一致，
  // 避免出现 ja-JP / nb-NO 等新增语言在此列显示原始 code 未翻译的问题。
  const { data: langRes } = useRequest(getCoursewareOpenLanguages, { ready: visible, refreshDeps: [visible] });
  // langMap 走「当前 UI 语言下译名 - 去国家后缀」,兜底后端 native 名(item.value)→ code
  // 例:UI=zh_CN → English → 「英语」;UI=en_US → English → 「English」
  const langMap = useMemo(() => {
    const uiLang = getCurrentUiLang();
    const map: Record<string, string> = {};
    const list = Array.isArray(langRes?.data) ? langRes!.data : [];
    list.forEach(item => {
      map[item.code] = getCoursewareLangShortName(item.code, uiLang, item.value);
    });
    return map;
  }, [langRes]);

  // 接口 CoursewarePageResp → 表格行 SelectorRow(主行/子行结构一致)
  const respToRow = useMemoizedFn((item: CoursewarePageResp): SelectorRow => ({
    id: item.coursewareCode,
    code: item.code,
    name: item.name,
    type: item.type,
    duration: item.duration || 0,
    categoryName: item.categoryName,
    creator: item.createBy,
    gmtCreate: item.createTime,
    gmtModified: item.updateTime,
    langCode: item.langCode,
    groupLangs: item.groupLangs,
    labels: item.labels,
  }));

  // 加载课件数据(平铺模式,不再走主从聚合;聚合代码保留但注释,可回滚)
  const request = useMemoizedFn(async (params: any) => {
    // 【锁定语言】语言固定为外层课程基础信息的语言(lang prop)。
    // 三重来源兜底：CURD form 值(params.lang，来自 initialValues) → 本地镜像 langFilter → lang prop。
    const finalLang = params.lang || langFilter || lang || undefined;
    // 诊断日志：若语言仍带不进来，看这里确认 props.lang 是否为空、CURD form 是否吃到 initialValues
    // eslint-disable-next-line no-console
    console.info('[CoursewareSelector][锁定语言] request', {
      'props.lang(课程语言)': lang,
      langFilter,
      'params.lang(CURD form)': params.lang,
      finalLang,
    });
    try {
      const res = await queryCoursewarePage({
        pageNo: params.current || 1,
        pageSize: params.pageSize || 10,
        // categoryId 从本地 state 取,不依赖 params.categoryId(xui-pro form 拿不回 custom 组件的值)
        categoryId: categoryFilter,
        // lang 完全跟随搜索框(initialValues 已把课程语言带入首次搜索):
        //  - 用户在弹窗内清空 → params.lang=undefined → 不带 lang 请求,列出全部语言的课件
        //  - 用户切换到其它语言 → 走用户选择
        lang: finalLang,
        // 主从聚合已关闭:后端直接返回平铺的每个语言课件,一条 groupCode 对应多条真实行
        // 单语言课件保持独立一行,与聚合关闭前对单语言课件的展示无差别
        groupAggregate: false,
        // 按分组挨在一起:同 groupCode 的多语言课件在列表里相邻显示(排序层面,不做树聚合),
        // 便于用户在平铺列表里一眼看到"这几条属于同一个多语言组"
        sortByGroup: true,
        status: 1,
        // 固定为已发布状态
        name: params.name || undefined,
        code: params.code || undefined
      });
      if (res.code === 200 && res.data) {
        // 平铺 rows:每个 item 直接一对一 respToRow,不建虚拟主行、不建反查表
        const rows: SelectorRow[] = res.data.list.map(item => respToRow(item));

        // ===== 主从聚合逻辑(已停用,保留供回滚) =====
        // const childIds = new Set<number>();
        // const virtualIds: number[] = [];
        // const c2p = childToVirtualParentRef.current;
        // const p2c = virtualParentToChildrenRef.current;
        // const rowsAgg: SelectorRow[] = res.data.list.flatMap(item => {
        //   if (item.isGroup && item.groupMembers && item.groupMembers.length > 0 && item.groupCode) {
        //     const representative = respToRow(item);
        //     const memberRows = item.groupMembers.map(m => respToRow(m));
        //     const rawGroupItems = [item, ...item.groupMembers];
        //     const aggregatedCode = rawGroupItems.map(g => (g.code || '').trim()).find(c => c) || '';
        //     if (!aggregatedCode) return [representative, ...memberRows];
        //     const virtualId = groupCodeToVirtualId(item.groupCode);
        //     virtualIds.push(virtualId);
        //     childIds.add(representative.id);
        //     memberRows.forEach(r => childIds.add(r.id));
        //     const groupChildIds = [representative.id, ...memberRows.map(r => r.id)];
        //     groupChildIds.forEach(cid => c2p.set(cid, virtualId));
        //     p2c.set(virtualId, groupChildIds);
        //     virtualIdToGroupCodeRef.current.set(virtualId, item.groupCode);
        //     virtualIdToAggregatedCodeRef.current.set(virtualId, aggregatedCode);
        //     return [{ id: virtualId, code: aggregatedCode, name: aggregatedCode, type: 0, duration: 0, categoryName: '', creator: '', gmtCreate: '', gmtModified: '', langCode: '', children: [representative, ...memberRows] } as SelectorRow];
        //   }
        //   return [respToRow(item)];
        // });
        // setChildRowIds(childIds);
        // setExpandedRowKeys(virtualIds);

        // 回填 selectedMap:本次分页命中的 existing 课件把 record 塞进 selectedMap,
        // 让右侧「已选」能拿到 name/duration 渲染(平铺后每行都是真实课件,不做虚拟父处理)
        setSelectedMap(prev => {
          const next = new Map(prev);
          rows.forEach(row => {
            if (!next.has(row.id)) next.set(row.id, row);
          });
          return next;
        });
        // 将新接口的 CoursewarePageResp 转换为旧的 Courseware 类型
        const coursewares = res.data.list.map(item => ({
          id: item.coursewareCode,
          code: item.code,
          name: item.name,
          type: item.type,
          duration: item.duration || 0,
          categoryName: item.categoryName,
          creator: item.createBy,
          gmtCreate: item.createTime,
          gmtModified: item.updateTime
        }));
        return {
          data: rows,
          total: res.data.total || 0,
          success: true
        };
      } else {
        message.error(res.msg || $t("获取课件列表失败"));
        return {
          data: [],
          total: 0,
          success: false
        };
      }
    } catch (error) {
      message.error($t("获取课件列表失败"));
      console.error(error);
      return {
        data: [],
        total: 0,
        success: false
      };
    }
  });

  // 勾选处理(平铺模式:每行就是一个真实课件,勾/取消只处理自身,不再有父/子联动)
  const handleSelect = useMemoizedFn((record: SelectorRow, selected: boolean) => {
    if (selected) {
      setSelectedKeys(prev => (prev.includes(record.id) ? prev : [...prev, record.id]));
      setSelectedMap(prev => {
        const newMap = new Map(prev);
        newMap.set(record.id, record);
        return newMap;
      });
    } else {
      setSelectedKeys(prev => prev.filter(id => id !== record.id));
      setSelectedMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(record.id);
        return newMap;
      });
    }
  });

  // 批量勾选处理(表头全选):changeRows 已被 antd 拍平为主行+子行(checkStrictly=false 时)
  const handleSelectAll = useMemoizedFn((selected: boolean, _selectedRows: SelectorRow[], changeRows: SelectorRow[]) => {
    if (selected) {
      const newKeys = changeRows.map(row => row.id);
      setSelectedKeys(prev => [...prev, ...newKeys.filter(id => !prev.includes(id))]);
      setSelectedMap(prev => {
        const newMap = new Map(prev);
        changeRows.forEach(row => newMap.set(row.id, row));
        return newMap;
      });
    } else {
      const removeKeys = changeRows.map(row => row.id);
      setSelectedKeys(prev => prev.filter(id => !removeKeys.includes(id)));
      setSelectedMap(prev => {
        const newMap = new Map(prev);
        changeRows.forEach(row => newMap.delete(row.id));
        return newMap;
      });
    }
  });

  // 批量删除右侧勾选的课件(平铺模式:直接从 selectedKeys/selectedMap 移除,无父/子联动)
  const handleDeleteSelected = useMemoizedFn(() => {
    if (toDeleteKeys.length === 0) {
      message.warning($t("请选择要删除的课件"));
      return;
    }
    const removeSet = new Set(toDeleteKeys);
    setSelectedKeys(prev => prev.filter(key => !removeSet.has(key)));
    setSelectedMap(prev => {
      const newMap = new Map(prev);
      removeSet.forEach(key => newMap.delete(key));
      return newMap;
    });
    setToDeleteKeys([]);
  });

  // 行选择配置(checkStrictly=false 让父/子行联动:勾主行 → 自动带子行;
  // 子行也允许独立勾/取消,不做 disabled 限制)
  const rowSelection = useMemo(() => ({
    selectedRowKeys: selectedKeys,
    onSelect: handleSelect,
    onSelectAll: handleSelectAll,
    checkStrictly: false,
    preserveSelectedRowKeys: true,
    columnWidth: 48
  }), [selectedKeys, handleSelect, handleSelectAll]);

  // 时长格式化
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}`;
  };

  // 表单项配置
  // 语言下拉:label 走「当前 UI 语言下译名 - 去国家后缀」(langMap 已计算好);
  // 选中值仍是 lang code(如 zh-CN),提交时进 request 的 params.lang。
  const langOptions = useMemo(() => {
    const list = Array.isArray(langRes?.data) ? langRes!.data : [];
    return list.map(item => ({ label: langMap[item.code] || item.value || item.code, value: item.code }));
  }, [langRes, langMap]);
  const formItems = useMemo(() => [{
    type: 'input' as const,
    label: $t('名称'),
    name: 'name',
    props: {
      placeholder: $t('请输入'),
      allowClear: true
    }
  }, {
    type: 'input' as const,
    label: $t('课件编码'),
    name: 'code',
    props: {
      placeholder: $t('请输入'),
      allowClear: true
    }
  }, {
    type: 'custom' as const,
    label: $t('语言'),
    name: 'lang',
    // ⚠️ 不走 xui-pro form(与 categoryFilter 同一原因):xui-pro 内部对 form 值和 antd Select 显示态有不一致处理,
    // 表现为"清空后点查询 UI 又跳回默认"。改本地 state 让视觉与数据同源
    render: () => (
      // 【锁定语言】固定为课程基础信息里的语言(lang prop)，disabled 禁用不可改；
      // 以 lang prop 兜底(langFilter 可能因时序/热更未及时同步)，去掉 allowClear/showSearch/onChange。
      <Select
        value={langFilter || lang}
        disabled
        placeholder={$t('请选择语言')}
        optionFilterProp='label'
        options={langOptions}
        style={{ width: 200 }}
      />
    )
  }, {
    type: 'custom' as const,
    label: $t('分类'),
    name: 'categoryId',
    // ⚠️ 不走 xui-pro form,改用本地 categoryFilter state(见组件顶部说明)。
    // xui-pro `type:'custom'` 里 antd Form.Item 无法从 CategoryTreeSelect 收回 value,
    // 表现为「打开时显示但点查询后消失、request 不带 categoryId」。
    render: () => (
      <CategoryTreeSelect
        value={categoryFilter}
        onChange={(v) => setCategoryFilter(v)}
        placeholder={$t('请选择分类')}
      />
    )
  }], [langOptions, categoryFilter, langFilter, lang]);

  const columns = useMemo(() => [{
    title: $t('名称'),
    dataIndex: 'name',
    width: 160,
    ellipsis: { showTitle: false },
    render: (name: string) => <EllipsisToolTip title={name}>{name}</EllipsisToolTip>
  }, {
    title: $t('课件编码'),
    dataIndex: 'code',
    width: 140,
    ellipsis: { showTitle: false },
    render: (code: string) => <EllipsisToolTip title={code || '-'}>{code || '-'}</EllipsisToolTip>
  }, {
    title: $t('时长(分钟)'),
    dataIndex: 'duration',
    width: 110,
    render: (duration: number) => formatDuration(duration)
  }, {
    title: $t('语言'),
    dataIndex: 'langCode',
    width: 100,
    render: (langCode?: string) => (langCode ? (langMap[langCode] || langCode) : '-')
  }, {
    // 语言数:每行都是真实课件,显示该组语言总数(单语言课件 groupLangs 为空 → 1)
    title: $t('语言数'),
    dataIndex: 'groupLangs',
    width: 90,
    render: (_val: unknown, record: SelectorRow) => (
      Array.isArray(record.groupLangs) && record.groupLangs.length > 0
        ? record.groupLangs.length
        : 1
    ),
  }, {
    title: $t('类型'),
    dataIndex: 'type',
    width: 100,
    ellipsis: { showTitle: false },
    render: (type: number) => {
      const text = getTypeLabel(type) || $t('未知');
      return <EllipsisToolTip title={text}>{text}</EllipsisToolTip>;
    }
  }, {
    title: $t('分类'),
    dataIndex: 'categoryName',
    width: 130,
    ellipsis: { showTitle: false },
    render: (categoryName?: string) => (
      <EllipsisToolTip title={categoryName || '-'}>{categoryName || '-'}</EllipsisToolTip>
    ),
  }, {
    title: $t('标签'),
    dataIndex: 'labels',
    width: 140,
    ellipsis: { showTitle: false },
    render: (labels?: LabelInfo[]) => {
      if (!Array.isArray(labels) || labels.length === 0) return '-';
      const text = labels.map(l => l.name).join(', ');
      return <EllipsisToolTip title={text}>{text}</EllipsisToolTip>;
    },
  }, {
    title: $t('更新时间'),
    dataIndex: 'gmtModified',
    width: 140,
    render: (time: string) => time ? dayjs(time).format('DD MMM, YYYY HH:mm') : '-'
  }], [langMap]);

  // 弹窗打开时:用 existingCoursewareIds 预勾选,用 existingCoursewares 预填 selectedMap → 右侧「已选」立刻可渲染。
  // 语义:
  //   - existingCoursewareIds:决定"哪些行 checkbox 打勾"
  //   - existingCoursewares:决定"右侧已选表格显示什么(name/duration)"
  // 有了预填 record 后,即使左侧列表按 lang 过滤查不到这些课件,右侧也不会空白;左侧 checkbox 因 rowKey 不在
  // 当前分页 dataSource 里不显示 checked 态是 antd Table 的正常表现,不影响 selectedRows 逻辑与提交结果。
  useEffect(() => {
    if (visible) {
      // 递增 openKey → CURD key 变化 → 组件完全重挂载,回到干净分页/搜索初始态
      setOpenKey(k => k + 1);
      // 【锁定语言】语言筛选带入外层课程基础信息的语言(lang prop),用户不可改(Select 已 disabled)
      setLangFilter(lang);
      setSelectedKeys([...existingCoursewareIds]);
      // 用 existingCoursewares 预填 selectedMap:补 record 让右侧「已选」表格立刻能渲染
      const initMap = new Map<number, Courseware>();
      existingCoursewares.forEach(cw => {
        if (cw && typeof cw.id === 'number') {
          initMap.set(cw.id, {
            id: cw.id,
            code: cw.code,
            name: cw.name || '',
            type: cw.type ?? 0,
            duration: cw.duration ?? 0,
            categoryName: cw.categoryName ?? '',
            creator: cw.creator ?? '',
            gmtCreate: cw.gmtCreate ?? '',
            gmtModified: cw.gmtModified,
            langCode: cw.langCode,
            groupLangs: cw.groupLangs,
            labels: cw.labels,
          });
        }
      });
      setSelectedMap(initMap);
      setToDeleteKeys([]);
      setRightExpandedRowKeys([]);
      // 弹窗每次打开,把分类下拉重置回外层课程分类,保持"打开自动带入课程分类"体验
      setCategoryFilter(categoryId);
      // 反查表清空,新一轮 request 里按分页重建
      childToVirtualParentRef.current.clear();
      virtualParentToChildrenRef.current.clear();
      virtualIdToGroupCodeRef.current.clear();
      virtualIdToAggregatedCodeRef.current.clear();
      // 刷新表格数据
      setTimeout(() => {
        actionRef.current?.reload?.();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 确认提交:与打开弹窗时的 existingCoursewareIds 做 diff
  // - added: 用户新勾中(existing 里没有的)→ onSelect,父组件 ADD_COURSEWARES
  // - removed: existing 里但被用户取消勾选的 → onRemove,父组件 DELETE_COURSEWARE
  const handleConfirm = useMemoizedFn(() => {
    // 平铺模式:selectedKeys 就是真实课件 code,不再需要过滤虚拟主行
    const finalRealKeys = selectedKeys;
    const existingSet = new Set(existingCoursewareIds);
    const finalSet = new Set(finalRealKeys);

    const addedIds = finalRealKeys.filter(id => !existingSet.has(id));
    const removedIds = existingCoursewareIds.filter(id => !finalSet.has(id));

    if (addedIds.length === 0 && removedIds.length === 0) {
      // 无变更,直接关闭
      onClose();
      return;
    }

    if (removedIds.length > 0) {
      if (onRemove) {
        onRemove(removedIds);
      } else {
        console.warn('[CoursewareSelector] 存在需要取消的原有课件但父组件未提供 onRemove,已忽略:', removedIds);
      }
    }
    if (addedIds.length > 0) {
      const addedCoursewares = addedIds
        .map(id => selectedMap.get(id))
        .filter((item): item is Courseware => item !== undefined);
      // selectedMap 里可能有些 id 因为跨分页没被 request 回填 record,
      // 忽略这些无 record 的 id(理论上不会发生:新增的 id 一定来自本次分页勾中)
      onSelect(addedCoursewares);
    }
    onClose();
  });

  // 已选课件列表(平铺模式:按勾选顺序展示真实课件行,不再聚合虚拟主行)
  const selectedList = useMemo<SelectorRow[]>(() => {
    const rows: SelectorRow[] = [];
    for (const id of selectedKeys) {
      const record = selectedMap.get(id) as SelectorRow | undefined;
      if (record) rows.push({ ...record });
    }
    return rows;
  }, [selectedKeys, selectedMap]);

  const rightColumns = useMemo(() => [{
    title: $t('名称'),
    dataIndex: 'name',
    width: 180,
    ellipsis: { showTitle: false },
    render: (name: string) => <EllipsisToolTip title={name}>{name}</EllipsisToolTip>
  }, {
    title: $t('时长(分钟)'),
    dataIndex: 'duration',
    width: 110,
    render: (duration: number) => formatDuration(duration)
  }], []);

  // 右侧表格行选择配置
  // 右侧「已选」行选择:与左侧一致,只允许操作主行;子行 checkbox 禁用,勾主行时联动整组
  const rightRowSelection = useMemo(() => ({
    selectedRowKeys: toDeleteKeys,
    onChange: (selectedRowKeys: React.Key[]) => {
      setToDeleteKeys(selectedRowKeys as number[]);
    },
    checkStrictly: false,
    preserveSelectedRowKeys: true,
    columnWidth: 48
  }), [toDeleteKeys]);

  // 右侧「已选」默认展开虚拟主行的逻辑,平铺模式下已无虚拟行,注释保留可回滚
  // useEffect(() => {
  //   const currentVirtualIds = selectedList
  //     .filter(row => isVirtualGroupId(row.id) && row.children && row.children.length > 0)
  //     .map(row => row.id);
  //   if (currentVirtualIds.length === 0) return;
  //   setRightExpandedRowKeys(prev => {
  //     const prevSet = new Set(prev);
  //     const additions = currentVirtualIds.filter(id => !prevSet.has(id));
  //     return additions.length > 0 ? [...prev, ...additions] : prev;
  //   });
  // }, [selectedList]);
  return <Modal title={$t('课件搜索')} visible={visible} onCancel={onClose} width={1200} footer={null} className={styles.modal}>
      <div className={styles.container}>
        {/* 左侧区域 */}
        <div className={styles.leftPanel}>
          {/* 【锁定语言·bug 根因修复】语言不可改，必须把 lang 灌进 CURD form 的 initialValues：
              否则 xui-pro 的 CURD 会用 Form.Item(name='lang') 的空 form store 值覆盖 render 里 <Select> 显式传的 value，
              导致语言框显示空 placeholder（本次「语言没设置进来」的真正原因）。
              因语言已 disabled 不可清空，历史上「清空后被 initialValues 回填」的问题不再存在。
              key={openKey} 每次打开弹窗重挂载 → initialValues 重新生效。categoryId 仍走本地 state。 */}
          <CURD key={`courseware-selector-${openKey}`} initialValues={{ lang }} actionRef={actionRef} formItems={formItems} columns={columns} request={request} table={{
          rowSelection,
          rowKey: 'id',
          // 主从聚合场景:勾主行时自动展开该组(见 handleSelect);用户也可自行手动折叠/展开
          expandable: {
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as number[]),
          },
          scroll: {
            // 列宽合计:160+140+110+100+90+100+130+140+140 ≈ 1110,给点余量。
            // 或改成 'max-content' 让 antd 自动累加,后续加减列不用手改。
            x: 'max-content',
            y: 400
          },
          pagination: {
            showSizeChanger: false,
            showTotal: (total: number) => $t('共 {{total}} 条', { total })
          }
        }} />
        </div>

        {/* 右侧已选区域 */}
        <div className={styles.rightPanel}>
          <div className={styles.selectedHeader}>
            <span>{$t('已选 {{count}} 条记录', { count: selectedKeys.length })}</span>
            <Button danger size="small" onClick={handleDeleteSelected} disabled={toDeleteKeys.length === 0}>
              {$t('删除')}
            </Button>
          </div>

          <LayoutTable actionRef={rightTableRef} columns={rightColumns} dataSource={selectedList} rowKey="id" rowSelection={rightRowSelection} hasToolbar={false} pagination={false} scroll={{
          x: 338,
          y: 450
        }} size="small" expandable={{
          expandedRowKeys: rightExpandedRowKeys,
          onExpandedRowsChange: (keys) => setRightExpandedRowKeys(keys as number[])
        }} />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className={styles.footer}>
        <Button onClick={onClose}>{$t('取消')}</Button>
        <Button type="primary" onClick={handleConfirm}>
          {$t('确认')}
        </Button>
      </div>
    </Modal>;
}