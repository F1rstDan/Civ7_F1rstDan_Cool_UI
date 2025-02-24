import CityYieldsEngine from '/base-standard/ui/utilities/utilities-city-yields.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export class CityYieldsBar extends Component {
    constructor() {
        super(...arguments);
        this.cityID = null;
        this.yieldElements = new Map();
    }
    onInitialize() {
        super.onInitialize();
        this.Root.classList.add('flex', 'flex-row', 'items-center', 'text-sm');
        this.cityID = UI.Player.getHeadSelectedCity();
    }
    onAttach() {
        this.refresh(); // refresh here so if we're reattaching we're up to date
        engine.on('CityYieldChanged', this.onCityYieldOrPopulationChanged, this);
        engine.on('CityPopulationChanged', this.onCityYieldOrPopulationChanged, this);
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
    }
    onDetach() {
        engine.off('CityYieldChanged', this.onCityYieldOrPopulationChanged, this);
        engine.off('CityPopulationChanged', this.onCityYieldOrPopulationChanged, this);
        engine.off('CitySelectionChanged', this.onCitySelectionChanged, this);
    }
    onCityYieldOrPopulationChanged() {
        this.refresh();
    }
    onCitySelectionChanged({ cityID }) {
        if (ComponentID.isMatch(this.cityID, cityID)) {
            return;
        }
        this.cityID = cityID;
        this.refresh();
    }

    // 构建tooltip内容
    buildYieldTooltipContent(yieldData) {
        //debug
        // console.error("F1rstDan debug yieldData[" + yieldData.label + `] : ${JSON.stringify(yieldData)}`);

        const tooltipContent = document.createElement("div");
        // 处理标题部分
        const yieldTitle = document.createElement("div");
        const displayValue = yieldData.isNegative ? yieldData.value : `+${yieldData.value}`;
        // 不知道为啥className和style.setProperty都不能生效，只能使用[STYLE:][/S]标签
        yieldTitle.innerHTML = `[STYLE:text-secondary font-title-lg uppercase tracking-100 font-bold text-center]${displayValue} ${yieldData.label}[/S]`;
        tooltipContent.appendChild(yieldTitle);
        
        // 递归处理子数据
        if (yieldData.childData && yieldData.childData.length > 0) {
            //debug
            // console.error("F1rstDan debug yieldData[" + yieldData.childData.label + `] : ${JSON.stringify(yieldData.childData)}`);
            this.tooltipAppendData(tooltipContent, yieldData.childData, 1);
        }
        //debug
        // console.error("F1rstDan debug innerHTML:" + tooltipContent.innerHTML);
        return tooltipContent.innerHTML;
    }
    // 为tooltip内容 进行递归处理子数据
    tooltipAppendData(tooltipContent, childData, indexLevel) {
        const maxIndexLevel = 2;   // 设置最大递归层级
        for (const child of childData) {
            // 如果 child.valueType 大于等于 5，则跳过当前循环
            if (child.valueType >= 5) {
                continue;
            }
            // 展开更多有用信息，代替它的层级。如果 "label": "来源",则展开详情（自己消失，代替层级）
            const sourceLocale = Locale.compose("LOC_ATTR_SOURCES");
            if (child.label == sourceLocale) {
                //debug
                // console.error("F1rstDan debug sourceLocale:" + sourceLocale);
                this.tooltipAppendData(tooltipContent, child.childData, indexLevel);
                continue;
            }

            const detailtData = document.createElement("div");
            const displayValue = child.isNegative ? child.value : `+${child.value}`;
            let displayLabel = child.label;
            // 修复本地化缺失：幸福感赤字，
            if (displayLabel == "LOC_ATTR_CLAMPED_HAPPINESS_DEFICIT") { displayLabel = Locale.compose("LOC_ATTR_HAPPINESS_DEFICIT");}
            // 如果是加成，加粗显示。正面黄色，负面红色
            let styleStart = "";
            let styleEnd = "";
            if (child.isModifier && !child.isNegative) {
                styleStart = "[STYLE:font-bold text-gradient-secondary]";
                styleEnd = "[/S]";
            } else if (child.isModifier && child.isNegative) {
                styleStart = "[STYLE:font-bold text-gradient-negative]";
                styleEnd = "[/S]";
            } else {
                styleStart = "";
                styleEnd = "";
            }
            // 缩进处理
            const indent = "&nbsp;&nbsp;".repeat(indexLevel);
            const prefix = indexLevel > 1 ? `·&nbsp;&nbsp;` : "";


            // 合并字符串，换行+样式头+缩进+前缀+值+标签+样式尾
            detailtData.innerHTML = `[N]${styleStart}${indent}${prefix}${displayValue} ${displayLabel}${styleEnd}`;
            tooltipContent.appendChild(detailtData);

            // 隐藏繁杂无效的信息。如果是 "label": "来自改良设施"，则不展开更多详情
            const improvementLocale = Locale.compose("LOC_ATTR_IMPROVEMENT_YIELDS");
            if (child.label == improvementLocale) {
                continue;
            }

            // 再展开一次，默认最多递归2级。maxIndexLevel可设置
            if (child.childData && child.childData.length > 0 && indexLevel < maxIndexLevel) {
                this.tooltipAppendData(tooltipContent, child.childData, indexLevel + 1);
            }
        }
    }

    createOrUpdateYieldEntry({ type, value, label, ...yieldData }) {
        if (!type) {
            console.error('city-yields: invalid yield type');
            return;
        }
    
        const yieldElements = this.yieldElements.get(type);
        if (!yieldElements) {
            const icon = document.createElement('fxs-icon');
            icon.classList.add('size-8', 'bg-no-repeat', 'bg-center');
            icon.setAttribute('data-icon-id', type);
            icon.setAttribute('data-icon-context', 'YIELD');
    
            const text = document.createTextNode(value);
            const container = document.createElement('div');
            container.role = "paragraph";
            container.ariaLabel = `${value} ${label}`;
            container.className = 'min-w-0 w-12 px-1 flex-initial flex flex-col items-center pointer-events-auto font-bold';
            container.append(icon, text);
    
            // 添加tooltip属性
            container.setAttribute('data-tooltip-anchor', 'bottom');
            container.setAttribute('data-tooltip-content', this.buildYieldTooltipContent({type, value, label, ...yieldData}));
    
            this.Root.appendChild(container);
            this.yieldElements.set(type, { text, icon, container });
        } else {
            yieldElements.text.nodeValue = value;
            // 更新tooltip内容
            yieldElements.container.setAttribute('data-tooltip-content', this.buildYieldTooltipContent({type, value, label, ...yieldData}));
        }
    }

    refresh(yields) {
        if (!yields) {
            const cityId = this.cityID;
            if (!cityId || !ComponentID.isValid(cityId)) {
                console.error('city-yields: invalid city id');
                return;
            }
            yields = CityYieldsEngine.getCityYieldDetails(cityId);
        }

        for (const yieldData of yields) {
            this.createOrUpdateYieldEntry(yieldData);
            //debug
            // console.error("F1rstDan debug yieldData[" + yieldData.type + `] : ${JSON.stringify(yieldData)}`);
        }
    }
}
Controls.define('city-yields', {
    createInstance: CityYieldsBar
});

//# sourceMappingURL=file:///base-standard/ui/production-chooser/city-yields.js.map
