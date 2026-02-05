/**
 * F1rstDan's Cool UI - 城市产量装饰器
 * 非侵入式实现，使用装饰器模式扩展 panel-production-chooser 组件功能
 * 适配文明7新版本架构：city-yields -> yield-bar-base (inside panel-production-chooser)
 * MOD下载地址：https://forums.civfanatics.com/resources/31961/
 * GitHub：https://github.com/F1rstDan/Civ7_F1rstDan_Cool_UI
 */

// 导入必要的依赖
// import { C as ComponentID } from '/core/ui/utilities/utilities-component-id.chunk.js';
// import { getUserModOptions } from '/f1rstdan-cool-ui/ui/options/f1rstdan-cool-ui-options.js';
import { DanCityData } from '/f1rstdan-cool-ui/ui/dan-city-banners/dan-city-custom-data.js';

// ==========================================
// 1. UI定位层 (UI Locating Layer, ULL)
// 职责：封装所有DOM元素查找逻辑，隔离官方UI结构变动
// ==========================================
class DanCityYieldsULL {
    /**
     * 获取 panel-production-chooser 组件内的 cityYieldBar
     * @param {HTMLElement} panel 组件实例
     * @returns {HTMLElement|null}
     */
    static getYieldBar(panel) {
        return panel?.cityYieldBar || null;
    }

    /**
     * 获取 YieldBar 的根容器 (处理官方可能的 Root 封装)
     * @param {HTMLElement} yieldBar 
     * @returns {HTMLElement|null}
     */
    static getYieldBarRoot(yieldBar) {
        if (!yieldBar) return null;
        return yieldBar.Root || yieldBar;
    }

    /**
     * 获取单个产量项的实际容器 (用于绑定 Tooltip)
     * @param {HTMLElement} outerContainer 外部容器
     * @returns {HTMLElement|null}
     */
    static getYieldItemContainer(outerContainer) {
        // 官方结构通常是 outer -> inner (lastElementChild)
        return outerContainer?.lastElementChild || null;
    }

    /**
     * 获取产量数值文本元素
     * @param {HTMLElement} container 
     * @returns {HTMLElement|null}
     */
    static getValueTextElement(container) {
        return container?.querySelector('.text-sm') || null;
    }
}

// ==========================================
// 2. 数据处理层 (Data Processing Layer, DPL)
// 职责：处理组件特有的数据转换逻辑
// ==========================================
class DanCityYieldsLocalDPL {
    /**
     * 定义产量类型对应的文本样式映射
     */
    static get YieldTypeTextClassMap() {
        return {
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
    }

    static normalizeYieldValue(y) {
        if (!y) return 0;
        const valueStr = y.value === undefined || y.value === null ? '' : String(y.value);
        if (typeof y.valueNum === 'number' && Number.isFinite(y.valueNum)) {
            // 如果有 valueNum，直接使用它。对数值进行四舍五入保留一位小数。
            return Math.round(y.valueNum * 10) / 10;
        }
        const normalized = Number(valueStr.replace(',', '.'));
        // 如果转换失败或结果为 NaN，返回 0
        return Number.isFinite(normalized) ? Math.round(normalized * 10) / 10 : 0;
    }

    /**
     * 将 DanCityData 的数据转换为 yield-bar-base 组件需要的格式
     * @param {Array} yields 原始产量数据列表
     * @returns {Array} 转换后的数据列表
     */
    static transformToYieldBarData(yields) {
        if (!Array.isArray(yields)) return [];

        return yields.map(y => ({
            type: y.type,
            value: DanCityYieldsLocalDPL.normalizeYieldValue(y),
            style: 0, // NONE
            _danData: y // 保留完整自定义数据供 Tooltip 使用
        }));
    }
}

// ==========================================
// 3. UI渲染层/控制器 (UI Rendering Layer / Controller)
// 职责：协调各层，管理组件生命周期
// ==========================================

/**
 * 城市产量装饰器类
 * 使用装饰器模式扩展 panel-production-chooser 组件
 */
export class DanCityYieldsDecorator {
    constructor(component) {
        this.panel = component; // 保存 panel-production-chooser 引用
        
        // 绑定方法
        this.updateCityYieldBar = this.updateCityYieldBar.bind(this);
        this.applyTooltips = this.applyTooltips.bind(this);

        // 扩展原始 updateCityYieldBar 方法
        if (this.panel.updateCityYieldBar) {
            this.originalUpdateCityYieldBar = this.panel.updateCityYieldBar.bind(this.panel);
            this.panel.updateCityYieldBar = this.updateCityYieldBar;
        } else {
            console.error('F1rstDan Mod: updateCityYieldBar method not found on panel-production-chooser');
        }
    }


