/**
 * sourceURL=file:///base-standard/ui/production-chooser/panel-production-chooser.js
 */
import { g as GetProductionItems } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';

// 保存组件引用以便 helper 函数访问，万能入口
// decoratedComponent = 注入当前选择城市的内部组件，可以直接访问内部数据，不需要`export function`。`UI.Player.getHeadSelectedCity()`限制太多。
let decoratedComponent = null;
let itemsIndex = null;
let itemsForBuyIndex = null;

const buildItemsIndex = (items) => {
    if (!items) return null;
    const index = new Map();
    Object.entries(items).forEach(([category, list]) => {
        if (!Array.isArray(list)) return;
        const typeMap = new Map();
        list.forEach(item => {
            if (item?.type != null) {
                typeMap.set(item.type, item);
            }
        });
        if (typeMap.size > 0) {
            index.set(category, typeMap);
        }
    });
    return index;
};

const getFromIndex = (index, category, type) => {
    return index?.get(category)?.get(type) ?? null;
};

/**
 * 检查当前是否处于购买模式
 * @returns {boolean} 是否为购买模式
 */
export function getIsPurchaseMode() {
    return decoratedComponent?.isPurchase ?? false;
}

/**
 * 获取当前组件的生产项目数据
 * @returns {Object|null} 生产项目数据
 */
export function getItems() {
    return decoratedComponent?.items ?? null;
}

/**
 * 获取购买模式下的生产项目数据
 * @returns {Object|null} 购买模式数据
 */
export function getItemsForBuy() {
    return decoratedComponent?.itemsDataForBuy ?? null;
}
/**
 * 刷新购买模式数据
 * @description 刷新当前城市的购买模式数据，包括项目列表和推荐项目
 */
export function refreshPurchaseData() {
    if (!decoratedComponent?.city || !decoratedComponent?.updateItems) return;
    decoratedComponent.updateItems.call(decoratedComponent);
    decoratedComponent.itemsDataForBuy = GetProductionItems(
        decoratedComponent.city,
        decoratedComponent.recommendations,
        decoratedComponent.playerGoldBalance,
        true,   // 强制为购买模式
        decoratedComponent.viewHidden,
        decoratedComponent.uqInfo
    );
}
/**
 * 在当前项目中查找特定类型的项目
 * @param {string} category - 项目类别
 * @param {string} type - 项目类型
 * @returns {Object|null} 找到的项目或 null
 */
export function findItem(category, type) {
    const cachedItem = getFromIndex(itemsIndex, category, type);
    if (cachedItem) return cachedItem;
    return decoratedComponent?.items?.[category]?.find(item => item.type === type) ?? null;
}

/**
 * 在购买模式数据中查找特定类型的项目
 * @param {string} category - 项目类别
 * @param {string} type - 项目类型
 * @returns {Object|null} 找到的项目或 null
 */
export function findItemForBuy(category, type) {
    const cachedItem = getFromIndex(itemsForBuyIndex, category, type);
    if (cachedItem) return cachedItem;
    return decoratedComponent?.itemsDataForBuy?.[category]?.find(item => item.type === type) ?? null;
}

export class DanProductionChooserScreenDecorator {

    constructor(component) {
        this.component = component;
        decoratedComponent = component;
        
        this._initializeBuyData();
        this._hookUpdateItems();
    }

    /**
     * 初始化购买模式数据的 getter/setter
     * @private
     */
    _initializeBuyData() {
        // 初始化内部存储
        this.component._itemsDataForBuy = null;

        // 定义 itemsDataForBuy 属性，实现懒加载
        Object.defineProperty(this.component, 'itemsDataForBuy', {
            get: function() {
                if (!this._itemsDataForBuy) {
                    this._itemsDataForBuy = GetProductionItems(
                        this.city, 
                        this.recommendations, 
                        this.playerGoldBalance, 
                        true, // 强制为购买模式
                        this.viewHidden, 
                        this.uqInfo
                    );
                    itemsForBuyIndex = buildItemsIndex(this._itemsDataForBuy);
                }
                return this._itemsDataForBuy;
            },
            set: function(value) {
                this._itemsDataForBuy = value;
                itemsForBuyIndex = buildItemsIndex(this._itemsDataForBuy);
            }
        });
    }

    /**
     * 扩展 updateItems 方法以同步更新购买数据
     * @private
     */
    _hookUpdateItems() {
        if (!this.component.updateItems) return;

        const originalUpdateItems = this.component.updateItems;
        const originalCall = originalUpdateItems.call;

        // 重写 call 方法以拦截调用
        originalUpdateItems.call = function(...args) {
            // 调用原始 call 方法
            const result = originalCall.apply(this, args);
            
            // 更新购买数据
            if (decoratedComponent?.city) {
                if (decoratedComponent.isPurchase) {
                    // 如果当前是购买模式，则购买模式数据等于当前数据
                    decoratedComponent.itemsDataForBuy = decoratedComponent._items;
                } else {
                    // 如果当前不是购买模式，则获取购买模式的数据
                    decoratedComponent.itemsDataForBuy = GetProductionItems(
                        decoratedComponent.city, 
                        decoratedComponent.recommendations, 
                        decoratedComponent.playerGoldBalance, 
                        true, // 强制为购买模式
                        decoratedComponent.viewHidden, 
                        decoratedComponent.uqInfo
                    );
                }
                itemsIndex = buildItemsIndex(decoratedComponent._items);
            }
            return result;
        };

        // 保持原始 call 方法的属性
        Object.keys(originalCall).forEach(key => {
            originalUpdateItems.call[key] = typeof originalCall[key] === 'function'
                ? originalCall[key].bind(originalCall)
                : originalCall[key];
        });
    }

    beforeAttach() {}
    afterAttach() {}
    beforeDetach() {}
    afterDetach() {}
}

Controls.decorate('panel-production-chooser', (component) => new DanProductionChooserScreenDecorator(component));
