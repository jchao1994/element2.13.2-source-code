<template>
  <div class="el-form-item" :class="[{
      'el-form-item--feedback': elForm && elForm.statusIcon,
      'is-error': validateState === 'error',
      'is-validating': validateState === 'validating',
      'is-success': validateState === 'success',
      'is-required': isRequired || required,
      'is-no-asterisk': elForm && elForm.hideRequiredAsterisk
    },
    sizeClass ? 'el-form-item--' + sizeClass : ''
  ]">
    <!-- label区域 -->
    <label-wrap
      :is-auto-width="labelStyle && labelStyle.width === 'auto'"
      :update-all="form.labelWidth === 'auto'">
      <label :for="labelFor" class="el-form-item__label" :style="labelStyle" v-if="label || $slots.label">
        <slot name="label">{{label + form.labelSuffix}}</slot>
      </label>
    </label-wrap>
    <div class="el-form-item__content" :style="contentStyle">
      <!-- 默认插槽 -->
      <slot></slot>
      <!-- 错误信息提示区域 -->
      <transition name="el-zoom-in-top">
        <slot
          v-if="validateState === 'error' && showMessage && form.showMessage"
          name="error"
          :error="validateMessage">
          <div
            class="el-form-item__error"
            :class="{
              'el-form-item__error--inline': typeof inlineMessage === 'boolean'
                ? inlineMessage
                : (elForm && elForm.inlineMessage || false)
            }"
          >
            {{validateMessage}}
          </div>
        </slot>
      </transition>
    </div>
  </div>
