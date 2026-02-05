import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
// import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
// import { ProductionPanelCategory, Construct } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { F as FxsChooserItem } from '/core/ui/components/fxs-chooser-item.chunk.js';
import { P as ProductionPanelCategory, h as Construct } from '/base-standard/ui/production-chooser/production-chooser-helpers.chunk.js';
import { findItemForBuy, findItem, getIsPurchaseMode, refreshPurchaseData } from './dan-panel-pc-decorator.js';
import { ProductionChooserScreen } from '/base-standard/ui/production-chooser/panel-production-chooser.js';


// 创建快速购买按钮元素
export const CreateQuickBuyItem = () => {
    const item = document.createElement('quick-buy-item');
    item.setAttribute("data-audio-group-ref", "city-actions");
    item.setAttribute("data-audio-activate", "data-audio-city-purchase-activate");
    return item;
};

// 检查玩家是否解锁了某个节点（市政/科技）
const IsNodeUnlocked = (nodeType, playerId) => {
    if (!nodeType || typeof Game === 'undefined') return false;
    
    // 获取节点状态
    const nodeState = Game.ProgressionTrees.getNodeState(playerId, nodeType);
    // 尝试获取完成状态的枚举值，如果获取不到则默认使用 3
    // 枚举参考:
    // .NODE_STATE_CLOSED = 0 (锁定)
    // .NODE_STATE_OPEN = 1 (开放可研究)
    // .NODE_STATE_IN_PROGRESS = 2 (研究中)
    // .NODE_STATE_FULLY_UNLOCKED = 3 (已完成)
    const COMPLETED_STATE = (typeof ProgressionTreeNodeState !== 'undefined' && ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED) 
        ? ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED 
        : 3;

    return nodeState >= COMPLETED_STATE;
};

// ==========================================
// 1. 数据访问层 (Data Access Layer, DAL)
// 职责：封装所有与官方游戏数据交互的函数（读取、监听）
// ==========================================
const QuickBuyDAL = {
    /**
     * 获取当前选中的城市
     * @returns {City|null} 城市对象
     */
    getSelectedCity: () => {
        const cityID = UI.Player.getHeadSelectedCity();
        return cityID ? Cities.get(cityID) : null;
    },

    /**
     * 获取单位的生产力成本
     * @param {City} city 城市对象
     * @param {string} type 单位类型
     * @returns {number} 生产力成本
     */
    getUnitProductionCost: (city, type) => {
        return city?.Production?.getUnitProductionCost(type) ?? -1;
    },

    /**
     * 获取建筑/区域的生产力成本
     * @param {City} city 城市对象
     * @param {string} type 建筑类型
     * @returns {number} 生产力成本
     */
    getConstructibleProductionCost: (city, type) => {
        // 快速修复 1.1.1 版本引起的 BUG，使用 false 替代 ResourceTypes.NO_RESOURCE
        return city?.Production?.getConstructibleProductionCost(type, FeatureTypes.NO_FEATURE, false) ?? -1;
    },

    /**
     * 获取单位的基础生产力成本（用于计算折扣）
     * @param {string} type 单位类型
     * @returns {number} 基础成本
     */
    getUnitBaseCost: (type) => {
        // 优化：使用find而不是filter以提高性能
        const unitCost = GameInfo.Unit_Costs.find(cost => cost.UnitType === type && cost.YieldType === 'YIELD_PRODUCTION');
        return unitCost ? unitCost.Cost : 0;
    },

    /**
     * 获取建筑的基础生产力成本
     * @param {string} type 建筑类型
     * @returns {number} 基础成本
     */
    getConstructibleBaseCost: (type) => {
        const constructible = GameInfo.Constructibles.lookup(type);
        return (constructible && constructible.Cost > 0) ? constructible.Cost : 0;
    },

    /**
     * 获取购买模式下的项目数据
     * @param {string} category 类别
     * @param {string} type 类型
     * @returns {Object|null} 项目数据
     */
    getItemForBuy: (category, type) => {
        return findItemForBuy(category, type);
    },

    /**
     * 获取普通模式下的项目数据
     * @param {string} category 类别
     * @param {string} type 类型
     * @returns {Object|null} 项目数据
     */
    getItem: (category, type) => {
        return findItem(category, type);
    }
};

