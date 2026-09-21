import { $t } from "@/i18n";
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { message, Tag, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { CURD } from 'xui-pro';
import type { ColumnType, FormItemType, ColumnActionType } from 'xui-pro';
import { queryCourseList, updateCourseState, deleteCourse, type Course } from '@/api/xp-evi-learning-admin-eu-boot/course';
import type { CourseListTableProps } from './types';
import LabelSelect from '@/pages/Courseware/components/LabelSelect';
import VisibilityTag, { getVisibilityOptions } from '@/components/VisibilityConfig/VisibilityTag';
import useButtonAuth from '@/lib/useButtonAuth';
import { UiPermissions } from '@/conf/permission';
import { formatDuration, formatDateTime } from './utils';
import { formatLearningDuration } from '@/utils/formatLearningDuration';
export default function CourseListTable({
  selectedCategoryId = 'all'
}: CourseListTableProps) {
  const actionRef = useRef<any>(null);

  const canAdd = useButtonAuth(UiPermissions.COURSE_ADD);
  const canEdit = useButtonAuth(UiPermissions.COURSE_EDIT);
  const canActivate = useButtonAuth(UiPermissions.COURSE_ACTIVATE);
  const canDeactivate = useButtonAuth(UiPermissions.COURSE_DEACTIVATE);
  const canDelete = useButtonAuth(UiPermissions.COURSE_DELETE);

  // ========== 页面跳转函数 ==========

  /**
   * 新增课程
   */
  const handleAdd = useCallback(() => {
    const params = new URLSearchParams({
      mode: 'create',
      categoryId: String(selectedCategoryId || '')
    });
    window.xDragonBridge.openNewTab({
      path: `/smart-trains/course/edit?${params.toString()}`,
      title: $t("新增课程")
    });
  }, [selectedCategoryId]);

  /**
   * 编辑课程
   */
  const handleEdit = useCallback((record: Course) => {
    const params = new URLSearchParams({
      courseCode: String(record.courseCode),
      mode: 'edit',
      categoryId: String(selectedCategoryId || '')
    });
    window.xDragonBridge.openNewTab({
      path: `/smart-trains/course/edit?${params.toString()}`,
      title: $t("编辑课程 - {{value0}}", {
        value0: record.name
      })
    });
  }, [selectedCategoryId]);

  /**
   * 查看详情
   */
  const handleDetail = useCallback((record: Course) => {
    const params = new URLSearchParams({
      courseCode: String(record.courseCode),
      mode: 'detail',
      categoryId: String(selectedCategoryId || '')
    });
    window.xDragonBridge.openNewTab({
      path: `/smart-trains/course/edit?${params.toString()}`,
      title: $t("课程详情 - {{value0}}", {
        value0: record.name
      })
    });
  }, [selectedCategoryId]);

  // ========== 状态操作函数 ==========

  /**
   * 停用课程
   */
  const handleDeactivate = useCallback((record: Course) => {
    Modal.confirm({
      title: $t("确认停用该课程？"),
      content: $t("停用后学员将无法访问"),
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          const res = await updateCourseState({
            courseCode: record.courseCode,
            type: 'status',
            status: 0
          });
          if (res.code === 200) {
            message.success($t("停用成功"));
            actionRef.current?.reload();
          } else {
            message.error(res.msg || $t("停用失败"));
          }
        } catch (error) {
          message.error($t("停用失败"));
        }
      }
    });
  }, []);

  /**
   * 启用课程（无需确认）
   */
  const handleActivate = useCallback(async (record: Course) => {
    try {
      const res = await updateCourseState({
        courseCode: record.courseCode,
        type: 'status',
        status: 1
      });
      if (res.code === 200) {
        message.success($t("启用成功"));
        actionRef.current?.reload();
      } else {
        message.error(res.msg || $t("启用失败"));
      }
    } catch (error) {
      message.error($t("启用失败"));
    }
  }, []);

  /**
   * 删除课程
   */
  const handleDelete = useCallback((record: Course) => {
    Modal.confirm({
      title: $t("是否确认删除？"),
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        try {
          const res = await deleteCourse(record.courseCode);
          if (res.code === 200) {
            message.success($t("删除成功"));
            actionRef.current?.reload();
          } else {
            message.error(res.msg || $t("删除失败"));
          }
        } catch (error) {
          message.error($t("删除失败"));
        }
      }
    });
  }, []);

  // ========== 搜索表单配置 ==========

  const formItems: FormItemType[] = useMemo(() => [{
    label: $t("课程名称"),
    name: 'name',
    type: 'input',
    props: {
      placeholder: $t("请输入课程名称"),
      allowClear: true
    }
  }, {
    label: $t("状态"),
    name: 'status',
    type: 'select',
    props: {
      placeholder: $t("请选择状态"),
      allowClear: true,
      options: [{
        label: $t("已发布"),
        value: 1
      }, {
        label: $t("已停用"),
        value: 0
      }]
    }
  }, {
    label: $t("可见性"),
    name: 'visibility',
    type: 'select',
    props: {
      placeholder: $t("请选择"),
      allowClear: true,
      options: getVisibilityOptions()
    }
  }, {
    label: $t("标签"),
    name: 'labelIds',
    render: ({
      value,
      form
    }) => <LabelSelect value={value} onChange={val => form?.setFieldsValue({
      label: val
    })} placeholder={$t("请选择标签")} showAdd={false} />
  }, {
    label: $t("创建时间"),
    name: 'createTime',
    type: 'dateRangePicker',
    props: {
      placeholder: [$t("开始时间"), $t("结束时间")],
      showTime: true
    }
  }, {
    label: $t("更新时间"),
    name: 'updateTime',
    type: 'dateRangePicker',
    props: {
      placeholder: [$t("开始时间"), $t("结束时间")],
      showTime: true
    }
  }, {
    label: $t("创建人"),
    name: 'createBy',
    type: 'input',
    props: {
      placeholder: $t("请输入创建人"),
      allowClear: true
    }
  }], []);
  // ========== 表格列配置 ==========

  const columns: ColumnType<Course>[] = useMemo(() => [{
    title: $t("课程名称"),
    dataIndex: 'name',
    width: 160,
    fixed: 'left',
    render: (name: string, record: Course) => <a onClick={() => {
      window.xDragonBridge.openNewTab({
        path: `/smart-trains/course/preview?courseCode=${record.courseCode}`,
        title: $t("预览 - {{name}}", {
          name
        })
      });
    }}>
          {name}
        </a>
  }, {
    title: $t("学习总人数"),
    dataIndex: 'learnerCount',
    width: 190,
    align: 'center'
  }, {
    title: $t("课程时长"),
    dataIndex: 'duration',
    width: 150,
    render: (duration: number) => formatDuration(duration)
  }, {
    title: $t("学习总时长"),
    dataIndex: 'learningDurationSeconds',
    width: 140,
    render: (seconds: number) => formatLearningDuration(seconds)
  }, {
    title: $t("状态"),
    dataIndex: 'status',
    width: 100,
    render: (status: number) => <Tag color={status === 1 ? 'green' : 'default'}>{status === 1 ? $t("已发布") : $t("已停用")}</Tag>
  }, {
    title: $t("可见性"),
    dataIndex: 'visibility',
    width: 100,
    render: (_: any, record: Course) => <VisibilityTag visibility={record.visibility} isHidden={record.isHidden} />
  }, {
    title: $t("分类"),
    dataIndex: 'categoryName',
    width: 150
  }, {
    title: $t("标签"),
    dataIndex: 'tags',
    width: 200,
    render: (labels: any[]) => {
      if (!labels || labels.length === 0) return '-';
      return labels.map(label => <Tag key={label.id} style={{
        marginBottom: 4
      }}>
            {label.name}
          </Tag>);
    }
  }, {
    title: $t("创建时间"),
    dataIndex: 'gmtCreate',
    width: 160,
    render: (time: string) => formatDateTime(time)
  }, {
    title: $t("创建人"),
    dataIndex: 'createBy',
    width: 120
  }, {
    title: $t("更新时间"),
    dataIndex: 'gmtUpdate',
    width: 160,
    render: (time: string) => formatDateTime(time)
  }, {
    title: $t("操作人"),
    dataIndex: 'updateBy',
    width: 120
  }], []);

  // ========== 操作列配置 ==========

  const columnAction: ColumnActionType = useCallback((record: Course) => {
    const actions: {
      label: string;
      onClick: () => void;
    }[] = [];
    if (canEdit) {
      actions.push({
        label: $t("编辑"),
        onClick: () => handleEdit(record)
      });
    }
    if (record.status === 1) {
      if (canDeactivate) {
        actions.push({
          label: $t("停用"),
          onClick: () => handleDeactivate(record)
        });
      }
    } else {
      if (canActivate) {
        actions.push({
          label: $t("启用"),
          onClick: () => handleActivate(record)
        });
      }
      if (canDelete) {
        actions.push({
          label: $t("删除"),
          onClick: () => handleDelete(record)
        });
      }
    }
    return actions;
  }, [
    canEdit,
    canDeactivate,
    canActivate,
    canDelete,
    handleEdit,
    handleDeactivate,
    handleActivate,
    handleDelete
  ]);

  // ========== 请求函数 ==========

  const request = useCallback(async (params: any) => {
    const {
      current,
      pageSize,
      createTime,
      updateTime,
      ...rest
    } = params;

    // 处理时间范围参数
    const createTimeStart = createTime?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const createTimeEnd = createTime?.[1]?.format('YYYY-MM-DD HH:mm:ss');
    const updateTimeStart = updateTime?.[0]?.format('YYYY-MM-DD HH:mm:ss');
    const updateTimeEnd = updateTime?.[1]?.format('YYYY-MM-DD HH:mm:ss');

    // 处理分类ID
    const categoryId = selectedCategoryId === 'all' ? undefined : Number(selectedCategoryId);
    try {
      const res = await queryCourseList({
        pageNo: current,
        pageSize,
        categoryId,
        createTimeStart,
        createTimeEnd,
        updateTimeStart,
        updateTimeEnd,
        ...rest
      });
      if (res.code !== 200) {
        message.error(res.msg || $t("获取课程列表失败"));
        return {
          data: [],
          success: false,
          total: 0
        };
      }
      return {
        data: res.data?.list || [],
        success: true,
        total: res.data?.total || 0
      };
    } catch (error) {
      message.error($t("获取课程列表失败"));
      return {
        data: [],
        success: false,
        total: 0
      };
    }
  }, [selectedCategoryId]);
  useEffect(() => {
    if (actionRef.current) {
      actionRef.current.reload();
    }
  }, [selectedCategoryId]);

  // ========== Toolbar 配置 ==========

  const toolbar = useMemo(
    () =>
      canAdd
        ? {
            right: (
              <button type="button" className="ant-btn ant-btn-primary" onClick={handleAdd}>
                {$t("新增课程")}
              </button>
            )
          }
        : undefined,
    [canAdd, handleAdd]
  );

  // ========== 表格配置 ==========

  const tableConfig = useMemo(() => ({
    toolbar,
    tableLayout: 'auto' as const, // 自动布局，根据内容调整列宽
    // columnActionWidth: 100, // 增加操作列宽度以容纳更多按钮
    columnActionCollapsedFrom: 1,
    // 表格列较多，容器宽度不够时自动横向滚动，避免每列被挤压折行/省略号
    scroll: { x: 'max-content' as const }
  }), [toolbar]);

  // ========== 渲染 ==========

  return <CURD actionRef={actionRef} formItems={formItems} columns={columns} columnAction={columnAction} request={request} table={tableConfig} />;
}