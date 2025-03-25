import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
import { ProductionPanelCategory, Construct } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { findItemForBuy, findItem } from './dan-panel-pc-decorator.js';

// 创建快速购买按钮元素
export const CreateQuickBuyItem = () => {
    const item = document.createElement('quick-buy-item');
    item.setAttribute("data-audio-group-ref", "city-actions");
    item.setAttribute("data-audio-activate", "data-audio-city-purchase-activate");
    return item;
};

// 判断项目在购买模式下是否被禁用（注意传进来的是该按钮的数据）
// 过时：`Game.CityCommands.canStartQuery` 应该换成 `Game.CityCommands.canStart`
function isItemDisabledInPurchaseMode(data) {
    const city = Cities.get(UI.Player.getHeadSelectedCity());
    const itemCategory = data.category;
    const itemType = data.type;
    const itemCost = data.cost;
    // 确保城市有效且有Gold属性
    if (!city?.Gold) return true;   // 如果城市没有Gold属性，则项目被禁用
    if (!itemCost && itemCost < 0) return true;  // 如果成本小于0，是异常情况，则项目被禁用
    // 如果玩家金币不够买，直接返回禁用
    const playerGoldBalance = Players.Treasury.get(GameContext.localPlayerID)?.goldBalance ?? 0;
    if (playerGoldBalance < itemCost ) {
        return true;
    }
    // 如果是单位类型
    if (itemCategory === ProductionPanelCategory.UNITS) {
        // 查询可购买的单位
        const results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Unit);
        // 查找特定单位类型的结果
        const unitResult = results.find(({ index }) => {
            const definition = GameInfo.Units.lookup(index);
            return definition && definition.UnitType === itemType;
        });
        // 如果找不到单位或结果，则单位被禁用
        if (!unitResult) {
            return true;
        }
        const { result } = unitResult;
        // 检查是否因为需求完全失败或过时而被禁用
        if (result.Requirements?.FullFailure || result.Requirements?.Obsolete) {
            return true;
        }
        // 最终判断：如果result.Success为false，则单位被禁用
        return !result.Success;
    } else {
        // 如果是建筑类型
        // 查询可购买的建筑
        const results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Constructible);
        // 查找特定建筑类型的结果
        const buildingResult = results.find(({ index }) => {
            const definition = GameInfo.Constructibles.lookup(index);
            return definition && definition.ConstructibleType === itemType;
        });
        // 如果找不到建筑或结果，则建筑被禁用
        if (!buildingResult) {
            return true;
        }
        const { result } = buildingResult;
        // 检查是否因为需求完全失败或过时而被禁用
        if (result.Requirements?.FullFailure || result.Requirements?.Obsolete) {
            return true;
        }
        // 检查是否已经存在或在队列中
        if (result.AlreadyExists || result.InQueue) {
            return true;
        }
        // // 检查是否有合适的位置
        // if (result.Plots?.length === 0 && !result.ExpandUrbanPlots?.length) {
        //     return true;
        // }
        // 最终判断：如果result.Success为false，则建筑被禁用
        return !result.Success;
    }
}