// ==========================================
// 2. UI定位层 (UI Locating Layer, ULL)
// 职责：封装所有“查找/操作DOM”的逻辑，防止undefined错误
// ==========================================
const QuickBuyULL = {
    /**
     * 获取按钮的上下文信息（父元素及其数据）
     * @param {HTMLElement} element 按钮元素
     * @returns {Object|null} 上下文对象或null
     */
    getContext: (element) => {
        if (!element?.parentElement) {
            console.error('F1rstDan UpdateQuickBuyItem: element.parentElement is undefined');
            return null;
        }
        
        // 检查父元素是否有必要的数据
        // 奇怪，勾上“查看隐藏项” 就会弹出很多 undefined，这里做防御性编程
        if (!element.parentElement.dataset?.type) {
            return null;
        }

        return {
            element: element,
            parentElement: element.parentElement,
            parentData: element.parentElement.dataset
        };
    },

    /**
     * 设置元素的可见性
     * @param {HTMLElement} element 元素
     * @param {boolean} isVisible 是否可见
     */
    setVisible: (element, isVisible) => {
        element.classList.toggle('hidden', !isVisible);
    },

    /**
     * 设置元素的禁用状态
     * @param {HTMLElement} element 元素
     * @param {boolean} isDisabled 是否禁用
     */
    setDisabled: (element, isDisabled) => {
        if (isDisabled) {
            element.setAttribute('disabled', 'true');
        } else {
            // 移除属性比设置为false更好，但为了兼容原逻辑保留 converting to string
            element.setAttribute('disabled', 'false'); 
            // 注意：原逻辑是 (!!data.disabled).toString()，即 "true" 或 "false"
        }
    },

    /**
     * 批量更新元素的dataset
     * @param {HTMLElement} element 元素
     * @param {Object} dataKV 键值对数据
     */
    updateDataset: (element, dataKV) => {
        for (const [key, value] of Object.entries(dataKV)) {
            // 只在值发生变化时更新，减少DOM操作
            const strValue = value === undefined || value === null ? '' : value.toString();
            if (element.dataset[key] !== strValue) {
                element.dataset[key] = strValue;
            }
        }
    }
};

