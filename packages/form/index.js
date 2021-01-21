import ElForm from './src/form';

/* istanbul ignore next */
// Vue.use(ElForm)执行这里的install方法，注册全局ElForm组件
ElForm.install = function(Vue) {
  Vue.component(ElForm.name, ElForm);
};

export default ElForm;
