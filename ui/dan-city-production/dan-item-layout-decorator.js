/**
 * F1rstDan's Cool UI - 生产项目装饰器
 * 非侵入式实现，使用装饰器模式扩展production-chooser-item组件功能
 * 实现自定义样式和布局，而不修改原始文件
 * sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-item.js.map
 * MOD下载地址：https://steamcommunity.com/sharedfiles/filedetails/?id=3510572267 ; https://forums.civfanatics.com/resources/31961/
 * GitHub：https://github.com/F1rstDan/Civ7_F1rstDan_Cool_UI
 */

import { P as ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { getUserModOptions } from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
import './dan-quick-buy-item.js';
import { UpdateQuickBuyItem } from './dan-quick-buy-item.js';

// 注入自定义样式
const styleElement = document.createElement('style');
styleElement.innerHTML = `
    .dan-border-radius {
        border-radius: 0.55rem 0.11rem;
    }
    .dan-maintenance-bg {
        border-radius: 0.55rem 0.11rem;
        background-color: rgba(0, 0, 0, 0.2);
    }
    .f1dan-size-5 .advisor-recommendation__container .advisor-recommendation__icon {
        width: 1.1rem;
        height: 1.1rem;
    }
    .f1dan-size-8-adjust .size-8 {
        width: 1.3rem;
        height: 1.3rem;
        margin-right: 0rem;
    }
`;
document.head.appendChild(styleElement);

/**
 * 生产项目装饰器类
 * 用于扩展生产选择器项目的UI样式和功能
 */
export class DanProductionItemDecorator {
    constructor(component) {
        this.item = component;

        // 扩展原始方法：当属性发生变化时调用
        if (this.item.onAttributeChanged) {
            const originalOnAttributeChanged = this.item.onAttributeChanged;
            this.item.onAttributeChanged = (name, oldValue, newValue) => {
                originalOnAttributeChanged.call(this.item, name, oldValue, newValue);
                this.handleAttributeChanged(name, oldValue, newValue);
            };
        }
    }

    // #region 配置获取
    get isApplyLayout() {
        return this._getOption('pItemApplyLayout');
    }

    get isDisplayMaintenance() {
        return this._getOption('pItemDisplayMaintenance');
    }

    get isDisplayProductionCost() {
        return this._getOption('pItemDisplayProductionCost');
    }

    /**
     * 获取MOD配置选项的通用方法
     */
    _getOption(key, defaultValue = true) {
        try {
            return getUserModOptions()[key];
        } catch (error) {
            console.error(`F1rstDan ModOptions get ${key} error:`, error);
            return defaultValue;
        }
    }
    // #endregion

    // #region 生命周期钩子
    beforeAttach() {
        // 初始化准备工作
    }

    afterAttach() {
        try {
            if (this.isApplyLayout) {
                this.applyCustomLayout();
            }
            if (this.isDisplayMaintenance) {
                this.refreshMaintenance();
            }
            if (this.isDisplayProductionCost) {
                this.refreshProductionCost();
            }
            this.updateQuickBuyButton();
            // console.error('F1rstDan afterAttach() ADD ProductionItem');
        } catch (error) {
            console.error('F1rstDan DanProductionItemDecorator afterAttach error:', error);
        }
    }

    beforeDetach() {
        // 清理资源
    }

    afterDetach() {
        // 最终清理
    }
    // #endregion

    // #region 核心功能方法

    /**
     * 应用自定义布局和样式
     * 重组DOM结构以优化显示效果
     */
    applyCustomLayout() {
        if (!this.item.Root) return;

        // 1. 调整根元素和容器样式
        this.updateClassList(this.item.Root, ['text-sm'], ['text-xs', 'leading-tight']);
        this.updateClassList(this.item.container, ['p-2', 'tracking-100'], ['p-1']);

        // 2. 调整图标大小
        this.updateClassList(this.item.iconElement, ['size-16'], ['size-12']);

        // 3. 构建主要信息区 (Main Info Area) （无时代/名称/推荐图标//错误信息/次要详情/维护费）
        this.createCustomElement('mainInfoArea', 'div', 'relative flex flex-col flex-auto items-start justify-center', this.item.container);
        
        // 3.1 顶部行 (Top Row): 无时代标记 + 名称 + 推荐图标
        this.createCustomElement('mainInfoTopRow', 'div', 'flex flex-shrink items-center', this.item.mainInfoArea);
        
        // 无时代标记
        this.moveElement(this.item.agelessContainer, this.item.mainInfoTopRow, 'hidden flex items-center', 
            `<img src="fs://game/city_ageless.png" class="size-5 ml-1"/>`);
        this.toggleVisibility(this.item.agelessContainer, this.item.Root.getAttribute('data-is-ageless') === 'true');

        // 名称
        this.moveElement(this.item.itemNameElement, this.item.mainInfoTopRow);
        this.updateClassList(this.item.itemNameElement, 'text-xs mb-1', 'text-sm tracking-100 ml-2');

        // 推荐图标
        this.moveElement(this.item.recommendationsContainer, this.item.mainInfoTopRow);
        this.updateClassList(this.item.recommendationsContainer, 'mr-2', 'ml-2 f1dan-size-5');

        // 错误文本 (放在主要信息区)
        this.moveElement(this.item.errorTextElement, this.item.mainInfoArea);

        // 3.2 详情行 (Details Row): 次要详情 + 建筑产出 + 维护费
        this.createCustomElement('mainInfoDetailsRow', 'div', 'flex flex-shrink items-center', this.item.mainInfoArea);
        
        // 次要详情 (单位类型/回合数等)
        this.moveElement(this.item.secondaryDetailsElement, this.item.mainInfoDetailsRow);
        this.updateClassList(this.item.secondaryDetailsElement, '', 'font-bold f1dan-size-8-adjust');

        // 建筑产出
        this.moveElement(this.item.alternateYieldElement, this.item.mainInfoDetailsRow);

        // 维护费容器
        this.createCustomElement('maintenanceElement', 'span', 'flex text-xs text-negative-light font-bold px-1 hidden', this.item.secondaryDetailsElement);

        // 4. 构建右侧信息区 (Right Info Area): 成本 + 生产力花费
        this.createCustomElement('rightInfoArea', 'div', 'relative flex flex-col items-center justify-center', this.item.container);
        
        // 成本容器
        this.moveElement(this.item.costContainer, this.item.rightInfoArea);
        this.updateClassList(this.item.costContainer, '', 'justify-center font-bold');

        // 生产力花费容器 (插入到成本容器最前面)
        this.createCustomElement('productionCostContainer', 'span', 'flex items-center mx-3 production-chooser-tooltip__subtext-bg rounded hidden');
        this.createCustomElement('productionCostAmount', 'span', 'text-xs text-primary-1 leading-tight ml-2 font-title', this.item.productionCostContainer);
        this.createCustomElement('productionIcon', 'fxs-icon', 'size-5 mx-1', this.item.productionCostContainer);
        this.item.productionIcon.setAttribute('data-icon-id', 'YIELD_PRODUCTION');
        this.item.productionIcon.setAttribute('data-icon-context', 'YIELD');

        if (this.item.costContainer) {
            if (this.item.costContainer.firstChild) {
                this.item.costContainer.insertBefore(this.item.productionCostContainer, this.item.costContainer.firstChild);
            } else {
                this.item.costContainer.appendChild(this.item.productionCostContainer);
            }
        }

        // 5. 最终DOM结构检查与修复
        this.ensureDOMStructure();
    }

    /**
     * 确保DOM元素顺序正确
     * 顺序: Icon -> MainInfo -> RightInfo
     */
    ensureDOMStructure() {
        if (!this.item.container) return;

        const { container, iconElement, mainInfoArea, rightInfoArea } = this.item;

        // 确保图标在最前
        if (iconElement && !container.contains(iconElement)) {
            container.insertBefore(iconElement, container.firstChild);
        }

        // 确保主要信息区在图标之后
        if (mainInfoArea && iconElement && iconElement.nextSibling !== mainInfoArea) {
            container.insertBefore(mainInfoArea, iconElement.nextSibling);
        }

        // 确保右侧信息区在最后
        if (rightInfoArea && !container.contains(rightInfoArea)) {
            container.appendChild(rightInfoArea);
        }
    }

    /**
     * 更新/初始化快速购买按钮
     */
    updateQuickBuyButton() {
        if (!this.item.Root) return;

        // 城镇不显示购买按钮，避免闪烁和性能浪费
        const cityID = UI.Player.getHeadSelectedCity();
        if (cityID) {
            const city = Cities.get(cityID);
            if (city?.isTown) return;
        }
        // console.error('F1rstDan afterAttach() ADD ProductionItem, updateQuickBuyButton()');

        const quickBuyButton = this.createCustomElement('quickBuyButton', 'quick-buy-item', '', this.item.Root);
        // 确保按钮在Root的最后
        if (this.item.Root.lastChild !== quickBuyButton) {
             this.item.Root.appendChild(quickBuyButton);
        }
        
        UpdateQuickBuyItem(quickBuyButton);
    }

    /**
     * 刷新维护费显示
     */
    refreshMaintenance() {
        const element = this.item.Root;
        const type = element.getAttribute('data-type');
        const category = element.getAttribute('data-category');
        const isUnit = category === ProductionPanelCategory.UNITS;

        // 1. 获取目标父容器
        // 单位 -> secondaryDetailsElement
        // 建筑 -> itemBaseYieldsElement (优先) 或 alternateYieldElement
        const targetParent = isUnit 
            ? this.item.secondaryDetailsElement 
            : (this.item.itemBaseYieldsElement || this.item.alternateYieldElement);

        if (!targetParent) return;

        // 2. 确保维护费容器存在
        if (!this.item.maintenanceElement) {
             this.item.maintenanceElement = document.createElement('span');
             this.item.maintenanceElement.className = 'flex px-1 hidden';
             this.item.maintenanceElement.style.setProperty("color", "#ffc8c8");
        }

        // 3. 获取维护费数据
        const maintenanceData = this._getMaintenanceData(type, category);
        
        // 4. 检查是否需要更新 (数据未变且DOM正常则跳过)
        const dataStr = JSON.stringify(maintenanceData);
        const prevDataStr = element.getAttribute('data-maintenance-data');
        const isDomMissing = maintenanceData && !targetParent.contains(this.item.maintenanceElement);
        
        if (dataStr === prevDataStr && !isDomMissing) return;

        element.dataset.maintenanceData = dataStr;

        // 5. 渲染维护费
        if (maintenanceData) {
            this._renderMaintenance(maintenanceData, isUnit, targetParent);
        } else {
            this.item.maintenanceElement.classList.add('hidden');
        }
    }

    /**
     * 获取维护费数据
     */
    _getMaintenanceData(type, category) {
        if (!type || category === ProductionPanelCategory.PROJECTS) return null;

        if (category === ProductionPanelCategory.UNITS) {
            const unitDef = GameInfo.Units.lookup(type);
            return (unitDef?.Maintenance > 0) 
                ? [{ YieldType: 'YIELD_GOLD', Amount: unitDef.Maintenance }] 
                : null;
        } else {
            const maintenances = Database.query('gameplay', 
                'select YieldType, Amount from Constructible_Maintenances where ConstructibleType = ?', 
                type
            );
            const validMaintenances = maintenances?.filter(m => m.Amount > 0);
            return (validMaintenances?.length > 0) ? validMaintenances : null;
        }
    }

    /**
     * 渲染维护费DOM
     */
    _renderMaintenance(data, isUnit, targetParent) {
        try {
            this.item.maintenanceElement.innerHTML = '';
            
            data.forEach(m => {
                const entry = document.createElement('div');
                entry.className = 'flex items-center';
                
                const amount = document.createElement('div');
                amount.textContent = `-${m.Amount}`;
                
                const icon = document.createElement('fxs-icon');
                icon.setAttribute('data-icon-id', m.YieldType);
                icon.setAttribute('data-icon-context', 'YIELD');
                icon.classList.add('size-6');

                if (isUnit) {
                    entry.append(icon, amount);
                } else {
                    entry.append(amount, icon);
                }
                
                this.item.maintenanceElement.appendChild(entry);
            });
            
            this.item.maintenanceElement.classList.remove('hidden');

            // 挂载到DOM
            if (!targetParent.contains(this.item.maintenanceElement)) {
                targetParent.appendChild(this.item.maintenanceElement);
            }
            
            // 确保父级可见
            if (targetParent.classList.contains('hidden')) {
                targetParent.classList.remove('hidden');
            }
            // 特殊处理建筑的 alternateYieldElement
            if (!isUnit && this.item.alternateYieldElement?.classList.contains('hidden')) {
                this.item.alternateYieldElement.classList.remove('hidden');
            }

        } catch (error) {
            console.error('F1rstDan Error rendering maintenance:', error);
            this.item.maintenanceElement.classList.add('hidden');
        }
    }

    /**
     * 刷新生产力花费显示
     */
    refreshProductionCost() {
        // 1. 确保容器存在 (如果是首次且未通过layout创建，例如layout未开启但开启了花费显示)
        if (!this.item.productionCostContainer) {
             this.createCustomElement('productionCostContainer', 'span', 'flex items-center mx-3 production-chooser-tooltip__subtext-bg rounded hidden');
             this.createCustomElement('productionCostAmount', 'span', 'text-xs text-primary-1 leading-tight ml-2 font-title', this.item.productionCostContainer);
             this.createCustomElement('productionIcon', 'fxs-icon', 'size-5 mx-1', this.item.productionCostContainer);
             this.item.productionIcon.setAttribute('data-icon-id', 'YIELD_PRODUCTION');
             this.item.productionIcon.setAttribute('data-icon-context', 'YIELD');

             if (this.item.costContainer) {
                if (this.item.costContainer.firstChild) {
                    this.item.costContainer.insertBefore(this.item.productionCostContainer, this.item.costContainer.firstChild);
                } else {
                    this.item.costContainer.appendChild(this.item.productionCostContainer);
                }
             }
        }

        const element = this.item.Root;
        const type = element.getAttribute('data-type');
        const category = element.getAttribute('data-category');
        const isPurchase = this.item.Root.getAttribute('data-is-purchase') === 'true';

        // 2. 判断是否显示
        if (isPurchase || category === ProductionPanelCategory.PROJECTS) {
            if (this.item.productionCostContainer) {
                this.item.productionCostContainer.classList.add('hidden');
            }
            return;
        }

        // 3. 获取并显示花费
        const cityID = UI.Player.getHeadSelectedCity();
        const city = Cities.get(cityID);
        const cost = this._getProductionCost(city, type, category);

        if (cost !== undefined && cost > 0) {
            element.dataset.productionCost = cost.toString();
            this.item.productionCostAmount.textContent = cost;
            this.item.productionCostContainer.classList.remove('hidden');
        } else {
            this.item.productionCostContainer.classList.add('hidden');
            element.removeAttribute('data-production-cost');
        }
    }

    _getProductionCost(city, type, category) {
        if (!city?.Production) return 0;
        
        if (category === ProductionPanelCategory.UNITS) {
            return city.Production.getUnitProductionCost(type);
        }
        // 建筑：修正 1.1.1 版本 BUG
        return city.Production.getConstructibleProductionCost(type, FeatureTypes.NO_FEATURE, false);
    }

    /**
     * 处理属性变化
     */
    handleAttributeChanged(name, oldValue, newValue) {
        if (newValue === oldValue) return;

        switch (name) {
            case 'data-cost':
                // 成本变动时，刷新相关显示
                if (newValue != null) {
                    if (this.isDisplayMaintenance) this.refreshMaintenance();
                    if (this.isDisplayProductionCost) this.refreshProductionCost();
                    if (this.item.quickBuyButton) {
                        UpdateQuickBuyItem(this.item.quickBuyButton);
                    }
                }
                break;

            case 'data-is-ageless':
                if (this.item.agelessContainer && this.isApplyLayout) {
                    this.toggleVisibility(this.item.agelessContainer, newValue === 'true');
                }
                break;

            case 'data-secondary-details': 
                if (this.item.secondaryDetailsElement && this.isApplyLayout) {
                    if (newValue) {
                        this.item.secondaryDetailsElement.innerHTML = newValue;
                        this.item.secondaryDetailsElement.classList.remove('hidden');
                    } else {
                        this.item.secondaryDetailsElement.classList.add('hidden');
                    }
                }
                break;
        }
    }

    // #endregion

    // #region DOM 辅助方法

    /**
     * 创建或获取自定义元素
     * @param {string} propertyName - 元素在 item 中的属性名
     * @param {string} tagName - 元素的标签名
     * @param {string} className - 元素的类名
     * @param {Element} parentElement - 元素的父元素
     * @returns {Element} - 创建或获取的元素
     */
    createCustomElement(propertyName, tagName, className, parentElement) {
        if (!this.item) return null;

        if (!this.item[propertyName]) {
            this.item[propertyName] = document.createElement(tagName);
            if (className) this.item[propertyName].className = className;
        }

        if (parentElement && !parentElement.contains(this.item[propertyName])) {
            parentElement.appendChild(this.item[propertyName]);
        }
        return this.item[propertyName];
    }

    /**
     * 更新元素的类列表
     */
    updateClassList(element, removeClasses, addClasses) {
        if (!element) return;
        
        const toArray = (cls) => Array.isArray(cls) ? cls : (cls ? cls.split(' ') : []);
        
        const remove = toArray(removeClasses);
        const add = toArray(addClasses);

        if (remove.length) element.classList.remove(...remove);
        if (add.length) element.classList.add(...add);
    }

    /**
     * 移动元素并更新
     */
    moveElement(element, newParent, className, innerHTML) {
        if (!element) return;

        if (newParent && element.parentNode !== newParent) {
            newParent.appendChild(element);
        }
        
        if (className !== undefined) element.className = className;
        if (innerHTML !== undefined) element.innerHTML = innerHTML;
    }

    /**
     * 切换可见性
     */
    toggleVisibility(element, isVisible) {
        if (!element) return;
        isVisible ? element.classList.remove('hidden') : element.classList.add('hidden');
    }
    // #endregion
}

// 注册装饰器
Controls.decorate('production-chooser-item', (component) => new DanProductionItemDecorator(component));