// ==========================================
// 3. 数据处理层 (Data Processing Layer, DPL)
// 职责：业务逻辑计算、缓存管理、数据转换
// ==========================================
const QuickBuyDPL = {
    /**
     * 处理并生成渲染数据 (轻量级版本 - 仅用于列表显示)
     * @param {Object} context ULL提供的上下文
     * @returns {Object} 渲染指令数据
     */
    process: (context) => {
        const { element, parentData } = context;
        const category = parentData.category;
        const type = parentData.type;
        // element 就是快速购买按钮元素。
        // 【parentData】 包含的数据有以下：
        // console.error('F1rstDan UpdateQuickBuyItem: parentData', parentData == null ? 'null' : JSON.stringify(parentData));
        // parentData {
        // "focusContextName": "default (no focus context)",
        // "category": "buildings",
        // "type": "BUILDING_GRANARY",
        // "audioGroupRef": "city-actions",
        // "audioActivateRef": "none",
        // "audioFocusRef": "data-audio-city-production-focus",
        // "name": "ProductionChooserItem",
        // "activatable": "true"
        // }
        
        // 1. 基础有效性检查
        const city = QuickBuyDAL.getSelectedCity();
        const isPurchaseMode = getIsPurchaseMode();

        // 2. 规则检查
        // 购买模式下一律不显示快速购买
        if (isPurchaseMode) {
            return { action: 'HIDE' };
        }

        // 如果是城镇，不显示快速购买
        if (city?.isTown) {
            return { action: 'HIDE' }; // 城镇无需缓存，直接隐藏
        }

        // 项目（PROJECTS）一律不显示快速购买
        if (category === ProductionPanelCategory.PROJECTS) {
             return { action: 'HIDE' };
        }

        // 奇观（WONDERS）默认不显示，除非满足特定条件
        if (category === ProductionPanelCategory.WONDERS) {
            const MUGHAL_GARDENS_NODE = "NODE_CIVIC_MO_MUGHAL_GARDENS_OF_PARADISE";
            // 只有解锁了“天堂花园”市政才显示奇观购买按钮 (Mughal莫卧儿帝国的市政)
            if (!IsNodeUnlocked(MUGHAL_GARDENS_NODE, city.owner)) {
                return { action: 'HIDE' };
            }
        }

        // 3. 获取项目数据 (用于获取金币成本)
        let data = QuickBuyDAL.getItemForBuy(category, type);
        let isDisabled = false;
        
        // 如果购买列表里没找到（可能是因为被禁用了），尝试在普通列表找
        if (!data) {
            data = QuickBuyDAL.getItem(category, type);
            if (!data) {
                // 都没数据，可能是有问题的条目
                // console.error('F1rstDan UpdateQuickBuyItem: findItem is undefined', parentData.name);
                // 找不到数据时不报错，直接SKIP或HIDE，避免刷屏
                return { action: 'SKIP' }; 
            }
            isDisabled = true; // 既然买不了，那就禁用
        } else {
            isDisabled = !!data.disabled;
        }

        // 4. 返回渲染数据 (仅包含列表显示所需的最少数据)
        // 移除了 productionCost, baseProductionCost 等昂贵计算
        return {
            action: 'RENDER',
            isDisabled,
            dataset: {
                name: data.name,
                type: data.type,
                category: data.category,
                isPurchase: 'true',
                cost: data.cost,
                turns: data.turns,
                error: data.error || '',
                // 标记 Tooltip 数据尚未加载
                tooltipLoaded: 'false'
            }
        };
    },

    /**
     * 获取 Tooltip 所需的详细数据 (昂贵计算 - 延迟加载)
     * @param {string} category 类别
     * @param {string} type 类型
     * @param {number} currentCost 当前金币成本
     * @returns {Object} 包含详细成本和折扣率的数据对象
     */
    getTooltipData: (category, type, currentCost) => {
        const city = QuickBuyDAL.getSelectedCity();
        if (!city) return {};

        // 1. 计算生产力成本
        let productionCost = -1;
        if (category === ProductionPanelCategory.UNITS) {
            productionCost = QuickBuyDAL.getUnitProductionCost(city, type);
        } else {
            productionCost = QuickBuyDAL.getConstructibleProductionCost(city, type);
        }

        // 2. 计算基础成本
        let baseProductionCost = 0;
        if (category === ProductionPanelCategory.UNITS) {
            baseProductionCost = QuickBuyDAL.getUnitBaseCost(type);
        } else {
            baseProductionCost = QuickBuyDAL.getConstructibleBaseCost(type);
        }

        // 3. 计算衍生数据
        const baseCost = baseProductionCost * 4; // 金币成本是生产力基础成本 * 4
        let productionRate = 0;
        let goldRate = 0;

        if (baseProductionCost > 0) {
            productionRate = Math.floor((baseProductionCost - productionCost) / baseProductionCost * 100);
        }

        if (baseCost > 0 && currentCost) {
            goldRate = Math.floor((baseCost - currentCost) / baseCost * 100);
        }

        return {
            productionCost,
            baseProductionCost,
            baseCost,
            productionRate,
            goldRate,
            tooltipLoaded: 'true'
        };
    }
};

// ==========================================
// 4. UI渲染层 (UI Rendering Layer, URL)
// 职责：接收DPL的数据指令，操作DOM
// ==========================================
export const UpdateQuickBuyItem = (element) => {
    // 1. 获取上下文 (ULL)
    const context = QuickBuyULL.getContext(element);
    if (!context) return;

    // 2. 处理数据 (DPL)
    const result = QuickBuyDPL.process(context);

    // 3. 执行渲染指令
    if (result.action === 'HIDE') {
        if (!element.classList.contains('hidden')) {
            QuickBuyULL.setVisible(element, false);
        }
        return;
    }

    if (result.action === 'SKIP') {
        return;
    }

    if (result.action === 'RENDER') {
        // 显示元素
        if (element.classList.contains('hidden')) {
            QuickBuyULL.setVisible(element, true);
        }
        
        // 设置禁用状态
        const currentDisabled = element.getAttribute('disabled') === 'true';
        if (currentDisabled !== result.isDisabled) {
            QuickBuyULL.setDisabled(element, result.isDisabled);
        }
        
        // 更新数据属性
        QuickBuyULL.updateDataset(element, result.dataset);
    }
};

// 快速购买按钮组件
export class QuickBuyItem extends FxsChooserItem {
    constructor() {
        super(...arguments);
        // 元素引用
        this.costContainer = document.createElement('div');
        this.costIconElement = document.createElement('span');
        this.costAmountElement = document.createElement('span');
        
        // 绑定方法
        this.onMouseEnter = this.onMouseEnter.bind(this);
    }