</template>
<script>
  import AsyncValidator from 'async-validator';
  import emitter from 'element-ui/src/mixins/emitter';
  import objectAssign from 'element-ui/src/utils/merge';
  import { noop, getPropByPath } from 'element-ui/src/utils/util';
  import LabelWrap from './label-wrap';
  export default {
    name: 'ElFormItem',

    componentName: 'ElFormItem',

    mixins: [emitter],

    provide() {
      return {
        elFormItem: this
      };
    },

    inject: ['elForm'], // 接收整个el-form组件

    props: {
      label: String, // 单个label
      labelWidth: String,
      prop: String, // 单个数据的key
      required: { // 可以直接传入required设置规则，也可以在rules中设置required规则
        type: Boolean,
        default: undefined
      },
      rules: [Object, Array],
      error: String,
      validateStatus: String,
      for: String,
      inlineMessage: {
        type: [String, Boolean],
        default: ''
      },
      showMessage: {
        type: Boolean,
        default: true
      },
      size: String
    },
    components: {
      // use this component to calculate auto width
      LabelWrap
    },
    watch: {
      error: {
        immediate: true,
        handler(value) {
          this.validateMessage = value;
          this.validateState = value ? 'error' : '';
        }
      },
      validateStatus(value) {
        this.validateState = value;
      }
    },
    computed: {
      labelFor() {
        return this.for || this.prop;
      },
      labelStyle() {
        const ret = {};
        if (this.form.labelPosition === 'top') return ret;
        const labelWidth = this.labelWidth || this.form.labelWidth;
        if (labelWidth) {
          ret.width = labelWidth;
        }
        return ret;
      },
      contentStyle() {
        const ret = {};
        const label = this.label;
        if (this.form.labelPosition === 'top' || this.form.inline) return ret;
        if (!label && !this.labelWidth && this.isNested) return ret;
        const labelWidth = this.labelWidth || this.form.labelWidth;
        if (labelWidth === 'auto') {
          if (this.labelWidth === 'auto') {
            ret.marginLeft = this.computedLabelWidth;
          } else if (this.form.labelWidth === 'auto') {
            ret.marginLeft = this.elForm.autoLabelWidth;
          }
        } else {
          ret.marginLeft = labelWidth;
        }
        return ret;
      },
      // 最近的el-form标签
      form() {
        let parent = this.$parent;
        let parentName = parent.$options.componentName;
        while (parentName !== 'ElForm') {
          if (parentName === 'ElFormItem') {
            this.isNested = true;
          }
          parent = parent.$parent;
          parentName = parent.$options.componentName;
        }
        return parent;
      },
      // el-form中的表单数据model中的初始值
      fieldValue() {
        const model = this.form.model;
        if (!model || !this.prop) { return; }

        let path = this.prop;
        if (path.indexOf(':') !== -1) {
          path = path.replace(/:/, '.');
        }

        return getPropByPath(model, path, true).v;
      },
      isRequired() {
        let rules = this.getRules();
        let isRequired = false;

        if (rules && rules.length) {
          rules.every(rule => {
            if (rule.required) {
              isRequired = true;
              return false; // 跳出every函数的遍历
            }
            return true;
          });
        }
        return isRequired;
      },
      _formSize() {
        return this.elForm.size;
      },
      elFormItemSize() {
        return this.size || this._formSize;
      },
      sizeClass() {
        return this.elFormItemSize || (this.$ELEMENT || {}).size;
      }
    },
    data() {
      return {
        validateState: '',
        validateMessage: '',
        validateDisabled: false,
        validator: {},
        isNested: false,
        computedLabelWidth: ''
      };
    },
    methods: {
      validate(trigger, callback = noop) {
        this.validateDisabled = false;
        // 提取和这个trigger有关的所有rules
        // trigger为空字符串''，表示校验所有rules
        const rules = this.getFilteredRule(trigger);
        if ((!rules || rules.length === 0) && this.required === undefined) {
          callback();
          return true;
        }

        this.validateState = 'validating';

        const descriptor = {};
        // 移除rules中的trigger属性
        if (rules && rules.length > 0) {
          rules.forEach(rule => {
            delete rule.trigger;
          });
        }
        descriptor[this.prop] = rules;

        // 使用async-validator库进行校验 https://github.com/yiminghe/async-validator
        const validator = new AsyncValidator(descriptor);
        const model = {};

        model[this.prop] = this.fieldValue; // 初始值
        
        // errors是校验不通过的错误信息数组
        // invalidFields是未通过校验的数据对象
        validator.validate(model, { firstFields: true }, (errors, invalidFields) => {
          this.validateState = !errors ? 'success' : 'error';
          this.validateMessage = errors ? errors[0].message : '';

          callback(this.validateMessage, invalidFields);
          // 触发el-form上传入的validate方法，一般不传
          this.elForm && this.elForm.$emit('validate', this.prop, !errors, this.validateMessage || null);
        });
      },
      // 清空校验
      clearValidate() {
        this.validateState = '';
        this.validateMessage = '';
        this.validateDisabled = false;
      },
      // 重置单个表单项
      resetField() {
        this.validateState = '';
        this.validateMessage = '';

        let model = this.form.model;
        let value = this.fieldValue;
        let path = this.prop;
        if (path.indexOf(':') !== -1) {
          path = path.replace(/:/, '.');
        }

        let prop = getPropByPath(model, path, true);

        this.validateDisabled = true;
        if (Array.isArray(value)) {
          prop.o[prop.k] = [].concat(this.initialValue);
        } else {
          prop.o[prop.k] = this.initialValue;
        }

        // reset validateDisabled after onFieldChange triggered
        this.$nextTick(() => {
          this.validateDisabled = false;
        });

        this.broadcast('ElTimeSelect', 'fieldReset', this.initialValue);
      },
      // 获取this.prop对应的rule数组
      getRules() {
        let formRules = this.form.rules; // el-form的rules
        const selfRules = this.rules; // el-form-item的rules
        const requiredRule = this.required !== undefined ? { required: !!this.required } : []; // 直接给el-form-item传的required prop，没有传的话会根据校验规则生成

        const prop = getPropByPath(formRules, this.prop || ''); // { o: formRules, k: this.prop, v: formRules[this.prop]}
        formRules = formRules ? (prop.o[this.prop || ''] || prop.v) : []; // this.prop对应的rule数组

        return [].concat(selfRules || formRules || []).concat(requiredRule);
      },
      // 获取this.prop对应的 包含trigger的 rule数组
      getFilteredRule(trigger) {
        const rules = this.getRules(); // this.prop对应的rule数组

        return rules.filter(rule => {
          if (!rule.trigger || trigger === '') return true;
          if (Array.isArray(rule.trigger)) {
            return rule.trigger.indexOf(trigger) > -1;
          } else {
            return rule.trigger === trigger;
          }
        }).map(rule => objectAssign({}, rule));
      },
      onFieldBlur() {
        this.validate('blur');
      },
      onFieldChange() {
        if (this.validateDisabled) {
          this.validateDisabled = false;
          return;
        }

        this.validate('change');
      },
      updateComputedLabelWidth(width) {
        this.computedLabelWidth = width ? `${width}px` : '';
      },
      // 添加监听事件进行数据验证
      addValidateEvents() {
        const rules = this.getRules();

        if (rules.length || this.required !== undefined) {
          this.$on('el.form.blur', this.onFieldBlur);
          this.$on('el.form.change', this.onFieldChange);
        }
      },
      // 移除所有的$on事件
      removeValidateEvents() {
        this.$off();
      }
    },
    mounted() {
      // 添加el-form-item到校验列表fields中
      // el-form-item有prop才视为需要校验
      if (this.prop) {
        this.dispatch('ElForm', 'el.form.addField', [this]);

        let initialValue = this.fieldValue;
        if (Array.isArray(initialValue)) {
          initialValue = [].concat(initialValue);
        }
        Object.defineProperty(this, 'initialValue', {
          value: initialValue
        });

        this.addValidateEvents();
      }
    },
    // 从校验列表fields中移除el-form-item
    beforeDestroy() {
      this.dispatch('ElForm', 'el.form.removeField', [this]);
    }
  };
</script>
