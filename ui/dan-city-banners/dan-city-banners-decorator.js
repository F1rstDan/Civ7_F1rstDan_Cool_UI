import { updateCustomDataToCityBanner } from '/f1rstdan-cool-ui/ui/dan-city-banners/dan-city-custom-data.js';
import { getUserModOptions } from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
const styleElement = document.createElement('style');
styleElement.innerHTML = `
.dan-default-tooltip-hide .tooltip{
    opacity: 0;
    display: none !important;
}
`;
document.head.appendChild(styleElement);

export class DanCityBannersDecorator {
    get isDisplayConnectionInfo() {
        try {
            return getUserModOptions().cityBannerDisplayConnectionInfo;
        } catch (error) {
            console.error('F1rstDan ModOptions get isDisplayConnectionInfo error:', error);
            return true;    // 如果MOD配置异常，默认启动
        }
    }

    constructor(component) {
        this.component = component;
        // 给人口添加事件监听器
        this.observerPopulation = new MutationObserver(this.updatePopulationData.bind(this));
        
        // 添加防抖功能，更新城市连接数据
        this.updateConnectivityData = this.debounce(this.updateConnectivityData.bind(this), 300);
        // this.updateConnectivityData = this.updateConnectivityData.bind(this);
    }

    // 添加防抖函数。（防止读档时，过多触发事件造成频繁更新数据）
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    beforeAttach() {
        // Hook up to growthQueueMeter's updates, which will be updated when currentFood or population is updated.
        const observerPopulationConfig = { attributes: true, attributeFilter: ['value', 'max-value'] }; // currentFood and nextThreshold
        this.observerPopulation.observe(this.component.elements.growthQueueMeter, observerPopulationConfig);
        // 监听城市事件，以便在城市数据发生变化时更新 城市连接数数据
        engine.on('CityAddedToMap', this.updateConnectivityData);
        engine.on('CityInitialized', this.updateConnectivityData); // Use instead of CityAddedToMap, as not all values are populated when that event fires.
        engine.on('CityNameChanged', this.updateConnectivityData);
        engine.on('CapitalCityChanged', this.updateConnectivityData);
        // engine.on('CityYieldChanged', this.updateConnectivityData);
        engine.on('CityRemovedFromMap', this.updateConnectivityData);
        // engine.on('CitySelectionChanged', this.updateConnectivityData);
        engine.on('CityStateBonusChosen', this.updateConnectivityData);
        engine.on('CityGovernmentLevelChanged', this.updateConnectivityData);
        engine.on('FoodQueueChanged', this.updateConnectivityData);
        engine.on('CityGrowthModeChanged', this.updateConnectivityData);
        engine.on('CityYieldGranted', this.updateConnectivityData);
    }

    afterAttach() {
        try {
            // 应用城市连通性布局和样式
            if (this.isDisplayConnectionInfo) {
                this.applyConnectivityLayout();
            }
            // 应用人口的 Tooltip
            this.applyPopulationTooltip();

            
        } catch (error) {
            console.error('F1rstDan DanCityBannersDecorator afterAttach error:', error);
        }
    }

    beforeDetach() {
    }