    // 重写 onActivatableEngineInput 方法，在禁用状态下阻止事件冒泡
    onActivatableEngineInput(inputEvent) {
        // 如果按钮被禁用，阻止所有事件
        if (this.disabled) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            return false;
        }
        // 调用父类方法
        return super.onActivatableEngineInput(inputEvent);
    }
    
    onInitialize() {
        super.onInitialize();
        this.selectOnActivate = true;
        this.render();
    }
    
    onAttach() {
        // 添加快速购买按钮事件监听器
        this.Root.addEventListener('chooser-item-selected', (event) => { this.onButtonActivated(event); });
        // 添加鼠标悬停监听器以延迟加载 tooltip 数据
        this.Root.addEventListener('mouseenter', this.onMouseEnter);
        super.onAttach();
    }
    
    onDetach() {
        // 移除快速购买按钮的点击事件监听器
        this.Root.removeEventListener('chooser-item-selected', this.onButtonActivated);
        this.Root.removeEventListener('mouseenter', this.onMouseEnter);
        super.onDetach();
    }

    /**
     * 鼠标悬停处理函数
     * 延迟加载昂贵的 Tooltip 数据（生产力成本对比、折扣率等）
     */
    onMouseEnter() {
        // 如果数据已经加载，不再重复计算
        if (this.Root.dataset.tooltipLoaded === 'true') return;
        
        const category = this.Root.dataset.category;
        const type = this.Root.dataset.type;
        const currentCost = parseInt(this.Root.dataset.cost) || 0;
        
        if (category && type) {
             // 获取详细数据
             const tooltipData = QuickBuyDPL.getTooltipData(category, type, currentCost);
             
             // 批量更新 dataset
             // 注意：直接赋值 dataset 属性会自动触发 onAttributeChanged
             // 我们使用 requestAnimationFrame 来批量应用更改，尽量减少重绘
             requestAnimationFrame(() => {
                 Object.entries(tooltipData).forEach(([key, value]) => {
                     this.Root.dataset[key] = value;
                 });
             });
        }
    }
    
    render() {
        this.Root.classList.add('quick-buy-item', 'text-xs', 'leading-tight');
        this.Root.style.setProperty("min-width", "4.4rem");
        this.Root.setAttribute("data-audio-group-ref", "city-actions");
        this.Root.setAttribute("data-audio-focus-ref", "data-audio-city-production-focus");
        this.Root.setAttribute("data-audio-activate-ref", "data-audio-city-purchase-activate");    // 激活金币音效
        this.container.classList.add('p-1', 'font-title', 'flex', 'items-center', 'justify-end');
        // 成本容器
        this.costContainer.className = 'flex items-center font-bold';
        // 成本数值
        this.costAmountElement.className = 'font-title text-yield-gold';
        this.costContainer.appendChild(this.costAmountElement);
        // 金币图标
        this.costIconElement.className = 'size-7 bg-contain bg-center bg-no-repeat';
        this.costIconElement.style.setProperty('background-image', 'url(Yield_Gold)');
        this.costIconElement.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
        this.costContainer.appendChild(this.costIconElement);
        this.container.appendChild(this.costContainer);
        // 初始化提示内容
        // this.updateTooltipContent();
    }

    onButtonActivated(event, animationConfirmCallback) {
        // 阻止事件冒泡与默认行为，避免父级生产条目继续处理点击事件而加入队列
        event?.stopPropagation();
        event?.preventDefault();
        const city = QuickBuyDAL.getSelectedCity();
        const category = this.Root.dataset.category;
        // const category = event.target.dataset.category;
        const type = this.Root.dataset.type;

        if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            // 使用 DAL 获取数据
            const itemData = QuickBuyDAL.getItem(category, type);
            // console.error('F1rstDan onButtonActivated: findItem: ', JSON.stringify(itemData) );
            // 强制使用购买模式，购买核心逻辑
            const bSuccess = Construct(city, itemData, true);
            // 使用快速购买按钮后，不会自动切到购买模式
            ProductionChooserScreen.shouldReturnToPurchase = false;
            if (bSuccess) {
                setTimeout(() => {
                    refreshPurchaseData();
                    // UpdateQuickBuyItem(this.Root);   //不需要这个，刷新数据就全自动更新了
                }, 300);
                animationConfirmCallback?.();
                // // 如果快速购买的是单位，则关闭界面
                // if (category === ProductionPanelCategory.UNITS) {
                //     UI.Player.deselectAllCities();
                //     InterfaceMode.switchToDefault();
                //     this.requestPlaceBuildingClose();
                //     // (方案2) 立即刷新所有快速购买按钮
                // }
            }
        }
    }
    requestPlaceBuildingClose(inputEvent) {
        if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            return;
        }
        inputEvent?.stopPropagation();
        inputEvent?.preventDefault();
        this.playSound('data-audio-activate');
    }

    // https://textik.com/#c9f139daabb99bc2
    // +---------------------------------------------------------------+
    // | +-----------------+----------------------+------------------+ |
    // | |                 | base-cost            |                  | |
    // | |[icon:YIELD_GOLD]|----------------------+   -gold-rate%    | |
    // | |                 | cost                 |                  | |
    // | +-----------------+----------------------+------------------+ |
    // -----------------------------------------------------------------
    // | +-----------------+----------------------+------------------+ |
    // | |                 | base-production-cost |                  | |
    // | |[icon:YIELD_PRO..|----------------------+ +production-rate%| |
    // | |                 | production-cost      |                  | |
    // | +-----------------+----------------------+------------------+ |
    // +---------------------------------------------------------------+
    updateTooltipContent() {
        // 获取数据
        const cost = parseInt(this.Root.dataset.cost) || 0;
        const baseCost = parseInt(this.Root.dataset.baseCost) || 0;
        const goldRate = parseInt(this.Root.dataset.goldRate) || 0;
        const productionCost = parseInt(this.Root.dataset.productionCost) || 0;
        const baseProductionCost = parseInt(this.Root.dataset.baseProductionCost) || 0;
        const productionRate = parseInt(this.Root.dataset.productionRate) || 0;
        
        // 检查是否有折扣，如果两种资源都没有折扣，则不显示提示框
        const hasGoldDiscount = baseCost !== cost && goldRate !== 0;
        const hasProductionDiscount = baseProductionCost !== productionCost && productionRate !== 0;
        
        if (!hasGoldDiscount && !hasProductionDiscount) {
            // 如果没有折扣，清除提示内容
            this.Root.removeAttribute('data-tooltip-content');
            return;
        }
        
        // 创建提示内容容器
        const description = document.createElement('div');
        description.className = 'flex flex-col font-body';
        
        // 创建表格容器
        const tableContainer = document.createElement("div");
        tableContainer.style.setProperty("width", "100%");
        
        // 创建金币成本表格 - 只有在有折扣时才显示
        if (hasGoldDiscount && baseCost > 0) {
            const goldTable = this.createCostTable({
                baseCost: baseCost,
                currentCost: cost,
                rate: goldRate,
                iconUrl: "Yield_Gold",
                textColorClass: "text-yield-gold"
            });
            
            tableContainer.appendChild(goldTable);
            
            // 如果同时有生产力成本折扣，添加分隔线
            if (hasProductionDiscount && baseProductionCost > 0) {
                const divider = document.createElement("div");
                divider.style.setProperty("width", "100%");
                divider.style.setProperty("height", "0.06rem");
                divider.style.setProperty("background-color", "#82705533");
                divider.style.setProperty("margin", "0.1rem 0");
                tableContainer.appendChild(divider);
            }
        }
        
        // 创建生产力成本表格 - 只有在有折扣时才显示
        if (hasProductionDiscount && baseProductionCost > 0) {
            const productionTable = this.createCostTable({
                baseCost: baseProductionCost,
                currentCost: productionCost,
                rate: productionRate,
                iconUrl: "Yield_Production",
                textColorClass: "text-yield-production"
            });
            
            tableContainer.appendChild(productionTable);
        }
        
        description.appendChild(tableContainer);

        // 设置提示内容
        this.Root.setAttribute('data-tooltip-content', description.outerHTML);
        this.Root.setAttribute("data-tooltip-anchor", "top");
        this.Root.setAttribute("data-tooltip-alignment", "top-right");
        this.Root.setAttribute("data-tooltip-hide-on-update", "");
    }

    // 创建成本表格的辅助方法 - 按照图标|数值|折扣的布局
    createCostTable(options) {
        const { baseCost, currentCost, rate, iconUrl, textColorClass } = options;
        
        // 检查基础成本和当前成本是否相同
        const costsAreSame = baseCost === currentCost;
        
        // 创建表格 - 使用Steam风格的折扣块
        const discountBlock = document.createElement("div");
        discountBlock.className = 'flex items-center min-h-8';  // 增加最小高度
        
        // 创建图标区域 - 放在最左边
        const iconArea = document.createElement("div");
        iconArea.className = 'flex justify-center items-center h-full w-8';
        
        // 创建图标
        const icon = document.createElement("span");
        icon.className = "size-6 bg-contain bg-center bg-no-repeat";
        icon.style.setProperty("background-image", `url(${iconUrl})`);
        iconArea.appendChild(icon);
        
        // 创建价格区域 - 放在中间
        const priceArea = document.createElement("div");
        priceArea.className = 'flex items-end justify-center h-full px-2';
        priceArea.style.setProperty("flex-grow", "1");
        priceArea.style.setProperty("flex-direction", "column");
        priceArea.style.setProperty("line-height", "1"); // 减小行高
        
        // 如果基础成本和当前成本相同，只显示一个成本
        if (costsAreSame) {
            const costSpan = document.createElement("span");
            costSpan.className = `${textColorClass} font-bold text-base`;
            costSpan.textContent = currentCost;
            priceArea.appendChild(costSpan);
        } else {
            // 基础成本 - 带删除线
            const baseCostSpan = document.createElement("span");
            baseCostSpan.className = "text-xs text-primary-1 font-title";
            baseCostSpan.style.setProperty("text-decoration", "line-through");
            baseCostSpan.style.setProperty("text-decoration-color", "#82705588");
            baseCostSpan.style.setProperty("opacity", "0.8");
            baseCostSpan.textContent = baseCost;
            
            // 当前成本
            const currentCostSpan = document.createElement("span");
            currentCostSpan.className = `${textColorClass} font-bold text-base`;
            currentCostSpan.textContent = currentCost;
            
            priceArea.appendChild(baseCostSpan);
            priceArea.appendChild(currentCostSpan);
        }
        
        // 创建折扣百分比区域 - 放在最右边
        const discountPct = document.createElement("div");
        discountPct.className = 'flex justify-center items-center h-full min-w-16 font-bold text-sm';
        
        // 只有当基础成本和当前成本不同时才显示折扣率
        if (!costsAreSame && rate !== 0) {
            // 根据折扣率正负设置不同背景色
            if (rate > 0) {
                // 负折扣率（-X%）使用绿色背景 Steam绿色
                discountPct.style.setProperty("background-color", "#546929");
                discountPct.style.setProperty("color", "#D0E951");
                discountPct.textContent = `-${rate}%`;
            } else {
                // 正折扣率（+X%）使用红色背景
                discountPct.style.setProperty("background-color", "#a83232");
                discountPct.style.setProperty("color", "#ffcbcb");
                discountPct.textContent = `+${Math.abs(rate)}%`;
            }
            discountPct.style.setProperty("border-radius", "0.2rem");
        }
        
        discountBlock.appendChild(iconArea);
        discountBlock.appendChild(priceArea);
        discountBlock.appendChild(discountPct);
        
        return discountBlock;
    }
    
    
    onAttributeChanged(name, oldValue, newValue) {
        let shouldCallSuper = true;

        if (name === 'data-cost') {
            const cost = newValue ? parseInt(newValue) : 0;
            const showCost = !isNaN(cost) && cost > 0;
            this.costContainer.classList.toggle('hidden', !showCost);
            this.costAmountElement.textContent = newValue;
            shouldCallSuper = false; 
        }

        // 监听所有影响 Tooltip 的属性
        const tooltipAttributes = [
            'data-cost',
            'data-base-cost',
            'data-gold-rate',
            'data-production-cost',
            'data-base-production-cost',
            'data-production-rate'
        ];

        if (tooltipAttributes.includes(name)) {
            // 使用 requestAnimationFrame 进行防抖，确保所有属性更新后再计算 Tooltip
            if (!this.tooltipUpdatePending) {
                this.tooltipUpdatePending = true;
                requestAnimationFrame(() => {
                    this.updateTooltipContent();
                    this.tooltipUpdatePending = false;
                });
            }
        }
        
        if (shouldCallSuper) {
            super.onAttributeChanged(name, oldValue, newValue);
        }
    }
}

Controls.define('quick-buy-item', {
    createInstance: QuickBuyItem,
    attributes: [
        { name: 'disabled' },
        { name: 'data-name' },
        { name: 'data-category' },
        { name: 'data-type' },
        { name: 'data-cost' },
        { name: 'data-base-cost' },
        { name: 'data-gold-rate' },
        { name: 'data-production-cost' },
        { name: 'data-base-production-cost' },
        { name: 'data-production-rate' },
        { name: 'data-is-purchase' },
        { name: 'data-is-purchase-mode' },
    ]
});