// 更新快速购买按钮的数据
export const UpdateQuickBuyItem = (element) => {
    // 尝试从DOM中查找原始生产项目元素。父元素，JSON.stringify(itemData.dataset)
    // const itemData = document.querySelector(`production-chooser-item[data-type="${type}"][data-category="${category}"]`);
    if (!element?.parentElement) {
        console.error('F1rstDan UpdateQuickBuyItem: element.parentElement is undefined');
        return;
    } else if (!element.parentElement.dataset?.type) {
        // 奇怪，勾上“查看隐藏项” 就会弹出很多这个 30+
        // element.parentElement 打印是 [Object Object] 。无法JSON.stringify(element.parentElement)
        // element.parentElement.dataset 打印出来是 空白
        // JSON.stringify(element.parentElement.dataset)打印出来是 “{}”
        // console.error('F1rstDan UpdateQuickBuyItem: element.parentElement is undefined', element.parentElement);
        return;
    }
    // 如果是城镇，直接隐藏按钮并退出。减少计算
    const city = Cities.get(UI.Player.getHeadSelectedCity());
    if (city?.isTown) {
        element.classList.toggle('hidden', true);
        return;
    }
    // 从父元素获取必要的数据
    // const parentElement = element.parentElement;
    const parentData = element.parentElement.dataset;
    const category = parentData.category;
    const type = parentData.type;
    
    // 如果在购买模式下，直接隐藏按钮并退出。减少计算
    // 如果是奇观或项目，直接排除在外。
    const isPurchaseMode = parentData.isPurchase === 'true';
    const isExclude = category === ProductionPanelCategory.WONDERS || 
                      category === ProductionPanelCategory.PROJECTS ;
    if (isExclude) {
        element.classList.toggle('hidden', 'true');
        return;
    } else {
        element.classList.toggle('hidden', isPurchaseMode);
    }

    // 获取 购买模式下的项目数据 （从 'dan-panel-pc-decorator.js' 拿面板上的数据）
    // 一旦被禁用，findItemForBuy就不会有数据。（除非玩家开启“查看隐藏项”）
    let data = findItemForBuy(category, type);
    let isDisabled = false;
    if (!data) {
        data = findItem(category, type);
        if (!data) {
            // 都没数据则退出
            console.error('F1rstDan UpdateQuickBuyItem: findItem is undefined',JSON.stringify(parentData.name));
            return;
        }
        isDisabled = true;
    }
    // 如果findItemForBuy没有数据，则必然是禁用状态。否则根据数据判断是否禁用（开启“查看隐藏项”情况下）。
    if (isDisabled) {
        element.setAttribute('disabled', 'true');
    } else {
        element.setAttribute('disabled', (!!data.disabled).toString());
    }

    element.dataset.name = data.name;
    element.dataset.type = data.type;
    element.dataset.category = data.category;
    element.dataset.isPurchase = 'true';
    element.dataset.cost = data.cost.toString();
    element.dataset.turns = data.turns.toString();
    if (data.error) element.dataset.error = data.error;

    // 如果 生产项(父元素) 开启了显示生产力成本，直接获取。不然就自己计算
    if (!parentData.productionCost) {
        // 获取生产力花费，单位和建筑获取方式不同
        let productionCost = -1;
        if (data.category === ProductionPanelCategory.UNITS) {
            productionCost = city.Production?.getUnitProductionCost(data.type);
        } else {
            // 快速修复 1.1.1 版本引起的 BUG
            // productionCost = city.Production?.getConstructibleProductionCost(data.type, FeatureTypes.NO_FEATURE, ResourceTypes.NO_RESOURCE);
            productionCost = city.Production?.getConstructibleProductionCost(data.type, FeatureTypes.NO_FEATURE, false);
        }
        element.dataset.productionCost = productionCost.toString();
        // console.error('F1rstDan UpdateQuickBuyItem: parentData.productionCost is undefined',productionCost.toString());
    } else {
        element.dataset.productionCost = parentData.productionCost;
        // console.error('F1rstDan UpdateQuickBuyItem: parentData.productionCost YSE',parentData.productionCost);
    }
    
    // 获取基础成本值，计算折扣价
    let baseProductionCost = -1;
    if (data.category === ProductionPanelCategory.UNITS) {
        // 对于单位，从Unit_Costs表获取基础成本
        const unitCosts = GameInfo.Unit_Costs.filter(cost => cost.UnitType === data.type);
        if (unitCosts.length > 0) {
            const productionCost = unitCosts.find(cost => cost.YieldType === 'YIELD_PRODUCTION');
            if (productionCost) {
                baseProductionCost = productionCost.Cost;
            }
        }
    } else {
        // 对于建筑，直接从Constructibles表获取Cost属性
        const constructible = GameInfo.Constructibles.lookup(data.type);
        if (constructible && constructible.Cost > 0) {
            baseProductionCost = constructible.Cost;
        }
    }
    element.dataset.baseProductionCost = baseProductionCost.toString();
    element.dataset.baseCost = (baseProductionCost * 4).toString(); // 金币成本是产生里基础成本 * 4
    // 计算折扣价
    element.dataset.productionRate = Math.floor((baseProductionCost - element.dataset.productionCost) / baseProductionCost * 100);
    element.dataset.goldRate = Math.floor((element.dataset.baseCost - element.dataset.cost) / element.dataset.baseCost * 100);
};

