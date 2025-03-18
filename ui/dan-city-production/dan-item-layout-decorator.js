/**
 * F1rstDan's Cool UI - 生产项目装饰器
 * 非侵入式实现，使用装饰器模式扩展production-chooser-item组件功能
 * 实现自定义样式和布局，而不修改原始文件
 * sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-item.js.map
 * MOD下载地址：https://forums.civfanatics.com/resources/31961/
 * GitHub：https://github.com/F1rstDan/Civ7_F1rstDan_Cool_UI
 */

// 导入可能需要的依赖
import F1rstDanModOptions from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
import { ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
const categoryTooltipStyleMap = {
    [ProductionPanelCategory.BUILDINGS]: 'production-constructible-tooltip',
    [ProductionPanelCategory.UNITS]: 'production-unit-tooltip',
    [ProductionPanelCategory.WONDERS]: 'production-constructible-tooltip',
    [ProductionPanelCategory.PROJECTS]: 'production-project-tooltip',
};
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
        // 保存原始控件引用
        this.item = component;
        // 绑定方法到实例
        this.applyCustomLayout = this.applyCustomLayout.bind(this);
        this.refreshMaintenance = this.refreshMaintenance.bind(this);
        this.refreshProductionCost = this.refreshProductionCost.bind(this);

        // 扩展原始方法。当属性发生变化时调用
        if (this.item.onAttributeChanged) {
            const originalOnAttributeChanged = this.item.onAttributeChanged;
            this.item.onAttributeChanged = (name, oldValue, newValue) => {
                // 调用原始方法
                originalOnAttributeChanged.call(this.item, name, oldValue, newValue);
                
                // 在原方法后执行自定义代码
                this.handleAttributeChanged(name, oldValue, newValue);
            };
        }
        // 非侵入式添加属性定义
        // 获取组件的定义
        // const componentDefinition = Controls.getDefinition('production-chooser-item');
        // if (componentDefinition && componentDefinition.attributes) {
        //     // 检查属性是否已存在
        //     const hasMaintenanceData = componentDefinition.attributes.some(attr => attr.name === 'data-maintenance-data');
        //     const hasProductionCost = componentDefinition.attributes.some(attr => attr.name === 'data-production-cost');
            
        //     // 如果属性不存在，则添加
        //     if (!hasMaintenanceData) {
        //         componentDefinition.attributes.push({ name: 'data-maintenance-data' }); // 维护费
        //     }
        //     if (!hasProductionCost) {
        //         componentDefinition.attributes.push({ name: 'data-production-cost' }); // 生产力花费
        //     }
        //     // console.error('F1rstDan componentDefinition.attributes ',JSON.stringify(componentDefinition.attributes));
        // }
    }
    get hasModOptions() {
        return F1rstDanModOptions!== null && F1rstDanModOptions!== undefined;
    }
    get isApplyLayout() {
        if (!this.hasModOptions) return true;   // 如果MOD配置为空，默认启动
        return F1rstDanModOptions.pItemApplyLayout;
    }
    get isDisplayMaintenance() {
        if (!this.hasModOptions) return true;   // 如果MOD配置为空，默认启动
        return F1rstDanModOptions.pItemDisplayMaintenance;
    }
    get isDisplayProductionCost() {
        if (!this.hasModOptions) return true;   // 如果MOD配置为空，默认启动
        return F1rstDanModOptions.pItemDisplayProductionCost;
    }
    
    /**
     * 在控件附加到DOM之前调用
     * 适合进行DOM元素的初始化准备工作
     */
    beforeAttach() {
        try {
            // 初始化准备工作
        } catch (error) {
            console.error('DanProductionItemDecorator beforeAttach error:', error);
        }
    }
    
    /**
     * 在控件附加到DOM之后调用
     * DOM元素已经可以安全访问和操作
     */
    afterAttach() {
        try {
            // 应用自定义布局和样式
            if (this.isApplyLayout){
                this.applyCustomLayout();
            }
            // 刷新维护费显示
            if (this.isDisplayMaintenance){
                this.refreshMaintenance();
            }
            // 刷新生产力花费显示
            if (this.isDisplayProductionCost){
                this.refreshProductionCost();
            }
        } catch (error) {
            console.error('F1rstDan DanProductionItemDecorator afterAttach error:', error);
        }
    }
    
    /**
     * 在控件从DOM分离之前调用
     * 清理资源，避免内存泄漏
     */
    beforeDetach() {
        // 清理工作（如果需要）
    }
    
    /**
     * 在控件从DOM分离之后调用
     */
    afterDetach() {
        // 最终清理（如果需要）
    }
    
    /**
     * 应用自定义布局和样式到组件
     * 合并了样式应用和DOM结构调整功能
     * 按照目标文件中constructor的顺序层级组织代码
     */
    applyCustomLayout() {
        if (!this.item.Root) return;

        // 根元素
        this.updateClassList(this.item.Root, ['text-sm'], ['text-xs', 'leading-tight']);
        this.updateClassList(this.item.container, ['p-2', 'tracking-100'], ['p-1']);

        // 左侧图标区
        this.updateClassList(this.item.iconElement, ['size-16'], ['size-12']);

        // 【主要信息区】 （名称/无时代/推荐图标//错误信息/次要详情/维护费）
        this.createCustomElement('mainInfoArea', 'div', 'relative flex flex-col flex-auto items-start justify-center', this.item.container);
        this.createCustomElement('mainInfoTopRow', 'div', 'flex flex-shrink items-center', this.item.mainInfoArea);  // 主要信息顶部行
        // 无时代标记容器
        this.moveElement(this.item.agelessContainer, this.item.mainInfoTopRow, 'hidden flex items-center', `
            <img src="fs://game/city_ageless.png" class="size-5 ml-1"/>
        `);
        this.toggleVisibility(this.item.agelessContainer, this.item.Root.getAttribute('data-is-ageless') === 'true');
        // 物品名称元素
        this.moveElement(this.item.itemNameElement, this.item.mainInfoTopRow);
        this.updateClassList(this.item.itemNameElement, 'text-xs mb-1', 'text-sm tracking-100 ml-2 max-w-64');
        // 推荐图标容器
        this.moveElement(this.item.recommendationsContainer, this.item.mainInfoTopRow, 'flex items-center justify-center ml-2 f1dan-size-5');

        // 错误文本元素
        this.moveElement(this.item.errorTextElement, this.item.mainInfoArea, 'font-body text-negative-light z-1 pointer-events-none max-w-64');

        // 主要信息详情行
        this.createCustomElement('mainInfoDetailsRow', 'div', 'flex flex-shrink items-center max-w-64', this.item.mainInfoArea);
        // 次要详情元素
        this.moveElement(this.item.secondaryDetailsElement, this.item.mainInfoDetailsRow);
        this.updateClassList(this.item.secondaryDetailsElement, '', 'font-bold f1dan-size-8-adjust');
        // 维护费元素
        this.createCustomElement('maintenanceElement', 'span', 'flex text-xs text-negative-light font-bold px-1 hidden ', this.item.secondaryDetailsElement);

        // 【右侧执行信息区】 （生产力花费/制作成本）
        this.createCustomElement('rightInfoArea', 'div', 'relative flex flex-col items-center justify-center', this.item.container);
        // this.createCustomElement('rightTopRow', 'div', 'flex items-center', this.item.rightInfoArea);   // 右侧顶部行
        // 成本容器
        this.moveElement(this.item.costContainer, this.item.rightInfoArea, 'flex items-center justify-center font-bold');
        // 生产力花费容器
        this.createCustomElement('productionCostContainer', 'span', 'flex items-center mx-3 production-chooser-tooltip__subtext-bg rounded hidden', this.item.costContainer);
        this.createCustomElement('productionCostAmount', 'span', 'text-xs text-primary-1 leading-tight ml-2 font-title', this.item.productionCostContainer);
        this.createCustomElement('productionIcon', 'fxs-icon', 'size-5 mx-1', this.item.productionCostContainer);
        this.item.productionIcon.setAttribute('data-icon-id', 'YIELD_PRODUCTION');
        this.item.productionIcon.setAttribute('data-icon-context', 'YIELD');
        // 调整位置，让 '生产力花费' 在 '成本' 之前
        if (this.item.costContainer.firstChild) {
            this.item.costContainer.insertBefore(this.item.productionCostContainer, this.item.costContainer.firstChild);
        }

        // 确保DOM结构正确
        if (this.item.container) {
            // 确保图标在容器中
            if (this.item.iconElement && !this.item.container.contains(this.item.iconElement)) {
                this.item.container.insertBefore(this.item.iconElement, this.item.container.firstChild);
            }
            
            // 确保主要信息区在图标之后
            if (this.item.mainInfoArea && this.item.iconElement && this.item.iconElement.nextSibling !== this.item.mainInfoArea) {
                this.item.container.insertBefore(this.item.mainInfoArea, this.item.iconElement.nextSibling);
            }
            
            // 确保右侧信息区在最后
            if (this.item.rightInfoArea && !this.item.container.contains(this.item.rightInfoArea)) {
                this.item.container.appendChild(this.item.rightInfoArea);
            }
        }
    }


    // 辅助函数
    /**
     * 获取是否为购买模式
     * @returns {boolean} 是否为购买模式
     */
    // get isPurchase() {
    //     return this.item.Root.getAttribute('data-is-purchase')  === 'true';
    // }

    /**
     * 创建自定义元素。确保自定义元素存在，如果不存在则创建。 
     * @param {string} propertyName - 元素属性名称
     * @param {string} tagName - 元素标签名称
     * @param {string} className - 元素的类名
     * @param {HTMLElement} parentElement - 父元素
     */
    createCustomElement(propertyName, tagName, className, parentElement) {
        if (!this.item[propertyName]) {
            this.item[propertyName] = document.createElement(tagName);
            this.item[propertyName].className = className;
        }
        if (parentElement) parentElement.appendChild(this.item[propertyName]);
    }
    /**
     * 更新元素的类列表
     * (可接受字符串形式的类名，也能接受数组形式的类名)
     * @param {HTMLElement} element - 要更新的元素
     * @param {string[]} removeClasses - 要移除的类名数组
     * @param {string[]} addClasses - 要添加的类名数组
     */
    updateClassList(element, removeClasses, addClasses) {
        if (!element) {
            console.error('F1rstDan [updateClassList] element is null');
            return;
        }
        const normalizeClasses = (classes) => {
            return Array.isArray(classes) ? classes : classes.split(' ');
        };
        const normalizedRemoveClasses = normalizeClasses(removeClasses);
        const normalizedAddClasses = normalizeClasses(addClasses);

        element.classList.remove(...normalizedRemoveClasses);
        element.classList.add(...normalizedAddClasses);
    }
    /**
     * 移动元素到新的父元素，并更新类名和内容
     * @param {HTMLElement} element - 要移动的元素
     * @param {HTMLElement} newParent - 新的父元素
     * @param {string} className - 新的类名
     * @param {string} innerHTML - 新的内容
     */
    moveElement(element, newParent, className, innerHTML = '') {
        if (!element) {
            console.error('F1rstDan [moveElement] element is null');
            return;
        }
        if (element.parentNode && newParent) {
            element.parentNode.removeChild(element);
            newParent.appendChild(element);
        }
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
    }
    /**
     * 切换元素的可见性
     * @param {HTMLElement} element - 要切换的元素
     * @param {boolean} isVisible - 是否可见
     */
    toggleVisibility(element, isVisible) {
        if (!element) {
            console.error('F1rstDan [toggleVisibility] element is null');
            return;
        }
        if (isVisible) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }


    /**
     * 刷新维护费显示
     * 如果维护费元素不存在，则创建到合适的位置
     */
    refreshMaintenance() {
        // if ( !this.isDisplayMaintenance ){
        //     return;
        // }
        // 如果维护费元素不存在，则创建
        this.createCustomElement('maintenanceElement', 'span', 'flex text-xs text-negative-light font-bold px-1 hidden ', this.item.secondaryDetailsElement);

        // 获取维护费数据
        const element = this.item.Root;
        const type = element.getAttribute('data-type');
        const category = element.getAttribute('data-category');
        let maintenanceData;

        if (type && category !== ProductionPanelCategory.PROJECTS) {
            // 获取维护费
            if (category === ProductionPanelCategory.UNITS) {
                // 对于单位，从Units表获取维护费
                const unitDef = GameInfo.Units.lookup(type);
                if (unitDef && unitDef.Maintenance > 0) {
                    maintenanceData = [{
                        YieldType: 'YIELD_GOLD',
                        Amount: unitDef.Maintenance
                    }];
                } else {
                    element.removeAttribute('data-maintenance-data');
                }
            } else {
                // 对于建筑等，从Constructible_Maintenances表获取维护费
                const maintenances = Database.query('gameplay', 
                    'select YieldType, Amount from Constructible_Maintenances where ConstructibleType = ?', 
                    type
                );
                
                if (maintenances?.length > 0) {
                    const validMaintenances = maintenances.filter(m => m.Amount > 0);
                    if (validMaintenances.length > 0) {
                        maintenanceData = validMaintenances;
                    } else {
                        element.removeAttribute('data-maintenance-data');
                    }
                } else {
                    element.removeAttribute('data-maintenance-data');
                }
            }
        }
        // 检查维护费数据是否发生变化,如果没有变化则不刷新
        if ( JSON.stringify(maintenanceData) == element.getAttribute('data-maintenance-data') ) {
            return;
        }

        // 更新维护费数据属性
        element.dataset.maintenanceData = JSON.stringify(maintenanceData);
        // 获取维护费数据
        // const maintenanceData = this.item.Root.getAttribute('data-maintenance-data');
        if (maintenanceData) {
            try {
                // 清空现有内容
                this.item.maintenanceElement.innerHTML = '';
                
                // 添加维护费条目
                maintenanceData.forEach(maintenance => {
                    const maintenanceEntry = document.createElement('div');
                    maintenanceEntry.className = 'flex items-center';
                    
                    // 创建图标
                    const icon = document.createElement('fxs-icon');
                    icon.setAttribute('data-icon-id', maintenance.YieldType);
                    icon.setAttribute('data-icon-context', 'YIELD');
                    icon.classList.add('size-6');
                    maintenanceEntry.appendChild(icon);
                    
                    // 创建数值
                    const amount = document.createElement('div');
                    amount.textContent = `-${maintenance.Amount}`;
                    maintenanceEntry.appendChild(amount);
                    
                    // 添加到维护费容器
                    this.item.maintenanceElement.appendChild(maintenanceEntry);
                });
                
                // 显示维护费容器
                this.item.maintenanceElement.classList.remove('hidden');
            } catch (error) {
                // console.error('F1rstDan Error parsing maintenance data:', error);
                this.item.maintenanceElement.classList.add('hidden');
            }
        } else {
            // 没有维护费数据，隐藏容器
            this.item.maintenanceElement.classList.add('hidden');
        }
    }
    
    /**
     * 刷新生产力花费显示
     * 如果生产力花费元素不存在，则创建到合适的位置
     */
    refreshProductionCost() {
        // if ( !this.isDisplayProductionCost ){
        //     return;
        // }
        // 如果生产力花费容器不存在，则创建
        if (!this.item.productionCostContainer) {
            // 生产力花费容器
            this.createCustomElement('productionCostContainer', 'span', 'flex items-center mx-3 production-chooser-tooltip__subtext-bg rounded hidden', this.item.costContainer);
            this.createCustomElement('productionCostAmount', 'span', 'text-xs text-primary-1 leading-tight ml-2 font-title', this.item.productionCostContainer);
            this.createCustomElement('productionIcon', 'fxs-icon', 'size-5 mx-1', this.item.productionCostContainer);
            this.item.productionIcon.setAttribute('data-icon-id', 'YIELD_PRODUCTION');
            this.item.productionIcon.setAttribute('data-icon-context', 'YIELD');
            // 调整位置，让 '生产力花费' 在 '成本' 之前
            // 让 '生产力花费' 在 'costAmountElement' 之前
            if (this.item.costContainer.firstChild) {
                this.item.costContainer.insertBefore(this.item.productionCostContainer, this.item.costAmountElement);
            } else {
                this.item.costContainer.appendChild(this.item.productionCostContainer);
            }
        }
        
        // 获取生产力花费
        const element = this.item.Root;
        const type = element.getAttribute('data-type');
        const category = element.getAttribute('data-category');
        const cityID = UI.Player.getHeadSelectedCity();
        let productionCost;
        if (cityID && !this.item.isPurchase && category !== ProductionPanelCategory.PROJECTS) {
            const city = Cities.get(cityID);
            if (city?.Production && !city.isTown) {  // 确保不是城镇
                if (category === ProductionPanelCategory.UNITS) {
                    productionCost = city.Production.getUnitProductionCost(type);
                } else {
                    productionCost = city.Production.getConstructibleProductionCost(type, FeatureTypes.NO_FEATURE, ResourceTypes.NO_RESOURCE);
                }
                if (productionCost !== undefined && productionCost > 0) {  // 确保有效的生产力花费
                    // element.dataset.productionCost = productionCost.toString();
                } else {
                    element.removeAttribute('data-production-cost');
                }
            }
        }
        // console.error('F1rstDan parsing production cost:', productionCost);

        // 检查数据是否发生变化,如果没有变化则不刷新
        if ( JSON.stringify(productionCost) == element.getAttribute('data-production-cost') ) {
            return;
        }
        // 更新数据属性
        element.dataset.productionCost = productionCost.toString();

        if (productionCost && !this.item.isPurchase) {
            // 显示生产力花费
            if (this.item.productionCostAmount) {
                this.item.productionCostAmount.textContent = productionCost;
            }
            this.item.productionCostContainer.classList.remove('hidden');
        } else {
            // 隐藏生产力花费
            this.item.productionCostContainer.classList.add('hidden');
        }
    }
    
    /**
     * 处理属性变化
     * 这个比 afterAttach() 先执行
     * @param {string} name - 变化的属性名
     * @param {*} oldValue - 变化前的值
     * @param {*} newValue - 变化后的值
     */
    handleAttributeChanged(name, oldValue, newValue) {
        // console.error('F1rstDan handleAttributeChanged GO');
        switch (name) {
            case 'data-cost':
                // console.error('F1rstDan handleAttributeChanged case data-cost');
                // 如果成本变动，更新 维护费，生产成本
                if (this.isDisplayMaintenance) this.refreshMaintenance();
                if (this.isDisplayProductionCost) this.refreshProductionCost();
                break;
            case 'data-maintenance-data':
                // 维护费数据变化，更新显示
                if (this.isDisplayMaintenance) this.refreshMaintenance();
                break;
                
            case 'data-production-cost':
                // 生产力花费变化，更新显示
                if (this.isDisplayProductionCost) this.refreshProductionCost();
                break;
                
            case 'data-is-purchase':
                // 购买模式变化，更新生产力花费显示(购买模式下隐藏)
                if (this.isDisplayProductionCost) this.refreshProductionCost();
                break;
                
            case 'data-is-ageless':
                // 无时代限制状态变化
                if (this.item.agelessContainer && this.isApplyLayout) {
                    // 确保使用正确的值比较，'true'是字符串
                    const isAgeless = newValue === 'true';
                    if (isAgeless) {
                        this.item.agelessContainer.classList.remove('hidden');
                    } else {
                        this.item.agelessContainer.classList.add('hidden');
                    }
                }
                break;
            case 'data-secondary-details': 
                if (this.item.secondaryDetailsElement && this.isApplyLayout) {
                    if (newValue) {
                        this.item.secondaryDetailsElement.innerHTML = newValue;
                        this.item.secondaryDetailsElement.classList.remove('hidden');
                    }
                    else {
                        this.item.secondaryDetailsElement.classList.add('hidden');
                    }
                }
                break;

        }
    }


}


// 当游戏引擎准备好时初始化
engine.whenReady.then(() => {
    console.log('F1rstDan\'s Cool UI: Registered Production Item Decorator');
    // 注册装饰器
    Controls.decorate('production-chooser-item', (component) => new DanProductionItemDecorator(component));
});