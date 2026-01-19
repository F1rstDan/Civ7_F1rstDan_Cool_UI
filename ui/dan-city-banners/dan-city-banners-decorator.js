import { getUserModOptions } from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
import { DanCityData } from '/f1rstdan-cool-ui/ui/dan-city-banners/dan-city-custom-data.js';

const styleElement = document.createElement('style');
styleElement.innerHTML = `
.dan-default-tooltip-hide .tooltip{
    opacity: 0;
    display: none !important;
}
`;
document.head.appendChild(styleElement);

// ==========================================
// 1. 数据访问层 (Data Access Layer, DAL)
// ==========================================
const DanCityBannersDAL = {
    // 监听的事件列表
    EVENTS: [
        'CityAddedToMap', 'CityInitialized', 'CityNameChanged',
        'CapitalCityChanged', 'CityRemovedFromMap', 'CityStateBonusChosen',
        'CityGovernmentLevelChanged', 'FoodQueueChanged', 'CityGrowthModeChanged',
        'CityYieldGranted'
    ],

    /**
     * 获取是否显示连通性信息的配置
     */
    get isDisplayConnectionInfo() {
        try {
            return getUserModOptions().cityBannerDisplayConnectionInfo;
        } catch (error) {
            console.error('F1rstDan ModOptions get isDisplayConnectionInfo error:', error);
            return true;    // 如果MOD配置异常，默认启动
        }
    },

    /**
     * 注册事件监听器
     * @param {Function} handler 事件处理函数
     */
    registerEvents(handler) {
        this.EVENTS.forEach(event => engine.on(event, handler));
    },

    /**
     * 注销事件监听器
     * @param {Function} handler 事件处理函数
     */
    unregisterEvents(handler) {
        this.EVENTS.forEach(event => engine.off(event, handler));
    }
};

// ==========================================
// 2. UI 定位层 (UI Location Layer, ULL)
// ==========================================
const DanCityBannersULL = {
    /**
     * 获取 UI 上下文
     * @param {Object} component 组件实例
     * @returns {Object|null} 包含关键 DOM 元素的上下文对象
     */
    getContext(component) {
        if (!component || !component.elements) return null;
        return {
            component,
            city: component.city,
            elements: component.elements,
            banner: component.elements.container,
            populationCircle: component.Root.querySelector(".city-banner__population-container"),
            growthQueueMeter: component.elements.growthQueueMeter,
            popCount: component.elements.popCount
        };
    },

    /**
     * 创建或获取自定义元素
     * @param {Object} component 组件实例
     * @param {string} propertyName 属性名
     * @param {string} tagName 标签名
     * @param {string} className 类名
     * @param {HTMLElement} parentElement 父元素
     * @returns {HTMLElement} 元素
     */
    createCustomElement(component, propertyName, tagName, className, parentElement) {
        if (!component) {
            console.error('F1rstDan city-banners: component is undefined');
            return null;
        }
        
        if (!component[propertyName]) {
            component[propertyName] = document.createElement(tagName);
            component[propertyName].className = className;
        }
        
        if (parentElement && parentElement instanceof HTMLElement) {
            if (!parentElement.contains(component[propertyName])) {
                parentElement.appendChild(component[propertyName]);
            }
        }
        return component[propertyName];
    }
};