// 快速购买按钮组件
export class QuickBuyItem extends FxsChooserItem {
    constructor() {
        super(...arguments);
        // 元素引用
        this.costContainer = document.createElement('div');
        this.costIconElement = document.createElement('span');
        this.costAmountElement = document.createElement('span');
    }

    // 重写 onActivatableEngineInput 方法，在禁用状态下阻止事件
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
        super.onAttach();
    }
    
    onDetach() {
        super.onDetach();
    }
    
    render() {
        this.Root.classList.add('quick-buy-item', 'text-xs', 'leading-tight');
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
        // 添加快速购买按钮事件监听器
        this.Root.addEventListener('chooser-item-selected', (event) => { this.onButtonActivated(event); });
        // 初始化提示内容
        this.updateTooltipContent();
    }

    onButtonActivated(event, animationConfirmCallback) {
        const city = Cities.get(UI.Player.getHeadSelectedCity());
        const category = this.Root.dataset.category;
        // const category = event.target.dataset.category;
        const type = this.Root.dataset.type;

        if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            const itemData = findItem(category, type);
            // console.error('F1rstDan onButtonActivated: findItem: ', JSON.stringify(itemData) );
            // console.error('F1rstDan onButtonActivated: findItem: ', JSON.stringify(findItem(category, type)) );
            // console.error('F1rstDan onButtonActivated: findItemForBuy: ', JSON.stringify(findItemForBuy(category, type)) );
            // 强制使用购买模式，购买核心逻辑
            const bSuccess = Construct(city, itemData, true);
            if (bSuccess) {
                animationConfirmCallback?.();
                // 如果快速购买的是单位，则关闭界面
                if (category === ProductionPanelCategory.UNITS) {
                    UI.Player.deselectAllCities();
                    InterfaceMode.switchToDefault();
                    this.requestPlaceBuildingClose();
                    // (方案2) 立即刷新所有快速购买按钮
                }
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
            } else {
                // 正折扣率（+X%）使用红色背景
                discountPct.style.setProperty("background-color", "#6A2A30");
                discountPct.style.setProperty("color", "#EC3D64");
            }
            discountPct.style.setProperty("border-radius", "0.2rem");
            discountPct.textContent = rate > 0 ? `-${rate}%` : `+${Math.abs(rate)}%`;
        }
        
        // 组装折扣块 - 按照图标|数值|折扣的顺序
        discountBlock.appendChild(iconArea);
        discountBlock.appendChild(priceArea);
        
        // 只有在有折扣时才添加折扣百分比区域
        if (!costsAreSame && rate !== 0) {
            discountBlock.appendChild(discountPct);
        }
        
        return discountBlock;
    }
    
    
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'data-cost':
                const cost = newValue ? parseInt(newValue) : 0;
                const showCost = !isNaN(cost) && cost > 0;
                this.costContainer.classList.toggle('hidden', !showCost);
                this.costAmountElement.textContent = newValue;
                this.updateTooltipContent(); // 更新提示内容
                break;
            case 'data-production-cost':
                if (newValue) {
                    this.updateTooltipContent(); // 更新提示内容
                }
                break;
            default:
                super.onAttributeChanged(name, _oldValue, newValue);
                break;
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