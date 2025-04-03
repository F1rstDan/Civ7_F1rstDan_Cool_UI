/**
 * F1rstDan's Cool UI - 城市产量装饰器
 * 非侵入式实现，使用装饰器模式扩展city-yields组件功能
 * sourceMappingURL=file:///base-standard/ui/production-chooser/city-yields.js.map
 * MOD下载地址：https://forums.civfanatics.com/resources/31961/
 * GitHub：https://github.com/F1rstDan/Civ7_F1rstDan_Cool_UI
 */

// 导入必要的依赖
import F1rstDanModOptions from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
import CityYieldsEngine from '/base-standard/ui/utilities/utilities-city-yields.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { addCustomDataToYields } from '/f1rstdan-cool-ui/ui/dan-city-banners/dan-city-custom-data.js';

// 定义产量类型对应的文本样式映射
const yieldTypeTextClassMap = {
    'YIELD_FOOD': 'text-yield-food',
    'YIELD_PRODUCTION': 'text-yield-production',
    'YIELD_GOLD': 'text-yield-gold',
    'YIELD_SCIENCE': 'text-yield-science',
    'YIELD_CULTURE': 'text-yield-culture',
    'YIELD_HAPPINESS': 'text-yield-happiness',
    'YIELD_DIPLOMACY': 'text-yield-influence',
    'DAN_CITY_POPULATION': 'text-secondary',
    'DAN_CITY_CONNECTIVITY': 'text-secondary',
    'YIELD_CITIES': 'text-secondary',
};

/**
 * 城市产量装饰器类
 * 使用装饰器模式扩展原生city-yields组件
 */
export class DanCityYieldsDecorator {
    constructor(component) {
        this.cityYields = component; // 保存原始控件引用
        
        // 绑定方法到实例
        this.createOrUpdateYieldEntry = this.createOrUpdateYieldEntry.bind(this);
        // 添加防抖函数
        this.debounce = (func, wait) => {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        };
        
        // 扩展原始refresh方法
        const originalRefresh = this.cityYields.refresh;
        this.cityYields.refresh = (yields) => {
            if (!yields) {
                const cityId = this.cityYields.cityID;
                if (!cityId || !ComponentID.isValid(cityId)) {
                    console.error('city-yields: invalid city id');
                    return;
                }
                yields = CityYieldsEngine.getCityYieldDetails(cityId);
                // 添加自定义数据
                // this.addCustomYieldData(yields);
                addCustomDataToYields(yields, Cities.get(cityId));
            }
            for (const yieldData of yields) {
                this.createOrUpdateYieldEntry(yieldData);
            }
        };
        // 应用防抖，设置300毫秒延迟 （防止过多触发事件造成频繁更新数据）
        this.cityYields.refresh = this.debounce(this.cityYields.refresh, 150);
        // 扩展原始createOrUpdateYieldEntry方法
        this.cityYields.createOrUpdateYieldEntry = this.createOrUpdateYieldEntry;
    }
    get hasModOptions() {
        return F1rstDanModOptions!== null && F1rstDanModOptions!== undefined;
    }
    get isYieldsBarValueFormat() {
        if (!this.hasModOptions) return true;   // 如果MOD配置为空，默认启动
        return F1rstDanModOptions.cityYieldsBarValueFormat;
    }
    
    /**
     * 组件附加前的初始化
     */
    beforeAttach() {
    }

    /**
     * 组件附加后的初始化
     */
    afterAttach() {
        // 确保组件正确初始化
        // if (this.cityYields && this.cityYields.refresh) {
        //     this.cityYields.refresh();
        // }
    }

    beforeDetach() {
    }

    afterDetach() {
    }
    
    /**
     * 创建或更新产量条目
     */
    createOrUpdateYieldEntry({ type, value, label, ...yieldData }) {
        if (!type) {
            console.error('city-yields: invalid yield type');
            return;
        }

        const yieldElements = this.cityYields.yieldElements.get(type);
        // 添加临时函数(数字或字符串)，如果设置=true,则将参数 四舍五入 输出，否则将参数 省略.0或,0 输出
        const formatValue = (value) => {
            let valueStr = String(value);
            if (this.isYieldsBarValueFormat) {
                // 处理不同语言的小数点格式（点或逗号）
                const numValue = Number(valueStr.replace(',', '.'));
                if (!isNaN(numValue)) {
                    valueStr = Math.round(numValue).toString();
                }
            } else {
                // 处理小数点后为0的情况，支持点和逗号两种格式
                valueStr = valueStr.endsWith('.0') || valueStr.endsWith(',0') ? valueStr.slice(0, -2) : valueStr;
            }
            return valueStr;
        };
        if (!yieldElements) {
            const icon = document.createElement('fxs-icon');
            icon.classList.add('size-8', 'bg-no-repeat', 'bg-center');
            icon.setAttribute('data-icon-id', type);
            icon.setAttribute('data-icon-context', 'YIELD');

            const text = document.createTextNode(formatValue(value));
            const container = document.createElement('div');
            container.role = "paragraph";
            container.ariaLabel = `${value} ${label}`;
            container.className = 'min-w-0 w-12 px-1 flex-initial flex flex-col items-center pointer-events-auto';
            container.classList.add(yieldTypeTextClassMap[type]);
            container.append(icon, text);
            
            // 添加tooltip属性
            container.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
            container.type = type;
            container.label = label;
            container.value = value;
            container.yieldData = yieldData;
    
            this.cityYields.Root.appendChild(container);
            this.cityYields.yieldElements.set(type, { text, icon, container });
        } else {
            yieldElements.text.nodeValue = formatValue(value);
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
}

Controls.decorate('city-yields', (component) => new DanCityYieldsDecorator(component));