    /**
     * 重写的 updateCityYieldBar 方法
     * 流程：DPL获取数据 -> LocalDPL转换格式 -> URL渲染
     */
    updateCityYieldBar() {
        if (!this.panel._cityID) {
            return;
        }

        // 1. 获取城市对象
        const city = Cities.get(this.panel._cityID);
        if (!city) {
            return;
        }

        // 2. 使用 DPL 获取详细产量数据
        const yields = DanCityData.getData('YIELDS_DETAILS', city);
        if (!yields) {
            return;
        }

        // 3. 使用 LocalDPL 转换为 UI 组件需要的格式
        const yieldBarData = DanCityYieldsLocalDPL.transformToYieldBarData(yields);

        // 4. 设置数据到 yield-bar-base 组件 (URL操作)
        const yieldBar = DanCityYieldsULL.getYieldBar(this.panel);
        if (yieldBar) {
            yieldBar.setAttribute("data-yield-bar", JSON.stringify(yieldBarData));
            
            // 5. 后处理：应用 Tooltips 和 自定义样式
            // 由于 update 是异步的，使用 Observer 确保 DOM 就绪
            this.applyTooltips(yieldBarData, city);
        }
    }

    /**
     * 应用 Tooltips 和样式修正
     * @param {Array} yieldBarData 渲染用的数据
     * @param {Object} city 城市对象
     */
    applyTooltips(yieldBarData, city) {
        const yieldBar = DanCityYieldsULL.getYieldBar(this.panel);
        if (!yieldBar) {
            console.error("F1rstDan: yieldBar not found!");
            return;
        }

        // 使用 ULL 获取 Root
        const root = DanCityYieldsULL.getYieldBarRoot(yieldBar);
        const targetCount = yieldBarData.length;

        // 内部应用逻辑函数
        const doApply = () => {
             // 再次检查 root 是否存在 (防守性编程)
             if (!root) return;
             
             const children = root.children;

             for (let i = 0; i < children.length; i++) {
                const data = yieldBarData[i];
                if (!data || !data._danData) continue;

                // 使用 ULL 获取容器
                const container = DanCityYieldsULL.getYieldItemContainer(children[i]);
                
                if (container) {
                    // 添加 Tooltip 样式标记
                    container.setAttribute('data-tooltip-style', 'dan-city-yields-tooltip');
                    // 必须添加 dan-tooltip 类
                    container.classList.add('dan-tooltip');
                    
                    // 挂载数据 (ViewModel)
                    container.yieldData = data._danData;
                    container.type = data.type;
                    container.label = data._danData.label;
                    container.value = data.value;
                    container.city = city;

                    // 确保可交互
                    container.classList.add('pointer-events-auto');
                    
                    // 应用自定义文本颜色
                    const colorClass = DanCityYieldsLocalDPL.YieldTypeTextClassMap[data.type];
                    if (colorClass) {
                        container.classList.add(colorClass);
                        // 使用 ULL 查找文本元素
                        const valueText = DanCityYieldsULL.getValueTextElement(container);
                        if (valueText) {
                            valueText.classList.add(colorClass);
                        }
                    }
                }
            }
        };

        // 检查是否已经就绪
        if (root.children.length >= targetCount) {
            doApply();
        } else {
            // 清理旧的 observer
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }

            // console.error(`F1rstDan: DOM not ready (Has: ${root.children.length}, Need: ${targetCount}). Waiting...`);

            this._observer = new MutationObserver((mutations, obs) => {
                if (root.children.length >= targetCount) {
                    // console.error(`F1rstDan: DOM ready via Observer. Executing.`);
                    doApply();
                    obs.disconnect();
                    this._observer = null;
                }
            });

            this._observer.observe(root, { childList: true });

            // 超时保护：500ms 后强制断开，避免内存泄漏
            setTimeout(() => {
                if (this._observer) {
                    // console.error("F1rstDan: Observer timeout. Force checking.");
                    if (root.children.length > 0) doApply(); // 尽力而为
                    this._observer.disconnect();
                    this._observer = null;
                }
            }, 500);
        }
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
        // 初始更新一次，确保数据正确
        if (this.panel._cityID) {
            this.updateCityYieldBar();
        }
    }

    beforeDetach() {
    }

    afterDetach() {
    }
}

// 挂载到 panel-production-chooser
Controls.decorate('panel-production-chooser', (component) => new DanCityYieldsDecorator(component));
