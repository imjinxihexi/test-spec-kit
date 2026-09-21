import { $t } from "@/i18n";
// src/pages/Category/Management/components/CategoryList/index.tsx
import { useContext, useMemo, useCallback, useRef, useEffect } from 'react';
import { Modal, message, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { CURD } from 'xui-pro';
import type { ColumnType, FormItemType, ColumnActionType } from 'xui-pro';
import { useCategoryTree } from '@/pages/Category/components';
import { Context } from '../../context';
import { queryCategoryPage, deleteCategory, type CategoryPageItem } from '@/api/xp-evi-learning-admin-eu-boot/category';
import useButtonAuth from '@/lib/useButtonAuth';
import useFillTableHeight from '@/hooks/useFillTableHeight';
import { UiPermissions } from '@/conf/permission';
import dayjs from 'dayjs';
import styles from './index.module.less';
interface CategoryListProps {
  listRefreshRef: React.MutableRefObject<(() => void) | null>;
}
export default function CategoryList({
  listRefreshRef
}: CategoryListProps) {
  const {
    selectedNodeId,
    refresh
  } = useCategoryTree();
  const {
    dispatch
  } = useContext(Context);
  const actionRef = useRef<any>(null);

  const canAdd = useButtonAuth(UiPermissions.CATEGORY_ADD);
  const canEdit = useButtonAuth(UiPermissions.CATEGORY_EDIT);
  const canAddChild = useButtonAuth(UiPermissions.CATEGORY_ADD_CHILD);
  const canDelete = useButtonAuth(UiPermissions.CATEGORY_DELETE);
  // 表格 body 高度：运行时测量剩余空间，适配搜索区收起/展开与窗口尺寸变化
  const { wrapRef, height: tableBodyHeight } = useFillTableHeight();

  // 将列表刷新方法暴露给父组件
  useEffect(() => {
    listRefreshRef.current = () => {
      actionRef.current?.reload();
    };
  }, [listRefreshRef]);

  // 处理编辑
  const handleEdit = useCallback((record: CategoryPageItem) => {
    dispatch({
      type: 'OPEN_EDIT_MODAL',
      payload: record
    });
  }, [dispatch]);

  // 处理新增子分类
  const handleAddChild = useCallback((record: CategoryPageItem) => {
    dispatch({
      type: 'OPEN_ADD_CHILD_MODAL',
      payload: record
    });
  }, [dispatch]);

  // 处理删除
  const handleDelete = useCallback((record: CategoryPageItem) => {
    Modal.confirm({
      title: $t("确认删除"),
      content: $t("确认删除该分类？"),
      okText: $t("确认"),
      cancelText: $t("取消"),
      onOk: async () => {
        const res: any = await deleteCategory(record.id);
        if (res.code === 200) {
          message.success($t("删除成功"));
          refresh();
          actionRef.current?.reload();
        } else {
          message.error(res.msg || $t("删除失败"));
        }
      }
    });
  }, [refresh]);

  // 打开新增弹窗
  const handleOpenAddModal = useCallback(() => {
    dispatch({
      type: 'OPEN_ADD_MODAL'
    });
  }, [dispatch]);

  // 监听selectedNodeId变化，触发列表刷新
  useEffect(() => {
    if (actionRef.current) {
      actionRef.current.reload();
    }
  }, [selectedNodeId]);

  // 搜索表单项
  const formItems: FormItemType[] = useMemo(() => [{
    label: $t("分类名称"),
    name: 'name',
    type: 'input',
    props: {
      placeholder: $t("请输入分类名称"),
      allowClear: true
    }
  }], []);

  // 列定义
  const columns: ColumnType<CategoryPageItem>[] = useMemo(() => [{
    title: $t("分类名称"),
    dataIndex: 'name',
    width: 200
  }, {
    title: $t("层级"),
    dataIndex: 'level',
    width: 100,
    render: (level: number) => $t(`Level {{level}}`, { level })
  }, {
    title: $t("上级分类"),
    dataIndex: 'parentName',
    // 上级分类的取值范围与「分类名称」一致，理论上可能很长，但绝大多数是短名；
    // 200px 实测偏宽，收到 160px 并开 ellipsis，超长时省略并由 antd 自带 title 悬浮显示全名
    width: 160,
    ellipsis: true,
    render: (parentName: string, record: CategoryPageItem) => {
      return record.parentId === 0 ? '-' : parentName || '-';
    }
  }, {
    title: $t("课程数"),
    dataIndex: 'courseCount',
    // 表头多语言（如 "Number of Courses" / "Número de cursos"）在 100px 下被省略，加宽至刚好放下的 150px
    width: 150
  }, {
    title: $t("创建时间"),
    dataIndex: 'createTime',
    width: 180,
    render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
  }, {
    title: $t("创建人"),
    dataIndex: 'createBy',
    width: 120
  }, {
    title: $t("更新时间"),
    dataIndex: 'updateTime',
    width: 180,
    render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'
  }, {
    title: $t("操作人"),
    dataIndex: 'updateBy',
    width: 120
  }], []);

  // 操作列配置
  const columnAction: ColumnActionType = useCallback((record: CategoryPageItem) => {
    const actions: {
      label: string;
      onClick: () => void;
    }[] = [];

    if (canEdit) {
      actions.push({
        label: $t('编辑'),
        onClick: () => handleEdit(record)
      });
    }

    if (canAddChild && record.level <= 4) {
      actions.push({
        label: $t('新增子分类'),
        onClick: () => handleAddChild(record)
      });
    }

    const canShowDelete =
      canDelete &&
      record.courseCount === 0 &&
      // 分类下有课件时同样不可删除：删后课件 category_id 悬空，课件列表分类列会显示异常
      record.coursewareCount === 0 &&
      record.level >= 2 &&
      record.level <= 4;
    if (canShowDelete) {
      actions.push({
        label: $t('删除'),
        onClick: () => handleDelete(record)
      });
    }
    return actions;
  }, [canEdit, canAddChild, canDelete, handleEdit, handleAddChild, handleDelete]);

  // 工具栏配置
  const toolbar = useMemo(
    () =>
      canAdd
        ? {
            right: (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal}>
                {$t('新增')}
              </Button>
            )
          }
        : undefined,
    [canAdd, handleOpenAddModal]
  );

  // 表格配置
  // scroll.y 由 useFillTableHeight 运行时测量得出，不再写死 calc(100vh - Npx)。
  // 原因：搜索区可收起/展开，表格 body 的起始位置是变化的，任何写死的偏移量都会在
  // 其中一个状态下失准（下方露白边 或 把分页顶出可视区）。
  //
  // scroll.x 用 'max-content' 而非固定值：固定值一旦大于各列宽度合计，
  // 多出的宽度会被没有显式宽度的操作列吸收，把操作列撑得很宽；操作列是左侧固定列，
  // 横向滚动时会遮住相邻的「分类名称」列，表现为表格中间出现一片空白。
  // 与课件列表保持一致的写法，后续加列/改列宽也无需再同步维护这个数字。
  const table = useMemo(
    () => ({
      scroll: {
        x: 'max-content' as const,
        y: tableBodyHeight
      },
      toolbar,
      // 操作列：「编辑」+ 折叠的「...」需并排显示，100px 会换行，取 110px
      columnActionWidth: 110,
      columnActionCollapsedFrom: 1
    }),
    [toolbar, tableBodyHeight]
  );

  // 请求函数
  const request = useCallback(async (params: any) => {
    const {
      current,
      pageSize,
      name
    } = params;
    const res: any = await queryCategoryPage({
      pageNo: current,
      pageSize: pageSize,
      name: name || undefined,
      categoryId: selectedNodeId === 'all' ? undefined : Number(selectedNodeId)
    });
    if (res.code !== 200) {
      message.error(res.msg || $t("获取分类列表失败"));
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
  }, [selectedNodeId]);
  return <div className={styles.listContainer} ref={wrapRef}>
      <CURD actionRef={actionRef} formItems={formItems} columns={columns} columnAction={columnAction} table={table} request={request} />
    </div>;
}