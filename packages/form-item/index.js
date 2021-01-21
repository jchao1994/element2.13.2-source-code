import ElFormItem from '../form/src/form-item';

/* istanbul ignore next */tem
// Vue.use(ElFormItem)执行这里的install方法，注册全局ElFormItem组件
ElFormItem.install = function(Vue) {
  Vue.component(ElFormItem.name, ElFormItem);
};

export default ElFormItem;
