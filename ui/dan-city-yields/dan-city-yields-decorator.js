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

// 定义产量类型对应的文本样式映射
const yieldTypeTextClassMap = {
    'YIELD_FOOD': 'text-yield-food',
    'YIELD_PRODUCTION': 'text-yield-production',
    'YIELD_GOLD': 'text-yield-gold',
    'YIELD_SCIENCE': 'text-yield-science',
    'YIELD_CULTURE': 'text-yield-culture',
    'YIELD_HAPPINESS': 'text-yield-happiness',
    'YIELD_DIPLOMACY': 'text-yield-influence',
    'F1DAN_CITY_POPULATION': 'text-secondary',
    'F1DAN_CITY_CONNECTIVITY': 'text-secondary',
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
        this.addCustomYieldData = this.addCustomYieldData.bind(this);
        this.addChildYieldData = this.addChildYieldData.bind(this);
        this.createOrUpdateYieldEntry = this.createOrUpdateYieldEntry.bind(this);
        
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
                this.addCustomYieldData(yields);
            }
            for (const yieldData of yields) {
                this.createOrUpdateYieldEntry(yieldData);
            }
        };
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
        // 确保组件正确初始化
        // if (this.cityYields && this.cityYields.refresh) {
        //     this.cityYields.refresh();
        // }
    }

    /**
     * 组件附加后的初始化
     */
    afterAttach() {
        // 确保组件正确初始化
        if (this.cityYields && this.cityYields.refresh) {
            this.cityYields.refresh();
        }
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
            let icon;
            if (yieldData.isCustom) {
                icon = document.createElement("div");
                icon.style.setProperty("background-image", yieldData.icon);
                icon.style.setProperty("background-size", "contain");
                icon.style.setProperty("image-rendering", "smooth");
                // 给icon添加 不参与鼠标事件
                icon.style.setProperty("pointer-events", "none");
            } else {
                icon = document.createElement('fxs-icon');
                icon.setAttribute('data-icon-id', type);
                icon.setAttribute('data-icon-context', 'YIELD');
            }
            icon.classList.add("size-8", 'bg-no-repeat', 'bg-center');

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
    
    /**
     * 为产量数据添加子数据
     * @param {Object} parentData - 父产量数据
     * @param {string} label - 子数据描述标签
     * @param {number|string} value - 子数据数值
     * @param {Object} additionalData - 额外数据
     * @returns {Object} - 创建的子数据对象
     */
    addChildYieldData(parentData, label, value, additionalData = {}) {
        // 转换value为字符串，同时保留数值版本
        const valueStr = String(value);
        // Locale.plainText(string) 此处用于从文本中删除嵌入的字体图标 [icon:YIELD_FOOD]
        const valueNum = Number(Locale.plainText(valueStr));
        // if (Number.isNaN(valueNum)) { console.error(`F1rstDan city-yields: addChildYieldData ${label}: [Str]${valueStr} [Num]${valueNum}`); }

        // 创建子数据对象
        const childData = {
            label,
            value: valueStr,
            valueNum,
            valueType: -1,
            isNegative: valueNum < 0,
            isModifier: false,
            ...additionalData
        };

        // 确保父数据有 childData 数组
        if (!parentData.childData) {
            parentData.childData = [];
        }
        parentData.childData.push(childData);
        return childData;
    }
    
    /**
     * 添加自定义数据
     */
    addCustomYieldData(yields) {
        // 获取城市对象
        const city = Cities.get(this.cityYields.cityID);
        if (city) {
            // 一些默认值
            const isCustom = true;
            const showIcon = true;
            const isNegative = false;
            const isModifier = false;
            const valueType = -1;
            
            // 一些共用数值
            // 城市连接信息
            const connectedCities = city.getConnectedCities ? city.getConnectedCities() : [];
            let conectedCityCount = 0;
            let conectedTownCount = 0;
            if (connectedCities && connectedCities.length > 0) {
                // 统计城市和乡镇数量
                for (const connectedCityID of connectedCities) {
                    const connectedCity = Cities.get(connectedCityID);
                    if (connectedCity) {
                        if (connectedCity.isTown) {
                            conectedTownCount++;
                        } else {
                            conectedCityCount++;
                        }
                    }
                }
            }
            const connectedCitiesCount = conectedCityCount + conectedTownCount;
            // 一些共用函数
            const formatCityName = (city) => {
                // 检查是否为首都
                const isCapital = city.isCapital || false;
                // 如果是首都，添加星号标记
                return `(${city.population})${isCapital ? '★' : ''}${Locale.compose(city.name)}`;
            };
            
            // 【添加人口相关数据】 ==============================================
            const cityAllPop = city.population;
            const dataPopulation = {
                isCustom: isCustom,
                type: "F1DAN_CITY_POPULATION",
                label: '[icon:DAN_CITY_POPULATION] ' + Locale.toUpper(Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER")),
                value: String(cityAllPop),
                valueNum: Number(cityAllPop),
                icon: 'url("fs://game/f1rstdan-cool-ui/textures/F1dan_city_population.png")',
                showIcon: showIcon,
                isNegative: isNegative,
                isModifier: isModifier,
                valueType: valueType,
                childData: [],
            };
            
            // 添加 城市人口
            const cityPopData = this.addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER"), cityAllPop);

            const pendingPop = city.pendingPopulation;              // 待放置人口
            const ruralPop = city.ruralPopulation - pendingPop;     // 乡村人口
            const urbanPop = city.urbanPopulation;                  // 市区人口
            const specialistPop = city.Workers.getNumWorkers(false);  // 专家人口
            const migrantPop = cityAllPop - pendingPop - ruralPop - urbanPop - specialistPop;    // 移民人口
            
            this.addChildYieldData(cityPopData, Locale.compose("LOC_UI_CITY_STATUS_RURAL_POPULATION"), ruralPop);
            this.addChildYieldData(cityPopData, Locale.compose("LOC_UI_CITY_STATUS_URBAN_POPULATION"), urbanPop);
            
            // 专家人口 `（每个地块最多{1_SpecialistMax}名）`"LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE"
            const specialistMax = city.Workers.getCityWorkerCap();
            const textSpecialistMax = Locale.compose("LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE",specialistMax);
            // 专家人口大于0显示， 是城市且放置专家上限大于0显示。（这样初期不会显示了）
            if ( specialistPop > 0 || (!city.isTown && specialistMax > 0) ) {
                this.addChildYieldData(cityPopData, Locale.compose("LOC_UI_SPECIALISTS_SUBTITLE")+'&nbsp;[B]'+textSpecialistMax+'[/B]', specialistPop);
            }
            
            // 待放置人口，如果大于0才显示
            if (pendingPop > 0) {
                this.addChildYieldData(cityPopData, Locale.compose("LOC_RESOURCE_UNASSIGNED"), pendingPop);
            }
            
            if (migrantPop > 0) {
                this.addChildYieldData(cityPopData, Locale.compose("LOC_UNIT_MIGRANT_NAME"), migrantPop);
            }
            
            // X回合后出现新市民
            if (city.isTown && city.Growth?.growthType == GrowthTypes.PROJECT && conectedCityCount > 0) {
                // 如果是城镇并且专业化，连接城市大于0，则表示输送食物不涨人口。文本红色，加上"∞"回合后。数值正常显示
                this.addChildYieldData(dataPopulation, 
                    Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS","∞"), city.Growth.turnsUntilGrowth + '[icon:DAN_ICON_TURN]', 
                    {isNegative: true}
                );
            } else {
                // 正常情况下显示回合数
                this.addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS",city.Growth.turnsUntilGrowth), city.Growth.turnsUntilGrowth + '[icon:DAN_ICON_TURN]');
            }
            
            // 所需粮食数据
            const requiredFood = city.Growth.getNextGrowthFoodThreshold().value.toFixed(1);
            const currentFood = city.Growth.currentFood.toFixed(1);
            const foodData = this.addChildYieldData(dataPopulation, '[icon:YIELD_FOOD]' + Locale.compose("LOC_UI_CITY_DETAILS_FOOD_NEEDED_TO_GROW"), requiredFood);
            this.addChildYieldData(foodData, Locale.compose("LOC_UI_CITY_STATUS_CURRENT_FOOD_STOCKPILE"), '[icon:YIELD_FOOD]' + currentFood); // 模拟数据

            // 推送 人口相关数据 到 yields 数组
            yields.push(dataPopulation);
            // 【结束】添加人口相关数据  ==============================================

            // 【城市连通性数据】 ==============================================
            const dataConnectivity = {
                isCustom: isCustom,
                type: 'F1DAN_CITY_CONNECTIVITY',
                label: '[icon:DAN_CITY_CONNECTIVITY] ' + Locale.toUpper(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CONNECTED_1_TITLE")),
                value: String(connectedCitiesCount),  
                valueNum: connectedCitiesCount,
                icon: 'url("fs://game/f1rstdans_cool_ui/textures/F1dan_city_connectivity.png")',
                showIcon: showIcon,
                isNegative: isNegative,
                isModifier: isModifier,
                valueType: valueType,
                childData: [],
            };

            // 获取城市连接信息
            if (connectedCities && connectedCities.length > 0) {

                if (!city.isTown) {
                    // 城市数据结构
                    // 1. 连接城市数据
                    if (conectedCityCount > 0) {
                        const citiesData = this.addChildYieldData(dataConnectivity, 
                            '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_CITIES") + '[/B]', 
                            '[icon:YIELD_CITIES]' + conectedCityCount);
                        
                        // 添加具体城市名称
                        for (const connectedCityID of connectedCities) {
                            const connectedCity = Cities.get(connectedCityID);
                            if (connectedCity && !connectedCity.isTown) {
                                this.addChildYieldData(citiesData, formatCityName(connectedCity), "");
                            }
                        }
                    }

                    // 2. 连接乡镇数据
                    let totalReceivedFood = 0;
                    if (conectedTownCount > 0) {
                        const townsData = this.addChildYieldData(dataConnectivity, 
                            '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_TOWNS") + '[/B]', 
                            '[icon:YIELD_TOWNS]' + conectedTownCount);
                        
                        // 添加具体乡镇名称和食物数据
                        for (const connectedCityID of connectedCities) {
                            const connectedTown = Cities.get(connectedCityID);
                            if (connectedTown && connectedTown.isTown) {
                                // 检查乡镇是否已专业化
                                if (connectedTown.Growth?.growthType == GrowthTypes.PROJECT) {
                                    const townFoodYield = connectedTown.Yields?.getNetYield(YieldTypes.YIELD_FOOD);
                                    if (townFoodYield) {
                                        const connectedCitiesCount = connectedTown.getConnectedCities().filter(id => {
                                            const settlement = Cities.get(id);
                                            return settlement && !settlement.isTown;
                                        }).length;
                                        
                                        if (connectedCitiesCount > 0) {
                                            const foodForCity = townFoodYield / connectedCitiesCount;
                                            totalReceivedFood += foodForCity;
                                            this.addChildYieldData(townsData, 
                                                formatCityName(connectedTown), 
                                                '[icon:YIELD_FOOD]+' + foodForCity.toFixed(1), 
                                                {
                                                    // valueType: 1,
                                                    icon: "YIELD_FOOD",
                                                    iconContext: "YIELD"
                                                });
                                        }
                                    }
                                } else {
                                    // 乡镇未专业化，只显示名称
                                    this.addChildYieldData(townsData, formatCityName(connectedTown), "");
                                }
                            }
                        }
                    }

                    // 3. 总共获得食物
                    if (totalReceivedFood > 0) {
                        this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_FOOD]' + Locale.compose("LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME"), 
                            '[icon:YIELD_FOOD]+' + totalReceivedFood.toFixed(1), 
                            {
                                // valueType: 1,
                                icon: "YIELD_FOOD",
                                iconContext: "YIELD"
                            });
                    }
                } else {
                    // 乡镇数据结构
                    // 1. 连接城市数据
                    let townFoodYield;
                    if (conectedCityCount > 0) {
                        const citiesData = this.addChildYieldData(dataConnectivity, 
                            '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_CITIES") + '[/B]', 
                            '[icon:YIELD_CITIES]' + conectedCityCount);
                        
                        // 如果是专业化城镇，并且有食物产出，则添加食物输送数据
                        townFoodYield = city.Yields?.getNetYield(YieldTypes.YIELD_FOOD);
                        const isSpecializedTown = townFoodYield > 0 && city.Growth?.growthType == GrowthTypes.PROJECT;
                        const foodPerCity = isSpecializedTown ? townFoodYield / conectedCityCount : 0;
                        
                        // 添加具体城市名称和食物数据
                        for (const connectedCityID of connectedCities) {
                            const connectedCity = Cities.get(connectedCityID);
                            if (connectedCity && !connectedCity.isTown) {
                                if (isSpecializedTown) {
                                    // 专业化城镇显示食物输送数据
                                    this.addChildYieldData(citiesData, 
                                        formatCityName(connectedCity), 
                                        '[icon:YIELD_FOOD]' + (-foodPerCity).toFixed(1), 
                                        {
                                            icon: "YIELD_FOOD",
                                            iconContext: "YIELD",
                                            isNegative: true
                                        });
                                } else {
                                    // 默认只显示城市名称
                                    this.addChildYieldData(citiesData, formatCityName(connectedCity), "");
                                }
                            }
                        }
                    }
                    // 2. 连接乡镇数据
                    if (conectedTownCount > 0) {
                        const townsData = this.addChildYieldData(dataConnectivity, 
                            '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_TOWNS") + '[/B]', 
                            '[icon:YIELD_TOWNS]' + conectedTownCount);
                        
                        // 添加具体乡镇名称
                        for (const connectedCityID of connectedCities) {
                            const connectedTown = Cities.get(connectedCityID);
                            if (connectedTown && connectedTown.isTown) {
                                this.addChildYieldData(townsData, formatCityName(connectedTown), "");
                            }
                        }
                    }
                    // 3. 总共输出食物 - 只有在专业化且有食物产出时才显示
                    // 没必要显示，有些冗余，因为必然是食物产量
                    // if (townFoodYield > 0 && city.Growth?.growthType == GrowthTypes.PROJECT) {
                    //     this.addChildYieldData(dataConnectivity, 
                    //         '[icon:YIELD_FOOD]' + Locale.compose("LOC_ATTR_YIELD_MINUS_DEDUCTIONS"), 
                    //         '[icon:YIELD_FOOD]' + (-townFoodYield).toFixed(1), 
                    //         {
                    //             icon: "YIELD_FOOD",
                    //             iconContext: "YIELD",
                    //             isNegative: true
                    //         });
                    // }
                }
            }

            // 3. 添加贸易路线信息（如果有）
            // 定居点未连接到帝国的贸易网络。
            if (city.Trade && city.Trade.isInTradeNetwork() == false) {
                this.addChildYieldData(dataConnectivity, Locale.compose("LOC_UI_RESOURCE_ALLOCATION_SETTLEMENT_DISCONNECTED"), "",{isNegative: true});
                // console.error("F1rstDan CityYield isInTradeNetwork");
            }
            // TODO: 增加贸易信息

            // 推送数据到yields数组
            yields.push(dataConnectivity);
            // console.error("F1rstDan tooltip dataConnectivity",JSON.stringify(dataConnectivity));
            // 【结束】城市连通性数据  ==============================================
        }
    }
}

// 当游戏引擎准备好时初始化
engine.whenReady.then(() => {
    console.log('F1rstDan\'s Cool UI: Registered City Yields Decorator');
    // 注册装饰器
    Controls.decorate('city-yields', (component) => new DanCityYieldsDecorator(component));

});