    afterDetach() {
        // 移除人口事件监听器
        this.observerPopulation.disconnect();
        // 移除所有事件监听器
        engine.off('CityAddedToMap', this.updateConnectivityData);
        engine.off('CityInitialized', this.updateConnectivityData); // Use instead of CityAddedToMap, as not all values are populated when that event fires.
        engine.off('CityNameChanged', this.updateConnectivityData);
        engine.off('CapitalCityChanged', this.updateConnectivityData);
        // engine.off('CityYieldChanged', this.updateConnectivityData);
        engine.off('CityRemovedFromMap', this.updateConnectivityData);
        // engine.off('CitySelectionChanged', this.updateConnectivityData);
        engine.off('CityStateBonusChosen', this.updateConnectivityData);
        engine.off('CityGovernmentLevelChanged', this.updateConnectivityData);
        engine.off('FoodQueueChanged', this.updateConnectivityData);
        engine.off('CityGrowthModeChanged', this.updateConnectivityData);
        engine.off('CityYieldGranted', this.updateConnectivityData);
        // 清除可能存在的定时器
        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
        }
    }

    /**
     * 应用自定义布局样式到组件和DOM结构调整功能
     */
    applyConnectivityLayout() {
        const city = this.component.city;
        const elements = this.component.elements;
        const cityBanner = elements.container;
        const cityNameContainer = elements.cityNameContainer;
        const populationCircle = this.component.Root.querySelector(".city-banner__population-container");
        if (!populationCircle) {
            return;
        }
        const populationRing = elements.growthQueueMeter;

        // 增加 城市连通性 Circle圆圈元素 |> Ring=进度条 -> Number=中心数字 | turn=下方旗帜 -> turn-number=下方数字
        const connectivityCircle = this.createCustomElement('connectivityCircle', 'div', 'items-center justify-center w-8 h-6 -mt-2 -mr-1 pointer-events-auto dan-tooltip hidden', cityBanner);
        // 创建进度条和中心数字
        const connectivityRing = this.createCustomElement('connectivityRing', 'fxs-ring-meter', 'city-banner__ring bg-cover bg-center flex size-9 self-center align-center', connectivityCircle);
        // connectivityRing.style.backgroundImage = `url('hud_sub_circle_bk')`;
        connectivityRing.style.backgroundImage = 'url("fs://game/f1rstdans_cool_ui/textures/dan_city_connectivity_circle_bg.png")';
        connectivityRing.setAttribute("value", '0');
        connectivityRing.setAttribute("max-value", '100');
        const connectivityNumber = this.createCustomElement('connectivityNumber', 'div', 'font-body-xs text-white top-0 w-full text-center pointer-events-none', connectivityRing);
        connectivityNumber.textContent = '0';
        // 创建下方旗帜和下方数字
        const connectivityTurn = this.createCustomElement('connectivityTurn', 'div', 'city-banner__turn flex flex-col justify-end align-center self-center top-0\.5 pointer-events-none relative', connectivityCircle);
        const connectivityTurnNumber = this.createCustomElement('connectivityTurnNumber', 'div', 'city-banner__turn-number font-base-2xs text-white text-center w-full bg-cover bg-center bg-no-repeat hidden', connectivityTurn);

        // 确保DOM结构正确，确保 城市连通性 在 人口 之后
        if (populationCircle.parentNode) {
            // console.error("F1rstDan cityBanner is running")
            // 确保主要信息区在图标之后
            if (connectivityCircle && populationCircle) {
                populationCircle.parentNode.insertBefore(connectivityCircle, populationCircle.nextSibling);
            }
        }
        // 设置 tooltip
        connectivityCircle.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
        // 隐藏默认的 tooltip ，没找到怎么隐藏，只能把位置偏移到看不到的地方
        connectivityCircle.setAttribute("data-tooltip-content", "F1rstDan's Cool UI");
        connectivityCircle.setAttribute('data-tooltip-anchor', "top");
        connectivityCircle.setAttribute('data-tooltip-anchor-offset', "11111");

        // 设置自定义属性
        connectivityCircle.type = 'DAN_CITY_CONNECTIVITY';
        connectivityCircle.label = Locale.toUpper(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CONNECTED_1_TITLE"));
        connectivityCircle.value = -1;
        connectivityCircle.isBanner = true;
        connectivityCircle.city = city;

        
        this.updateConnectivityData();
    }
    // 更新数据，然后更新显示
    // 如果MOD配置 选择隐藏城市横幅上的 城市连接性 ，则隐藏
    updateConnectivityData() {
        if (!this.isDisplayConnectionInfo) return;

        const city = this.component.city;
        const elements = this.component.elements;
        const connectivityCircle = this.component.connectivityCircle;
        const connectivityNumber = this.component.connectivityNumber;

        const data = updateCustomDataToCityBanner(connectivityCircle.type, city);
        if (!data) {
            return; 
        }
        // 村庄没有 data.value 数据
        if (data.value) {
            // 更新元素的属性
            connectivityCircle.value = data.value;
            // 更新显示的数字
            connectivityNumber.textContent = data.value;
        }
        if (data.value > 0 || data.value == "-") {
            connectivityCircle.classList.remove('hidden');
        } else {
            connectivityCircle.classList.add('hidden');
        }

        // TODO 更新下方数字 ，待定
        // const connectivityTurnNumber = this.component.connectivityTurnNumber;
        // const dataTurns = -1;
        // if (dataTurns >= 0) {
        //     connectivityTurnNumber.innerHTML = dataTurns.toString();
        //     connectivityTurnNumber.classList.remove('hidden');
        // }
        // else {
        //     connectivityTurnNumber.classList.add('hidden');
        // }
    }

    // 应用 Tooltip 到 人口 元素
    applyPopulationTooltip(){
        const city = this.component.city;
        const elements = this.component.elements;
        // const cityBanner = elements.container;
        const populationCircle = this.component.Root.querySelector(".city-banner__population-container");
        if (!populationCircle) {
            return; 
        }
        // 设置 tooltip
        populationCircle.classList.add('dan-tooltip');
        populationCircle.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
        // 隐藏默认的 tooltip ，没找到怎么隐藏，只能把位置偏移到看不到的地方
        populationCircle.setAttribute("data-tooltip-content", "F1rstDan's Cool UI");
        populationCircle.setAttribute('data-tooltip-anchor', "top");
        populationCircle.setAttribute('data-tooltip-anchor-offset', "11111");
        // 去取子元素的鼠标指针属性auto 设置成pointer-events-none
        elements.popCount.removeAttribute("pointer-events-auto");
        elements.popCount.setAttribute("pointer-events-none", "");

        // 设置自定义属性
        populationCircle.type = 'DAN_CITY_POPULATION';
        populationCircle.label = Locale.toUpper(Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER"));
        populationCircle.value = -1;
        populationCircle.isBanner = true;
        populationCircle.city = city;

        this.updatePopulationData();
    }
    updatePopulationData() {
        const city = this.component.city;
        const elements = this.component.elements;
        const populationCircle = this.component.Root.querySelector(".city-banner__population-container");

        const data = updateCustomDataToCityBanner(populationCircle.type, city);
        if (!data) {
            return; 
        }
        if (data.value) {
            populationCircle.value = data.value;
        }
    }


    // 辅助函数
    /**
     * 创建自定义元素。确保自定义元素存在，如果不存在则创建。 
     * @param {string} propertyName - 元素属性名称
     * @param {string} tagName - 元素标签名称
     * @param {string} className - 元素的类名
     * @param {HTMLElement} parentElement - 父元素
     */
    createCustomElement(propertyName, tagName, className, parentElement) {
        if (!this.component[propertyName]) {
            this.component[propertyName] = document.createElement(tagName);
            this.component[propertyName].className = className;
        }
        if (parentElement) parentElement.appendChild(this.component[propertyName]);
        return this.component[propertyName];
    }
}

Controls.decorate('city-banner', (component) => new DanCityBannersDecorator(component));