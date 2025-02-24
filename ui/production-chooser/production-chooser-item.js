import { ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
const categoryTooltipStyleMap = {
    [ProductionPanelCategory.BUILDINGS]: 'production-constructible-tooltip',
    [ProductionPanelCategory.UNITS]: 'production-unit-tooltip',
    [ProductionPanelCategory.WONDERS]: 'production-constructible-tooltip',
    [ProductionPanelCategory.PROJECTS]: 'production-project-tooltip',
};
export const UpdateProductionChooserItem = (element, data, isPurchase) => {
    element.dataset.name = data.name;
    element.dataset.type = data.type;
    element.dataset.category = data.category;
    element.dataset.isPurchase = isPurchase.toString();
    element.dataset.isAgeless = data.ageless ? 'true' : 'false';
    if (data.secondaryDetails) {
        element.dataset.secondaryDetails = data.secondaryDetails;
    }
    else {
        element.removeAttribute('data-secondary-details');
    }
    const cost = isPurchase ? data.cost : data.turns;
    element.dataset.cost = cost.toString();
    element.setAttribute('disabled', (!!data.disabled).toString());
    if (data.error) {
        element.dataset.error = data.error;
    }
    else {
        element.removeAttribute('data-error');
    }
    if (data.description) {
        element.dataset.description = data.description;
    }
    else {
        element.removeAttribute('data-description');
    }
    if (data.recommendations && data.recommendations.length > 0) {
        element.dataset.recommendations = JSON.stringify(data.recommendations);
    }
    else {
        element.removeAttribute('data-recommendations');
    }
    
    // 获取维护费数据和生产力花费
    if (data.type && data.category !== ProductionPanelCategory.PROJECTS) {
        // 获取维护费
        if (data.category === ProductionPanelCategory.UNITS) {
            // 对于单位，从Units表获取维护费
            const unitDef = GameInfo.Units.lookup(data.type);
            if (unitDef && unitDef.Maintenance > 0) {
                element.dataset.maintenanceData = JSON.stringify([{
                    YieldType: 'YIELD_GOLD',
                    Amount: unitDef.Maintenance
                }]);
            } else {
                element.removeAttribute('data-maintenance-data');
            }
        } else {
            // 对于建筑等，从Constructible_Maintenances表获取维护费
            const maintenances = Database.query('gameplay', 
                'select YieldType, Amount from Constructible_Maintenances where ConstructibleType = ?', 
                data.type
            );
            
            if (maintenances?.length > 0) {
                const validMaintenances = maintenances.filter(m => m.Amount > 0);
                if (validMaintenances.length > 0) {
                    element.dataset.maintenanceData = JSON.stringify(validMaintenances);
                } else {
                    element.removeAttribute('data-maintenance-data');
                }
            } else {
                element.removeAttribute('data-maintenance-data');
            }
        }

        // 获取生产力花费
        const cityID = UI.Player.getHeadSelectedCity();
        if (cityID && !isPurchase && data.category !== ProductionPanelCategory.PROJECTS) {
            const city = Cities.get(cityID);
            if (city?.Production && !city.isTown) {  // 确保不是城镇
                let productionCost;
                if (data.category === ProductionPanelCategory.UNITS) {
                    productionCost = city.Production.getUnitProductionCost(data.type);
                } else {
                    productionCost = city.Production.getConstructibleProductionCost(data.type);
                }
                if (productionCost !== undefined && productionCost > 0) {  // 确保有效的生产力花费
                    element.dataset.productionCost = productionCost.toString();
                } else {
                    element.removeAttribute('data-production-cost');
                }
            }
        }
    }

    element.setAttribute('data-tooltip-style', categoryTooltipStyleMap[data.category]);
};
export class ProductionChooserItem extends FxsChooserItem {
    constructor() {
        super(...arguments);
        // #region Element References
        this.iconElement = document.createElement('fxs-icon');
        this.itemNameElement = document.createElement('span');
        this.secondaryDetailsElement = document.createElement('div');
        this.errorTextElement = document.createElement('span');
        this.costContainer = document.createElement('div');
        this.costIconElement = document.createElement('span');
        this.recommendationsContainer = document.createElement('div');
        this.costAmountElement = document.createElement('span');
        this.agelessContainer = document.createElement('div');
        this.maintenanceContainer = document.createElement('div'); // 新增维护费容器
        this.maintenanceEntriesContainer = document.createElement('div');
        this.productionCostContainer = document.createElement('div');
        this.productionCostElement = document.createElement('span');
    }
    // #endregion
    get isPurchase() {
        return this.Root.getAttribute('data-is-purchase') === 'true';
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
        this.Root.classList.add('text-xs', 'leading-tight');
        this.container.classList.add('p-1', 'font-title');
    
        // ==================== 主内容区域 ====================
        // 【结构说明】左侧图标 | 主要信息区 | 游戏推荐图标 | 右侧执行信息区
        
        // ===== 左侧图标 =====
        this.iconElement.classList.add('size-12', 'bg-contain', 'bg-center', 'bg-no-repeat', 'mr-2');
        this.container.appendChild(this.iconElement);
    
        // ===== 主要信息区（名称/维护费/错误信息/次要详情） =====
        const infoContainer = document.createElement('div');
        infoContainer.className = 'relative flex flex-col flex-auto justify-start items-start';
        
        // —— 顶部行（名称 + 维护费） ——
        const infoTopRow = document.createElement('div');
        infoTopRow.className = 'flex flex-shrink items-center';
        
        // 物品名称
        this.itemNameElement.className = 'font-title text-accent-2 uppercase tracking-100';
        infoTopRow.appendChild(this.itemNameElement);
        
        // 维护费组件
        this.maintenanceContainer.className = 'flex ml-2 production-chooser-tooltip__subtext-bg hidden';
        const maintenanceLabel = document.createElement('div');
        maintenanceLabel.setAttribute('data-l10n-id', 'LOC_UI_PRODUCTION_MAINTENANCE');
        maintenanceLabel.className = 'text-xs text-primary-1 leading-tight ml-2';
        this.maintenanceEntriesContainer.className = 'flex text-xs text-negative-light font-bold leading-tight mx-2';
        this.maintenanceContainer.append(maintenanceLabel, this.maintenanceEntriesContainer);
        infoTopRow.appendChild(this.maintenanceContainer);
        
        infoContainer.appendChild(infoTopRow);
    
        // —— 错误信息（覆盖在信息区上方） ——
        this.errorTextElement.className = 'font-body text-negative-light z-1 pointer-events-none';
        infoContainer.appendChild(this.errorTextElement);
    
        // —— 次要详情（单位数据，默认隐藏） ——
        this.secondaryDetailsElement.className = 'invisible flex items-center font-bold';
        infoContainer.appendChild(this.secondaryDetailsElement);
        
        this.container.appendChild(infoContainer);
    
        // ===== 游戏推荐图标（独立区域） =====
        this.recommendationsContainer.className = 'flex items-center justify-center mr-2';
        this.container.appendChild(this.recommendationsContainer);
    
        // ===== 右侧执行信息区（无时代标记/成本/生产力消耗） =====
        const rightColumn = document.createElement('div');
        rightColumn.className = 'relative flex flex-col items-end justify-start';
    
        // —— 右上角容器（无时代标记） ——
        const rightTopContainer = document.createElement('div');
        rightTopContainer.className = 'flex items-center';
        
        // 无时代限制标记
        this.agelessContainer.className = 'invisible flex items-center';
        this.agelessContainer.innerHTML = `
            <div class="font-title uppercase text-accent-2" data-l10n-id="LOC_UI_PRODUCTION_AGELESS"></div>
            <img src="fs://game/city_ageless.png" class="size-4 mx-1"/>
        `;
        rightTopContainer.appendChild(this.agelessContainer);
        rightColumn.appendChild(rightTopContainer);
    
        // —— 成本及生产力消耗容器 ——
        this.costContainer.className = 'flex items-center font-bold';
        
        // 生产力消耗组件
        this.productionCostContainer.className = 'flex items-center mx-3 production-chooser-tooltip__subtext-bg hidden';
        const productionIcon = document.createElement('fxs-icon');
        productionIcon.setAttribute('data-icon-id', 'YIELD_PRODUCTION');
        productionIcon.setAttribute('data-icon-context', 'YIELD');
        productionIcon.className = 'size-5 mx-1';
        this.productionCostElement.className = 'text-xs text-primary-1 leading-tight ml-2';
        this.productionCostContainer.append(this.productionCostElement, productionIcon);
        
        // 成本数值及图标
        this.costAmountElement.className = 'font-title';
        this.costIconElement.className = 'size-8 bg-contain bg-center bg-no-repeat';
        this.costContainer.append(this.productionCostContainer, this.costAmountElement, this.costIconElement);
        
        rightColumn.appendChild(this.costContainer);
        this.container.appendChild(rightColumn);
    }
    updateCostIconElement() {
        const costIcon = this.isPurchase ? 'Yield_Gold' : 'hud_turn-timer';
        this.costIconElement.style.setProperty('background-image', `url(${costIcon})`);
    }
    createRecommendationElements(recommendationList) {
        this.recommendationsContainer.innerHTML = '';
        const recommendations = JSON.parse(recommendationList);
        const advisorList = recommendations.map(rec => rec.class);
        const advisorRecommendations = AdvisorUtilities.createAdvisorRecommendation(advisorList);
        this.recommendationsContainer.appendChild(advisorRecommendations);
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'data-name':
                if (newValue) {
                    this.itemNameElement.dataset.l10nId = newValue;
                }
                break;
            case 'data-type':
                if (newValue) {
                    this.iconElement.setAttribute('data-icon-id', newValue);
                }
                else {
                    this.iconElement.removeAttribute('data-icon-id');
                }
                break;
            case 'data-is-purchase':
                this.updateCostIconElement();
                break;
            case 'data-cost':
                const cost = newValue ? parseInt(newValue) : 0;
                const showCost = isNaN(cost) || cost < 0;
                this.costContainer.classList.toggle('hidden', showCost);
                this.costAmountElement.textContent = newValue;
                break;
            case 'data-error':
                if (newValue) {
                    this.errorTextElement.setAttribute('data-l10n-id', newValue);
                    this.errorTextElement.classList.remove('hidden');
                }
                else {
                    this.errorTextElement.removeAttribute('data-l10n-id');
                    this.errorTextElement.classList.add('hidden');
                }
                break;
            case 'data-is-ageless':
                const isAgeless = newValue === 'true';
                this.agelessContainer.classList.toggle('invisible', !isAgeless);
                break;
            case 'data-secondary-details': {
                if (newValue) {
                    this.secondaryDetailsElement.innerHTML = newValue;
                    this.secondaryDetailsElement.classList.remove('invisible');
                }
                else {
                    this.secondaryDetailsElement.classList.add('invisible');
                }
                break;
            }
            case 'data-recommendations': {
                if (newValue) {
                    this.createRecommendationElements(newValue);
                    this.recommendationsContainer.classList.remove('invisible');
                }
                else {
                    this.recommendationsContainer.classList.add('invisible');
                }
                break;
            }
            // 维护费更新逻辑
            case 'data-maintenance-data':
                this.maintenanceEntriesContainer.innerHTML = '';
                if (newValue) {
                    const maintenances = JSON.parse(newValue);
                    maintenances.forEach(maintenance => {
                        const maintenanceEntry = document.createElement('div');
                        maintenanceEntry.className = 'flex items-center';
                        
                        const icon = document.createElement('fxs-icon');
                        icon.setAttribute('data-icon-id', maintenance.YieldType);
                        icon.setAttribute('data-icon-context', 'YIELD');
                        icon.classList.add('size-4');
                        maintenanceEntry.appendChild(icon);
                        
                        const amount = document.createElement('div');
                        amount.textContent = `-${maintenance.Amount}`;
                        maintenanceEntry.appendChild(amount);
                        
                        this.maintenanceEntriesContainer.appendChild(maintenanceEntry);
                    });
                    this.maintenanceContainer.classList.remove('hidden');
                } else {
                    this.maintenanceContainer.classList.add('hidden');
                }
                break;
            // 生产力花费更新逻辑
            case 'data-production-cost':
                if (!this.isPurchase) {
                    const hasValidCost = newValue && parseInt(newValue) > 0;
                    this.productionCostContainer.classList.toggle('hidden', !hasValidCost);
                    if (hasValidCost) {
                        this.productionCostElement.textContent = newValue;
                    }
                } else {
                    this.productionCostContainer.classList.add('hidden');
                }
                break;
            default:
                super.onAttributeChanged(name, _oldValue, newValue);
                break;
        }
    }
}
Controls.define('production-chooser-item', {
    createInstance: ProductionChooserItem,
    attributes: [
        { name: 'disabled' },
        { name: 'data-category' },
        { name: 'data-name' },
        { name: 'data-type' },
        { name: 'data-cost' },
        { name: 'data-prereq' },
        { name: 'data-description' },
        { name: 'data-error' },
        { name: 'data-is-purchase' },
        { name: 'data-is-ageless' },
        { name: 'data-secondary-details' },
        { name: 'data-recommendations' },
        { name: 'data-maintenance-data' }, // 维护费
        { name: 'data-production-cost' }, // 生产力花费
    ]
});

//# sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-item.js.map
