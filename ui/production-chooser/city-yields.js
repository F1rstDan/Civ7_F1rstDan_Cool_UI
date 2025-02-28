import CityYieldsEngine from '/base-standard/ui/utilities/utilities-city-yields.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
const yieldTypeTextClassMap = {
    'YIELD_FOOD': 'text-yield-food',
    'YIELD_PRODUCTION': 'text-yield-production',
    'YIELD_GOLD': 'text-yield-gold',
    'YIELD_SCIENCE': 'text-yield-science',
    'YIELD_CULTURE': 'text-yield-culture',
    'YIELD_HAPPINESS': 'text-yield-happiness',
    'YIELD_DIPLOMACY': 'text-yield-influence',
    'YIELD_CITIES': 'text-secondary'
};
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
            const text = document.createTextNode(value.endsWith('.0') ? value.slice(0, -2) : value);
            const container = document.createElement('div');
            container.role = "paragraph";
            container.ariaLabel = `${value} ${label}`;
            container.className = 'min-w-0 w-12 px-1 flex-initial flex flex-col items-center pointer-events-auto';
            container.classList.add( yieldTypeTextClassMap[type], );
            container.append(icon, text);
    
            // 添加tooltip属性
            container.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
            container.type = type;
            container.label = label;
            container.value = value;
            container.yieldData = yieldData;
    
            this.Root.appendChild(container);
            this.yieldElements.set(type, { text, icon, container });
        } else {
            // yieldElements.text.nodeValue = value;
            yieldElements.text.nodeValue = value.endsWith('.0') ? value.slice(0, -2) : value;
            // 更新tooltip内容
            // 先检查container是否存在
            if (yieldElements.container) {
                yieldElements.container.yieldData = yieldData;
                // 同时更新其他可能需要更新的属性
                yieldElements.container.value = value;
            } else {
                console.error(`F1rstDan city-yields: container for ${type} not found`);
            }
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
        }
    }
}
Controls.define('city-yields', {
    createInstance: CityYieldsBar
});

//# sourceMappingURL=file:///base-standard/ui/production-chooser/city-yields.js.map