// ==========================================
// 3. UI 渲染层 (UI Rendering Layer, URL)
// ==========================================
const DanCityBannersURL = {
    /**
     * 初始化连通性布局
     */
    initConnectivityLayout(context, creator) {
        if (!context || !context.city || !context.populationCircle) return;
        
        const { component, banner, populationCircle } = context;

        // 创建连通性圆圈。 名称备注：Circle圆圈元素 |> Ring=进度条 -> Number=中心数字 | turn=下方旗帜 -> turn-number=下方数字
        const connectivityCircle = creator(component, 'connectivityCircle', 'div', 'items-center justify-center w-8 h-6 -mt-2 -mr-1 pointer-events-auto dan-tooltip hidden', banner);
        
        // 创建进度条和中心数字
        const connectivityRing = creator(component, 'connectivityRing', 'fxs-ring-meter', 'city-banner__ring bg-cover bg-center flex size-9 self-center align-center', connectivityCircle);
        if (connectivityRing) {
            connectivityRing.style.backgroundImage = 'url("fs://game/f1rstdans_cool_ui/textures/dan_city_connectivity_circle_bg.png")';
            connectivityRing.setAttribute("value", '0');
            connectivityRing.setAttribute("max-value", '100');
        }
        // 创建下方旗帜和下方数字
        const connectivityNumber = creator(component, 'connectivityNumber', 'div', 'font-body-xs text-white top-0 w-full text-center pointer-events-none', connectivityRing);
        if (connectivityNumber) connectivityNumber.textContent = '0';
        
        const connectivityTurn = creator(component, 'connectivityTurn', 'div', 'city-banner__turn flex flex-col justify-end align-center self-center top-0.5 pointer-events-none relative', connectivityCircle);
        creator(component, 'connectivityTurnNumber', 'div', 'city-banner__turn-number font-base-2xs text-white text-center w-full bg-cover bg-center bg-no-repeat hidden', connectivityTurn);

        // DOM 调整：确保 【城市连通性connectivityCircle】 在 【人口populationCircle】 之后
        if (populationCircle.parentNode && connectivityCircle) {
             populationCircle.parentNode.insertBefore(connectivityCircle, populationCircle.nextSibling);
        }

        // 设置 Tooltip 和数据绑定属性
        if (connectivityCircle) {
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
            connectivityCircle.city = context.city;
        }
    },

    /**
     * 更新连通性显示
     */
    updateConnectivity(context, data) {
        if (!context || !context.component.connectivityCircle) return;
        
        const { connectivityCircle, connectivityNumber } = context.component;

        if (!data) return;
        // 村庄没有 data.value 数据
        if (data.value && connectivityNumber) {
            connectivityCircle.value = data.value;
            connectivityNumber.textContent = data.value;
        }

        if (data.value > 0 || data.value == "-") {
            connectivityCircle.classList.remove('hidden');
        } else {
            connectivityCircle.classList.add('hidden');
        }
    },

    /**
     * 初始化人口 Tooltip
     */
    initPopulationTooltip(context) {
        if (!context || !context.populationCircle) return;
        const { populationCircle, popCount, city } = context;

        populationCircle.classList.add('dan-tooltip');
        populationCircle.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
        // 隐藏默认的 tooltip ，没找到怎么隐藏，只能把位置偏移到看不到的地方
        populationCircle.setAttribute("data-tooltip-content", "F1rstDan's Cool UI");
        populationCircle.setAttribute('data-tooltip-anchor', "top");
        populationCircle.setAttribute('data-tooltip-anchor-offset', "11111");
        
        // 去取子元素的鼠标指针属性auto 设置成pointer-events-none
        if (popCount) {
            popCount.removeAttribute("pointer-events-auto");
            popCount.setAttribute("pointer-events-none", "");
        }

        populationCircle.type = 'DAN_CITY_POPULATION';
        populationCircle.label = Locale.toUpper(Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER"));
        populationCircle.value = -1;
        populationCircle.isBanner = true;
        populationCircle.city = city;
    },

    /**
     * 更新人口数据（主要更新绑定到 DOM 上的属性）
     */
    updatePopulation(context, data) {
        if (!context || !context.populationCircle) return;
        if (!data) return;
        
        if (data.value) {
            context.populationCircle.value = data.value;
        }
    }
};

export class DanCityBannersDecorator {
    constructor(component) {
        this.component = component;
        // 给人口添加事件监听器
        this.observerPopulation = new MutationObserver(this.updatePopulationData.bind(this));
        
        // 添加防抖功能，更新城市连接数据
        this.updateConnectivityData = this.debounce(this.updateConnectivityData.bind(this), 300);
    }

    // 防抖函数 （防止读档时，触发多个事件造成重复更新数据，导致卡顿）
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    beforeAttach() {
        const context = DanCityBannersULL.getContext(this.component);
        // Hook up to growthQueueMeter's updates
        if (context && context.growthQueueMeter) {
            const observerPopulationConfig = { attributes: true, attributeFilter: ['value', 'max-value'] };
            this.observerPopulation.observe(context.growthQueueMeter, observerPopulationConfig);
        }
        
        // 注册全局事件监听
        DanCityBannersDAL.registerEvents(this.updateConnectivityData);
    }

    afterAttach() {
        try {
            const context = DanCityBannersULL.getContext(this.component);
            if (!context) return;

            // 应用城市连通性布局和样式
            if (DanCityBannersDAL.isDisplayConnectionInfo) {
                DanCityBannersURL.initConnectivityLayout(context, DanCityBannersULL.createCustomElement);
                this.updateConnectivityData();
            }

            // 应用人口的 Tooltip
            DanCityBannersURL.initPopulationTooltip(context);
            this.updatePopulationData();
            
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
        DanCityBannersDAL.unregisterEvents(this.updateConnectivityData);
        
        // 清除可能存在的定时器 (debounce 闭包中的 timer 无法直接清除，但组件销毁后回调执行也无大碍，或者可以在 debounce 中暴露 cancel 方法)
        // 简单处理：这里不处理 debounce timer，因为 DOM 已销毁，更新函数内的 ULL.getContext 会返回 null 从而安全退出
    }

    updateConnectivityData() {
        if (!DanCityBannersDAL.isDisplayConnectionInfo) return;
        
        const context = DanCityBannersULL.getContext(this.component);
        if (!context) return;

        const data = DanCityData.getData('DAN_CITY_CONNECTIVITY', this.component.city);
        DanCityBannersURL.updateConnectivity(context, data);
    }

    updatePopulationData() {
        const context = DanCityBannersULL.getContext(this.component);
        if (!context) return;

        const data = DanCityData.getData('DAN_CITY_POPULATION', this.component.city);
        DanCityBannersURL.updatePopulation(context, data);
    }
}

Controls.decorate('city-banner', (component) => new DanCityBannersDecorator(component));
