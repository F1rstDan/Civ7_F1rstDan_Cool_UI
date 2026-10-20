import { getUserModOptions } from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
import { DanCityData } from '/f1rstdan-cool-ui/ui/dan-city-banners/dan-city-custom-data.js';
import { ComponentRegistry } from '/core/ui-next/services/component-registry.js';
import { onMount, onCleanup } from '/core/vendor/solid-js/dist/solid.js';
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import '/base-standard/ui-next/screens/city-banners/city-banner.js';

const styleElement = document.createElement('style');
styleElement.innerHTML = `
.dan-banner-connection {
    /* 城市连通性金圈：手动微调以下参数即可。 */
    --dan-connection-size: 2rem;           /* 圆圈直径。 */
    --dan-connection-offset-y: -0.28rem;   /* 负值上移，正值下移。 */
    --dan-connection-margin-left: -0.33rem;  /* 左外边距，减小可收紧左侧间隔。 */
    --dan-connection-margin-right: -0.11rem; /* 右外边距，减小可收紧右侧间隔。 */
    display: flex;
    position: relative;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    flex-shrink: 0;
    width: var(--dan-connection-size);
    height: var(--dan-connection-size);
    /* 对齐官方人口圆圈：容器上移 0.4444rem，圆环自身下移 0.1667rem。 */
    margin-top: var(--dan-connection-offset-y);
    margin-left: var(--dan-connection-margin-left);
    margin-right: var(--dan-connection-margin-right);
    pointer-events: auto;
    background: url("fs://game/f1rstdan-cool-ui/textures/dan_city_connectivity_circle_bg.png") center / contain no-repeat;
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
            populationCircle: component.Root.querySelector(".city-banner__population-container")
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
    }
};

export class DanCityBannersDecorator {
    constructor(component) {
        this.component = component;

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
            
        } catch (error) {
            console.error('F1rstDan DanCityBannersDecorator afterAttach error:', error);
        }
    }

    beforeDetach() {
    }

    afterDetach() {
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
}

Controls.decorate('city-banner', (component) => new DanCityBannersDecorator(component));

// 1.5 的横幅由 Solid 创建。保留当前工厂（包括其他 MOD 的覆盖），只添加信息。
export class DanSolidCityBanner {
    static events = [
        'CityInitialized', 'CityRemovedFromMap', 'CityNameChanged',
        'CityYieldChanged', 'CityGrowthModeChanged',
        'FoodQueueChanged', 'CityGovernmentLevelChanged', 'PlayerTurnActivated',
        'TradeRouteAddedToMap', 'TradeRouteRemovedFromMap', 'TradeRouteChanged'
    ];

    constructor(root, cityID) {
        this.root = root;
        this.cityID = cityID;
        this.population = root.querySelector('.city-banner__population-container');
        this.connection = document.createElement('div');
        this.connection.className = 'dan-banner-connection font-body-xs text-white dan-tooltip';
        this.connection.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
        this.population.parentNode.insertBefore(this.connection, this.population.nextSibling);
        this.refresh = () => {
            if (this.refreshFrame) return;
            this.refreshFrame = requestAnimationFrame(() => {
                this.refreshFrame = null;
                this.update();
            });
        };
        DanSolidCityBanner.events.forEach(event => engine.on(event, this.refresh));
        root.danBannerAdapter = this;
        this.update();
    }

    bindTooltip(target, type, city) {
        const data = DanCityData.getData(type, city);
        Object.assign(target, { type, city, yieldData: data, label: data.label, value: data.value, isBanner: true });
        const tooltip = TooltipManager.types['dan-city-yields-tooltip'];
        if (tooltip?.target === target) tooltip.target = null;
        return data;
    }

    update() {
        const city = Cities.get(this.cityID);
        if (!city) return;
        // Solid 可保留横幅根节点而重建内部内容，需重新找到人口圆圈作为连通性圆圈的挂载锚点。
        if (!this.observer) {
            this.observer = new MutationObserver(() => {
                const population = this.root.querySelector('.city-banner__population-container');
                if (!population) return;
                if (population !== this.population ||
                    !this.root.contains(this.connection) ||
                    population.nextSibling !== this.connection) {
                    this.refresh();
                }
            });
            this.observer.observe(this.root, { childList: true, subtree: true });
        }
        const population = this.root.querySelector('.city-banner__population-container');
        if (!population) return;
        this.population = population;
        if (!this.root.contains(this.connection) || population.nextSibling !== this.connection) {
            population.parentNode.insertBefore(this.connection, population.nextSibling);
        }
        const data = this.bindTooltip(this.connection, 'DAN_CITY_CONNECTIVITY', city);
        this.connection.textContent = data.value;
        this.connection.setAttribute('aria-label', `${data.label} ${data.value}`);
        this.connection.style.display = getUserModOptions().cityBannerDisplayConnectionInfo ? 'flex' : 'none';
    }

    dispose() {
        this.observer?.disconnect();
        if (this.refreshFrame) cancelAnimationFrame(this.refreshFrame);
        DanSolidCityBanner.events.forEach(event => engine.off(event, this.refresh));
        this.connection.remove();
        delete this.root.danBannerAdapter;
    }
}

const solidBanner = ComponentRegistry.get('CityBanner');
const originalSolidBanner = solidBanner.factory();
solidBanner.setFactory(() => props => {
    const result = originalSolidBanner(props);
    let adapter;
    onMount(() => {
        const root = typeof result === 'function' ? result() : result;
        if (props.cityID.owner === GameContext.localPlayerID && root instanceof HTMLElement && root.querySelector('.city-banner__population-container')) {
            adapter = new DanSolidCityBanner(root, props.cityID);
        }
    });
    onCleanup(() => adapter?.dispose());
    return result;
});
