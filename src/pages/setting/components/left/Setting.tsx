/*
 * @Author: chengtianqing
 * @Date: 2021-06-14 01:33:29
 * @LastEditTime: 2021-06-14 13:37:21
 * @LastEditors: chengtianqing
 * @Description:
 */
import React, { Fragment, useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Space,
  Select,
  Drawer,
  Dropdown,
  Menu,
  Popover,
  Tooltip,
  message,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EllipsisOutlined,
  HighlightOutlined,
  EditOutlined,
} from '@ant-design/icons';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import isObject from 'lodash/isObject';
import isEqual from 'lodash/isEqual';
import CodeDrawer from '../codeEditor/CodeDrawer';
import { getUid } from '@/utils';
import { FormComponentObj, ComponentsDSL } from '../../const/componentDSL';
import styles from './Setting.less';
interface IProps {
  vueColRender?: any;
  component?: any;
  handleCB?: any;
}

const { Option } = Select;

const Setting = (props: IProps) => {
  console.log('props', props);
  const { componentName, children, uuid } = props.component || {};
  const [visible, setVisible] = useState(false);
  const [codeType, setCodeType] = useState('component') as any;
  const [codeValue, setCodeValue] = useState('');
  const [codeKey, setCodeKey] = useState(-1);
  const [renderList, setRenderList] = useState([]);
  const [initValues, setInitValues] = useState({});
  const [form] = Form.useForm();
  useEffect(() => {
    const getInitialValue = () => {
      switch (componentName) {
        case 'Table':
          const obj = {
            renderTime: '时间',
            renderAmount: '金额',
            renderOperate: '操作',
            renderDefault: '默认',
          };
          const list: any = Object.entries(obj).map(([value, label]) => ({
            value,
            label,
          }));
          setRenderList(list);
          return (children || [])
            .map((item: any) => {
              if (item.key) {
                return {
                  key: item.key,
                  label: item.label,
                  renderKey: item.renderKey,
                };
              }
              return null;
            })
            .filter(Boolean);
        case 'DIV':
          return (children || [])
            .map((item: any, i: number) => {
              if (typeof item.children === 'string') {
                return {
                  oldIndex: i,
                  children: item.children,
                };
              }
              return null;
            })
            .filter(Boolean);
        case 'Form':
        default:
          let nodes = children;
          if (componentName !== 'Form') {
            nodes = [props.component];
          }
          return (nodes || [])
            .map((item: any) => {
              if (item.key) {
                return {
                  key: item.key,
                  label: item.label,
                  type: item?.children[0]?.componentName,
                };
              }
              return null;
            })
            .filter(Boolean);
      }
    };
    const configs = getInitialValue();
    form.setFieldsValue({
      configs,
    });
    setInitValues(configs);
  }, [uuid]);

  const handleShowCode = (type: string, index: number = 0) => {
    if (type === 'component') {
      if (index === -1) {
        const configs = form.getFieldValue('configs');
        if (!isEqual(initValues, configs)) {
          message.warning('内容已更改但未保存，请先提交再操作');
          return;
        }
        setCodeValue(props.component);
      } else {
        const configs = form.getFieldValue('configs');
        const { label, key, type } = configs[index];
        // @ts-ignore
        const childNode = ComponentsDSL[type];
        const target = {
          ...children[index],
          label,
          key,
          children: [childNode],
        };
        setCodeValue(target);
      }
    } else if (type === 'html') {
      const configs = form.getFieldValue('configs');
      const target = configs[index];
      const str = props.vueColRender[target.renderKey](target.key);
      const value = target.render ? target.render : str;
      setCodeValue(value);
    }
    setCodeKey(index);
    setCodeType(type);
    setVisible(true);
  };

  const handleCodeCB = (obj: any) => {
    const { visible, code } = obj;
    let newCode = code;
    setVisible(visible);
    if (props.component && !isEmpty(code)) {
      if (codeKey > -1) {
        if (codeType === 'html') {
          children[codeKey].render = code;
          newCode = props.component;
        } else if (codeType === 'component') {
          // 改变原数据component.children
          children.splice(codeKey, 1, code);
          newCode = props.component;
        }
      }
      newCode['uuid'] = getUid(); // 更新uuid，让监听uuid变化的组件都能同步更新
      props.handleCB && props.handleCB(newCode);
    }
  };

  const onFinish = (values: any) => {
    console.log('Received values of form:', values);
    const { configs } = values || {};
    if (configs) {
      const component = cloneDeep(props.component);
      switch (componentName) {
        case 'Table':
          let tableChild = [];
          if (configs.length) {
            tableChild = configs.map((item: any, i: number) => {
              const { key, label, renderKey } = item;
              return { key, label, renderKey };
            });
          }
          component.children = tableChild;
          break;
        case 'Form':
          const tIndex = component.children.findIndex((it: any) => !it.key);
          const optItem =
            tIndex > -1 ? component.children.splice(tIndex, 1) : [];
          let formChild = [];
          if (configs.length) {
            formChild = configs.map((item: any, i: number) => {
              // @ts-ignore
              const childNode = ComponentsDSL[item.type];
              return {
                ...component.children[i],
                key: item.key,
                label: item.label,
                children: [childNode],
              };
            });
          }
          component.children = [].concat(formChild, optItem);
          break;
        case 'DIV':
          if (configs.length) {
            configs.forEach((item: any) => {
              if (item.oldIndex !== undefined) {
                component.children[item.oldIndex] = {
                  ...component.children[item.oldIndex],
                  children: item.children,
                };
              }
            });
          }
          break;
        default:
          if (configs.length) {
            component['key'] = configs[0].key;
            component['label'] = configs[0].label;
            // @ts-ignore
            component['children'] = [ComponentsDSL[configs[0].type]];
          }
          break;
      }
      component['uuid'] = getUid(); // 更新uuid，让监听uuid变化的组件都能同步更新
      props.handleCB && props.handleCB(component);
      message.success('更新成功！');
    }
  };

  const generateFormItem = (fields: any, remove: any, move: any, add: any) => {
    switch (componentName) {
      case 'Table':
        return (
          <>
            {fields.map((field: any, i: number) => (
              <div key={field.key} className={styles['list-item']}>
                <Space key={field.key} align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'label']}
                    fieldKey={[field.fieldKey, 'label']}
                    rules={[{ required: true, message: '请输入label' }]}
                  >
                    <Input placeholder="label" allowClear />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    name={[field.name, 'key']}
                    fieldKey={[field.fieldKey, 'key']}
                    rules={[{ required: true, message: '请输入key' }]}
                  >
                    <Input placeholder="key" allowClear />
                  </Form.Item>
                </Space>
                <Space align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'renderKey']}
                    fieldKey={[field.fieldKey, 'renderKey']}
                    rules={[{ required: true, message: '请选择处理类型' }]}
                  >
                    <Select
                      style={{ width: 163 }}
                      placeholder="处理类型"
                      allowClear
                    >
                      {renderList.map(({ value, label }) => (
                        <Option key={value} value={value}>
                          {label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="link"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      onClick={() => move(i, i - 1)}
                    />
                    <Button
                      type="link"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => move(i, i + 1)}
                    />
                    <Button
                      type="link"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                    <Tooltip title="自定义渲染列-vue">
                      <Button
                        type="link"
                        icon={<HighlightOutlined />}
                        onClick={() => handleShowCode('html', i)}
                      ></Button>
                    </Tooltip>
                  </Form.Item>
                </Space>
              </div>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                style={{ width: '100%' }}
                icon={<PlusOutlined />}
              ></Button>
            </Form.Item>
          </>
        );
      case 'Form':
        return (
          <>
            {fields.map((field: any, i: number) => (
              <div key={field.key} className={styles['list-item']}>
                <Space align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'label']}
                    fieldKey={[field.fieldKey, 'label']}
                    rules={[{ required: true, message: '请输入label' }]}
                  >
                    <Input placeholder="label" allowClear />
                  </Form.Item>

                  <Form.Item
                    {...field}
                    name={[field.name, 'key']}
                    fieldKey={[field.fieldKey, 'key']}
                    rules={[{ required: true, message: '请输入key' }]}
                  >
                    <Input placeholder="key" allowClear />
                  </Form.Item>
                </Space>
                <Space align="baseline">
                  <Form.Item
                    {...field}
                    name={[field.name, 'type']}
                    fieldKey={[field.fieldKey, 'type']}
                    rules={[{ required: true, message: '请选择类型' }]}
                  >
                    <Select
                      style={{ width: 163 }}
                      placeholder="类型"
                      allowClear
                    >
                      {Object.entries(FormComponentObj).map(([k, v]) => (
                        <Option key={k} value={k}>
                          {v}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="link"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      onClick={() => move(i, i - 1)}
                    />
                    <Button
                      type="link"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => move(i, i + 1)}
                    />
                    <Button
                      type="link"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    />
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => handleShowCode('component', i)}
                    ></Button>
                  </Form.Item>
                </Space>
              </div>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                style={{ width: '100%' }}
                icon={<PlusOutlined />}
              ></Button>
            </Form.Item>
          </>
        );
      case 'DIV':
        return (
          <>
            {fields.map((field: any, i: number) => (
              <Space key={field.key} align="baseline">
                <Form.Item
                  {...field}
                  name={[field.name, 'children']}
                  fieldKey={[field.fieldKey, 'children']}
                  rules={[{ required: true, message: '请输入文本' }]}
                >
                  <Input placeholder="文本" allowClear />
                </Form.Item>
              </Space>
            ))}
          </>
        );
      default:
        return (
          <>
            {fields.map((field: any, i: number) => (
              <Space key={field.key} align="baseline">
                <Form.Item
                  {...field}
                  name={[field.name, 'label']}
                  fieldKey={[field.fieldKey, 'label']}
                  rules={[{ required: true, message: '请输入label' }]}
                >
                  <Input placeholder="label" allowClear />
                </Form.Item>

                <Form.Item
                  {...field}
                  name={[field.name, 'key']}
                  fieldKey={[field.fieldKey, 'key']}
                  rules={[{ required: true, message: '请输入key' }]}
                >
                  <Input placeholder="key" allowClear />
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, curValues) =>
                    prevValues.type !== curValues.type
                  }
                >
                  {() => (
                    <Form.Item
                      {...field}
                      name={[field.name, 'type']}
                      fieldKey={[field.fieldKey, 'type']}
                      rules={[{ required: true, message: '请选择类型' }]}
                    >
                      <Select
                        style={{ width: 130 }}
                        placeholder="类型"
                        allowClear
                      >
                        {Object.entries(FormComponentObj).map(([k, v]) => (
                          <Option key={k} value={k}>
                            {v}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                </Form.Item>
              </Space>
            ))}
          </>
        );
    }
  };

  return (
    <>
      <Form
        form={form}
        size="small"
        className={styles['setting-container']}
        name="dynamic_form_nest_item"
        onFinish={onFinish}
      >
        <Form.List name="configs">
          {(fields, { add, remove, move }) => (
            <>{generateFormItem(fields, remove, move, add)}</>
          )}
        </Form.List>
        {props.component && (
          <Form.Item>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
            <Button
              style={{ marginLeft: 8 }}
              type="primary"
              danger
              onClick={() => handleShowCode('component', -1)}
            >
              代码编辑
            </Button>
          </Form.Item>
        )}
      </Form>
      <CodeDrawer
        value={codeValue}
        visible={visible}
        type={codeType}
        handleCB={(val: any) => handleCodeCB(val)}
      />
    </>
  );
};

export default Setting;
