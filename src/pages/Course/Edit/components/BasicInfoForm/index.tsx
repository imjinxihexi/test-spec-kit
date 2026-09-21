import { $t } from "@/i18n";
import { useContext, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Modal, Switch, Form } from 'antd';
import { LayoutForm } from 'xui-pro';
import type { FormItemType } from 'xui-pro';
import { Context } from '../../context';
import CategoryTreeSelect from '@/pages/Course/components/CategoryTreeSelect';
import CoverUpload from '@/pages/Courseware/components/CoverUpload';
import LabelSelect from '@/pages/Courseware/components/LabelSelect';
import LanguageSelect from '@/pages/Courseware/components/LanguageSelect';
import VisibilityConfig from '@/components/VisibilityConfig';
import styles from './index.module.less';
export interface BasicInfoFormRef {
  validate: () => Promise<boolean>;
}
const BasicInfoForm = forwardRef<BasicInfoFormRef>((props, ref) => {
  const {
    state,
    dispatch
  } = useContext(Context);
  const [form] = Form.useForm();
  const handleToggleHasChapter = useCallback((checked: boolean) => {
    // 只在有课件时弹窗确认
    if (state.coursewares.length > 0) {
      const confirmMessage = checked ? $t("切换到区分章节后，所有课件将被移入\"章节1\"，是否确认？") : $t("取消区分章节后，所有章节将被删除，课件将平铺显示，是否确认？");
      Modal.confirm({
        title: $t("确认切换"),
        content: confirmMessage,
        onOk: () => {
          dispatch({
            type: 'TOGGLE_HAS_CHAPTER',
            payload: checked
          });
        }
      });
    } else {
      // 无课件时直接切换
      dispatch({
        type: 'TOGGLE_HAS_CHAPTER',
        payload: checked
      });
    }
  }, [state.coursewares.length, dispatch]);
  const handleValuesChange = useCallback((changedValues: any) => {
    // 如果切换了语言，清空课件列表
    if ('lang' in changedValues && changedValues.lang !== state.basicInfo.lang) {
      if (state.coursewares.length > 0) {
        Modal.confirm({
          title: $t("确认切换语言"),
          content: $t("切换语言后，已添加的课件将被清空，是否确认？"),
          onOk: () => {
            dispatch({
              type: 'SET_BASIC_INFO',
              payload: changedValues
            });
            dispatch({
              type: 'CLEAR_COURSEWARES'
            });
          }
        });
      } else {
        dispatch({
          type: 'SET_BASIC_INFO',
          payload: changedValues
        });
      }
    } else {
      dispatch({
        type: 'SET_BASIC_INFO',
        payload: changedValues
      });
    }
  }, [dispatch, state.basicInfo.lang, state.coursewares.length]);

  // 暴露校验方法
  useImperativeHandle(ref, () => ({
    validate: async () => {
      try {
        await form.validateFields();
        return true;
      } catch (error) {
        return false;
      }
    }
  }), [form]);
  const formItems: FormItemType[] = useMemo(() => [{
    label: $t("课程名称"),
    name: 'name',
    type: 'input',
    required: true,
    props: {
      placeholder: $t("请输入课程名称"),
      maxLength: 300
    }
  }, {
    label: $t("课程分类"),
    name: 'categoryId',
    required: true,
    render: ({
      value
    }) => <CategoryTreeSelect value={value} readonly={state.mode === 'detail'} onChange={val => {
      form.setFieldsValue({
        categoryId: val
      });
    }} />
  }, {
    label: $t("标签"),
    name: 'labels',
    render: ({
      value
    }) => <LabelSelect value={value} onChange={val => {
      form.setFieldsValue({
        labels: val
      });
    }} placeholder={$t("请选择标签")} showDelete />
  }, {
    label: $t("语言"),
    name: 'lang',
    required: true,
    render: ({
      value
    }) => <LanguageSelect value={value} onChange={val => {
      form.setFieldsValue({
        lang: val
      });
    }} disabled={state.mode === 'detail'} />
  }, {
    label: $t("简介"),
    name: 'introduction',
    type: 'textarea',
    props: {
      placeholder: $t("请输入课程简介"),
      rows: 4,
      maxLength: 500
    }
  }, {
    label: $t("是否区分章节"),
    name: 'hasChapter',
    required: true,
    render: ({
      value
    }) => state.mode === 'detail' ? <span>{value ? $t("是") : $t("否")}</span> : <Switch checked={value} onChange={checked => {
      form.setFieldsValue({
        hasChapter: checked
      });
      handleToggleHasChapter(checked);
    }} />
  }, {
    label: $t("学习模式"),
    name: 'studyMode',
    type: 'radio',
    required: true,
    hidden: !state.basicInfo.hasChapter,
    props: {
      options: [{
        label: $t("顺序学习"),
        value: 1
      }, {
        label: $t("自由学习"),
        value: 2
      }]
    },
    render: state.mode === 'detail' ? ({
      value
    }) => {
      const option = [{
        label: $t("顺序学习"),
        value: 1
      }, {
        label: $t("自由学习"),
        value: 2
      }].find(opt => opt.value === value);
      return <span>{option?.label || '-'}</span>;
    } : undefined
  }, {
    label: $t("封面"),
    name: 'coverUrl',
    required: true,
    span: 24,
    render: ({
      value
    }) => <CoverUpload value={value} onChange={url => {
      form.setFieldsValue({
        coverUrl: url
      });
    }} disabled={state.mode === 'detail'} defaultCovers={state.ui.systemCovers} />
  }], [state.basicInfo, state.ui.systemCovers, state.mode, form, handleToggleHasChapter, dispatch]);
  return <>
      <div className={styles.container}>
        <h3 className={styles.title}>{$t("基础信息")}</h3>
        <LayoutForm form={form} formItems={formItems} initialValues={state.basicInfo} onValuesChange={handleValuesChange} layout="horizontal" span={8} mode='form' readonly={state.mode === 'detail'} />
      </div>
      <div className={styles.container}>
        <h3 className={styles.title}>{$t("可见范围")}</h3>
        <div className={styles.visibilityControl}>
          <VisibilityConfig
            value={{
              visibility: state.basicInfo.visibility,
              rules: state.basicInfo.visibilityRules
            }}
            disabled={state.mode === 'detail'}
            onChange={v => {
              dispatch({
                type: 'SET_BASIC_INFO',
                payload: {
                  visibility: v.visibility,
                  visibilityRules: v.rules
                }
              });
            }}
          />
        </div>
      </div>
    </>;
});
BasicInfoForm.displayName = 'BasicInfoForm';
export default BasicInfoForm;