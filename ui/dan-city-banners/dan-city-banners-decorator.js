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

// 1.5 的横幅由 Solid 创建。保留当前工厂（包括其他 MOD 的覆盖），只添加信息。
const SOLID_BANNER_EVENTS = [
    'CityInitialized', 'CityRemovedFromMap', 'CityNameChanged',
    'CityYieldChanged', 'CityGrowthModeChanged',
    'FoodQueueChanged', 'CityGovernmentLevelChanged', 'PlayerTurnActivated',
    'TradeRouteAddedToMap', 'TradeRouteRemovedFromMap', 'TradeRouteChanged'
];

// 这些事件可安全地按 cityID 归属；其余事件可能影响多个城市，采用全量刷新。
const SOLID_BANNER_CITY_EVENTS = new Set([
    'CityYieldChanged', 'CityGrowthModeChanged', 'FoodQueueChanged',
    'CityNameChanged', 'CityGovernmentLevelChanged'
]);

const solidBannerAdapters = new Set();
const solidBannerRefreshQueue = new Set();
let solidBannerRefreshFrame = null;
let solidBannerEventsRegistered = false;
let solidBannerConnectionInfoEnabled;

const solidBannerEventHandlers = new Map(
    SOLID_BANNER_EVENTS.map(event => [event, data => handleSolidBannerEvent(event, data)])
);

/**
 * 新版横幅的连接信息选项要求重启后生效，本次 UI 生命周期只读取一次。
 */
function shouldDisplaySolidBannerConnectionInfo() {
    if (solidBannerConnectionInfoEnabled === undefined) {
        try {
            solidBannerConnectionInfoEnabled = getUserModOptions().cityBannerDisplayConnectionInfo !== false;
        } catch (error) {
            console.error('F1rstDan ModOptions get cityBannerDisplayConnectionInfo error:', error);
            solidBannerConnectionInfoEnabled = true;    // 如果MOD配置异常，默认启动
        }
    }
    return solidBannerConnectionInfoEnabled;
}

/**
 * 比较 cityID。城市 ID 可能是对象，也可能是可直接比较的值。
 */
function isSameCityID(first, second) {
    if (first === second) return true;
    if (!first || !second) return false;
    if (typeof first !== 'object' || typeof second !== 'object') return false;
    return first.owner == second.owner && first.id == second.id && first.type == second.type;
}

function queueSolidBannerRefresh(adapter) {
    if (!solidBannerAdapters.has(adapter)) return;
    solidBannerRefreshQueue.add(adapter);
    if (solidBannerRefreshFrame !== null) return;

    solidBannerRefreshFrame = requestAnimationFrame(() => {
        solidBannerRefreshFrame = null;
        const adapters = Array.from(solidBannerRefreshQueue);
        solidBannerRefreshQueue.clear();
        adapters.forEach(current => {
            if (!solidBannerAdapters.has(current)) return;
            try {
                current.update();
            } catch (error) {
                console.error('F1rstDan DanSolidCityBanner update error:', error);
            }
        });
    });
}

function handleSolidBannerEvent(event, data) {
    const cityID = data?.cityID;
    if (SOLID_BANNER_CITY_EVENTS.has(event) && cityID) {
        solidBannerAdapters.forEach(adapter => {
            if (isSameCityID(adapter.cityID, cityID)) queueSolidBannerRefresh(adapter);
        });
        return;
    }

    // 全局事件或缺少 cityID 时，保守刷新全部横幅。
    solidBannerAdapters.forEach(queueSolidBannerRefresh);
}

function registerSolidBannerEvents() {
    if (solidBannerEventsRegistered) return;
    solidBannerEventHandlers.forEach((handler, event) => engine.on(event, handler));
    solidBannerEventsRegistered = true;
}

function unregisterSolidBannerEvents() {
    if (!solidBannerEventsRegistered) return;
    solidBannerEventHandlers.forEach((handler, event) => engine.off(event, handler));
    solidBannerEventsRegistered = false;
}

function registerSolidBannerAdapter(adapter) {
    solidBannerAdapters.add(adapter);
    registerSolidBannerEvents();
}

function unregisterSolidBannerAdapter(adapter) {
    solidBannerRefreshQueue.delete(adapter);
    solidBannerAdapters.delete(adapter);
    if (solidBannerAdapters.size > 0) return;

    unregisterSolidBannerEvents();
    if (solidBannerRefreshFrame !== null) {
        cancelAnimationFrame(solidBannerRefreshFrame);
        solidBannerRefreshFrame = null;
    }
}

export class DanSolidCityBanner {
    constructor(root, cityID) {
        this.root = root;
        this.cityID = cityID;
        this.population = root.querySelector('.city-banner__population-container');
        this.connection = document.createElement('div');
        this.connection.className = 'dan-banner-connection font-body-xs text-white dan-tooltip';
        this.connection.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
        this.population.parentNode.insertBefore(this.connection, this.population.nextSibling);
        this.refresh = () => queueSolidBannerRefresh(this);
        registerSolidBannerAdapter(this);
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
    }

    dispose() {
        this.observer?.disconnect();
        this.observer = null;
        unregisterSolidBannerAdapter(this);
        this.connection.remove();
    }
}

const solidBanner = ComponentRegistry.get('CityBanner');
const originalSolidBanner = solidBanner.factory();
solidBanner.setFactory(() => props => {
    const result = originalSolidBanner(props);
    let adapter;
    onMount(() => {
        const root = typeof result === 'function' ? result() : result;
        if (!shouldDisplaySolidBannerConnectionInfo()) return;
        if (props.cityID.owner === GameContext.localPlayerID && root instanceof HTMLElement && root.querySelector('.city-banner__population-container')) {
            adapter = new DanSolidCityBanner(root, props.cityID);
        }
    });
    onCleanup(() => adapter?.dispose());
    return result;
});
