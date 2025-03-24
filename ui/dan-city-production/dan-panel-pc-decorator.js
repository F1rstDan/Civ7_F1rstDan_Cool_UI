import { GetProductionItems } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';

// 保存组件引用而不是数据
let decoratedComponent = null;

// 每次调用时从组件获取最新数据
export const getItems = () => {
    if (decoratedComponent && decoratedComponent.items) {
        return decoratedComponent.items;
    }
    return null;
};

// 获取购买模式的数据
export const getItemsForBuy = () => {
    if (decoratedComponent && decoratedComponent.itemsDataForBuy) {
        return decoratedComponent.itemsDataForBuy;
    }
    return null;
};

// 每次调用时从组件获取最新数据
export const findItem = (category,type) => {
    if (decoratedComponent && decoratedComponent.items && decoratedComponent.items[category]) {
        return decoratedComponent.items[category].find(item => item.type === type);
    }
    console.error("F1rstDan findItem is undefined")
    return null;
};

// 获取购买模式下特定类别和类型的项目
export const findItemForBuy = (category,type) => {
    if (decoratedComponent && decoratedComponent.itemsDataForBuy && decoratedComponent.itemsDataForBuy[category]) {
        return decoratedComponent.itemsDataForBuy[category].find(item => item.type === type);
    }
    console.error("F1rstDan findItemForBuy is undefined")
    return null;
};

export class DanProductionChooserScreenDecorator {

    constructor(component) {
        this.component = component;
        // 保存组件引用而不是数据
        decoratedComponent = component;
        // 初始化购买模式数据
        // this.component.itemsDataForBuy = null;
        // 初始化购买模式数据 - 使用getter替代直接赋值
        // 定义itemsDataForBuy的getter，类似于原始items的getter
        Object.defineProperty(this.component, 'itemsDataForBuy', {
            get: function() {
                // 如果为空，则自动获取购买模式的数据
                this._itemsDataForBuy ?? (this._itemsDataForBuy = GetProductionItems(
                    this.city, 
                    this.recommendations, 
                    this.playerGoldBalance, 
                    true, // 强制为购买模式
                    this.viewHidden, 
                    this.uqInfo
                ));
                return this._itemsDataForBuy;
            },
            set: function(value) {
                this._itemsDataForBuy = value;
            }
        });
        
        // 初始化内部存储属性
        this.component._itemsDataForBuy = null;
        
        // 扩展原始updateItems方法 - 修复版本
        if (this.component.updateItems) {
            // 保存原始UpdateGate实例
            const originalUpdateItems = this.component.updateItems;
            // 保存原始call方法的引用
            const originalCall = originalUpdateItems.call;
            
            // 重写call方法
            originalUpdateItems.call = function(...args) {
                // 调用原始call方法
                const result = originalCall.apply(this, args);
                // 在原方法后执行自定义代码 - 更新购买模式数据
                const component = decoratedComponent;
                if (component && component.city) {
                    if (!component.isPurchase) {
                        // 如果当前不是购买模式，则获取购买模式的数据
                        component.itemsDataForBuy = GetProductionItems(
                            component.city, 
                            component.recommendations, 
                            component.playerGoldBalance, 
                            true, // 强制为购买模式
                            component.viewHidden, 
                            component.uqInfo
                        );
                    } else {
                        // 如果当前是购买模式，则购买模式数据等于当前数据
                        component.itemsDataForBuy = component._items;
                    }
                }
                return result;
            };
            // 确保其他方法和属性保持不变
            Object.keys(originalCall).forEach(key => {
                if (typeof originalCall[key] === 'function') {
                    originalUpdateItems.call[key] = originalCall[key].bind(originalCall);
                } else {
                    originalUpdateItems.call[key] = originalCall[key];
                }
            });
        }
    }

    beforeAttach() {
    }

    afterAttach() {
    }

    beforeDetach() {
    }

    afterDetach() {
    }
    
}

Controls.decorate('panel-production-chooser', (component) => new DanProductionChooserScreenDecorator(component));