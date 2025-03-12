import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
import { ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';

// 创建快速购买按钮元素
export const CreateQuickBuyItem = () => {
    const item = document.createElement('quick-buy-item');
    item.setAttribute("data-audio-group-ref", "city-actions");
    item.setAttribute("data-audio-activate", "data-audio-city-purchase-activate");
    return item;
};

// 判断单位在购买模式下是否被禁用
function isUnitDisabledInPurchaseMode(city, unitType) {
    // 确保城市有效且有Gold属性
    if (!city?.Gold) {
        return true; // 如果城市无效或没有Gold属性，则单位被禁用
    }
    
    // 查询可购买的单位
    const results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Unit);
    // 查找特定单位类型的结果
    const unitResult = results.find(({ index }) => {
        const definition = GameInfo.Units.lookup(index);
        return definition && definition.UnitType === unitType;
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
}


// 更新快速购买按钮的数据
export const UpdateQuickBuyItem = (element, data, city) => {
    // 添加空值检查，确保element和data存在
    if (!element || !data) {
        console.error('UpdateQuickBuyItem: element or data is undefined');
        return;
    }
    
    // 确保element.dataset存在
    if (!element.dataset) {
        console.error('UpdateQuickBuyItem: element.dataset is undefined');
        return;
    }
    
    // 设置数据属性
    element.dataset.category = data.category;
    element.dataset.type = data.type;
    
    // 获取购买成本
    let purchaseCost;
    if (data.category === ProductionPanelCategory.UNITS) {
        purchaseCost = city.Gold?.getUnitPurchaseCost(YieldTypes.YIELD_GOLD, data.type);
    } else {
        purchaseCost = city.Gold?.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, data.type);
    }

    
    // 设置成本数据
    if (purchaseCost !== undefined && purchaseCost > 0) {
        element.dataset.cost = purchaseCost.toString();
        
        // 获取玩家当前金币余额
        const playerGoldBalance = Players.Treasury.get(GameContext.localPlayerID)?.goldBalance ?? 0;
        // console.error('F1rstDan UpdateQuickBuyItem: playerGoldBalance ' + playerGoldBalance);
        
        // 简化禁用逻辑：直接比较玩家金币与购买成本
        const canPurchase = playerGoldBalance >= purchaseCost && !data.disabled;
        
        // 设置禁用状态
        element.setAttribute('disabled', (!canPurchase).toString());
    } else {
        element.dataset.cost = '0';
        element.setAttribute('disabled', 'true');
    }

    // 检查单位是否在购买模式下被禁用
    const isDisabled = data.category === ProductionPanelCategory.UNITS ? 
    isUnitDisabledInPurchaseMode(city, data.type) : data.disabled;
    // console.error('F1rstDan UpdateQuickBuyItem: isDisabled ' + isDisabled);
    if (isDisabled) {
        element.setAttribute('disabled', 'true');
        // 设置提示内容
        // element.setAttribute('data-tooltip-content', Locale.compose("LOC_CITY_PURCHASE_LIMIT_MET"));
    }

    
    // 处理显示/隐藏逻辑
    // 如果是奇观或项目，或者没有有效的购买成本，则隐藏
    const shouldHide = data.category === ProductionPanelCategory.WONDERS || 
                      data.category === ProductionPanelCategory.PROJECTS || 
                      !purchaseCost || purchaseCost <= 0;
    
    element.classList.toggle('hidden', shouldHide);
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
    }
    
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'data-cost':
                const cost = newValue ? parseInt(newValue) : 0;
                const showCost = !isNaN(cost) && cost > 0;
                this.costContainer.classList.toggle('hidden', !showCost);
                this.costAmountElement.textContent = newValue;
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
        { name: 'data-category' },
        { name: 'data-type' },
        { name: 'data-cost' },
    ]
});