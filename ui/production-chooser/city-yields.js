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
    'F1DAN_CITY_POPULATION': 'text-secondary',
    'F1DAN_CITY_CONNECTIVITY': 'text-secondary',
    'YIELD_CITIES': 'text-secondary',
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
            const valueStr = String(value);
            const text = document.createTextNode(valueStr.endsWith('.0') ? valueStr.slice(0, -2) : valueStr);
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
            const valueStr = String(value);
            yieldElements.text.nodeValue = valueStr.endsWith('.0') ? valueStr.slice(0, -2) : valueStr;
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
        const valueNum = Number(value);

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
        const city = Cities.get(this.cityID);
        if (city) {
            // 一些默认值
            const isCustom = true;
            const showIcon = true;
            const isNegative = false;
            const isModifier = false;
            const valueType = -1;

            // 【添加人口相关数据】 ==============================================
            const cityAllPop = city.population;
            const dataPopulation = {
                isCustom: isCustom,
                type: "F1DAN_CITY_POPULATION",
                label: Locale.toUpper(Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER")),
                value: String(cityAllPop),
                valueNum: Number(cityAllPop),
                icon: 'url("fs://game/f1rstdans_cool_ui/textures/F1dan_city_population.png")',
                showIcon: showIcon,
                isNegative: isNegative,
                isModifier: isModifier,
                valueType: valueType,
                childData: [],
            };
            // 添加 城市人口
            const cityPopData = this.addChildYieldData(dataPopulation, Locale.compose("LOC_HOF_GRAPH_CITY_POPULATION"), cityAllPop);

            const pendingPop = city.pendingPopulation;              // 待建设人口
            const ruralPop = city.ruralPopulation - pendingPop;     // 乡村人口
            const urbanPop = city.urbanPopulation;                  // 市区人口
            const specialistPop = cityAllPop - pendingPop - ruralPop - urbanPop; // 专家人口
            this.addChildYieldData(cityPopData, Locale.compose("LOC_UI_CITY_STATUS_RURAL_POPULATION"), ruralPop);
            this.addChildYieldData(cityPopData, Locale.compose("LOC_UI_CITY_STATUS_URBAN_POPULATION"), urbanPop);
            // 专家人口 `（每个地块最多{1_SpecialistMax}名）`"LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE"
            let textSpecialistMax = ''; 
            if (city.Workers) {
                textSpecialistMax = Locale.compose("LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE",city.Workers.getCityWorkerCap());
            } else {
                console.error(`F1rstDan city-yields - failed to find valid city workers for city ${this.cityID}`);
            }
            this.addChildYieldData(cityPopData, Locale.compose("LOC_ATTR_NUM_WORKERS_ON_TILE")+' '+textSpecialistMax, specialistPop);
            // 待建设人口
            this.addChildYieldData(cityPopData, Locale.compose("LOC_DIPLOMACY_START_PENDING_PROJECTS_TITLE"), pendingPop);
            
            // X回合后出现新市民
            this.addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS",""), city.Growth.turnsUntilGrowth);
            
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
                label: Locale.toUpper(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CONNECTED_1_TITLE")),
                value: "0",  // 初始值，将根据连接城市数量更新
                valueNum: 0,
                icon: 'url("fs://game/f1rstdans_cool_ui/textures/F1dan_city_connectivity.png")',
                showIcon: showIcon,
                isNegative: isNegative,
                isModifier: isModifier,
                valueType: valueType,
                childData: [],
            };

            // 获取城市连接信息
            const connectedCities = city.getConnectedCities ? city.getConnectedCities() : [];
            if (connectedCities && connectedCities.length > 0) {
                let cityCount = 0;
                let townCount = 0;
                
                // 统计城市和乡镇数量
                for (const connectedCityID of connectedCities) {
                    const connectedCity = Cities.get(connectedCityID);
                    if (connectedCity) {
                        if (connectedCity.isTown) {
                            townCount++;
                        } else {
                            cityCount++;
                        }
                    }
                }

                if (!city.isTown) {
                    // 城市数据结构
                    // 1. 连接城市数据
                    if (cityCount > 0) {
                        const citiesData = this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_CITIES]' + Locale.compose("LOC_ATTR_NUM_CITIES"), 
                            '[icon:YIELD_CITIES]' + cityCount);
                        
                        // 添加具体城市名称
                        for (const connectedCityID of connectedCities) {
                            const connectedCity = Cities.get(connectedCityID);
                            if (connectedCity && !connectedCity.isTown) {
                                this.addChildYieldData(citiesData, Locale.compose(connectedCity.name), "");
                            }
                        }
                    }

                    // 2. 连接乡镇数据
                    let totalReceivedFood = 0;
                    if (townCount > 0) {
                        const townsData = this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_TOWNS]' + Locale.compose("LOC_ATTR_NUM_TOWNS"), 
                            '[icon:YIELD_TOWNS]' + townCount);
                        
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
                                                Locale.compose(connectedTown.name), 
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
                                    this.addChildYieldData(townsData, Locale.compose(connectedTown.name), "");
                                }
                            }
                        }
                    }

                    // 3. 总共获得食物
                    if (totalReceivedFood > 0) {
                        this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_FOOD]' + Locale.compose("LOC_ATTR_YIELD_INCOME"), 
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
                    if (cityCount > 0) {
                        const citiesData = this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_CITIES]' + Locale.compose("LOC_ATTR_NUM_CITIES"), 
                            '[icon:YIELD_CITIES]' + cityCount);
                        
                        // 如果是专业化城镇，并且有食物产出，则添加食物输送数据
                        townFoodYield = city.Yields?.getNetYield(YieldTypes.YIELD_FOOD);
                        if (townFoodYield > 0 && city.Growth?.growthType == GrowthTypes.PROJECT) {
                            const foodPerCity = townFoodYield / cityCount;
                            
                            // 更新城市条目，添加食物输送数据
                            for (const connectedCityID of connectedCities) {
                                const connectedCity = Cities.get(connectedCityID);
                                if (connectedCity && !connectedCity.isTown) {
                                    this.addChildYieldData(citiesData, 
                                        Locale.compose(connectedCity.name), 
                                        '[icon:YIELD_FOOD]' + (-foodPerCity).toFixed(1), 
                                        {
                                            icon: "YIELD_FOOD",
                                            iconContext: "YIELD",
                                            isNegative: true
                                        });
                                }
                            }
                        } else {
                            // 未专业化或没有食物产出，只显示城市名称
                            for (const connectedCityID of connectedCities) {
                                const connectedCity = Cities.get(connectedCityID);
                                if (connectedCity &&!connectedCity.isTown) {
                                    // 默认只显示城市名称
                                    this.addChildYieldData(citiesData, Locale.compose(connectedCity.name), "");
                                }
                            }
                        }
                    }
                    // 2. 连接乡镇数据
                    if (townCount > 0) {
                        const townsData = this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_TOWNS]' + Locale.compose("LOC_ATTR_NUM_TOWNS"), 
                            '[icon:YIELD_TOWNS]' + townCount);
                        
                        // 添加具体乡镇名称
                        for (const connectedCityID of connectedCities) {
                            const connectedTown = Cities.get(connectedCityID);
                            if (connectedTown && connectedTown.isTown) {
                                this.addChildYieldData(townsData, Locale.compose(connectedTown.name), "");
                            }
                        }
                    }
                    // 3. 总共输出食物 - 只有在专业化且有食物产出时才显示
                    if (townFoodYield > 0 && city.Growth?.growthType == GrowthTypes.PROJECT) {
                        this.addChildYieldData(dataConnectivity, 
                            '[icon:YIELD_FOOD]' + Locale.compose("LOC_ATTR_YIELD_MINUS_DEDUCTIONS"), 
                            '[icon:YIELD_FOOD]' + (-townFoodYield).toFixed(1), 
                            {
                                icon: "YIELD_FOOD",
                                iconContext: "YIELD",
                                isNegative: true
                            });
                    }
                }

                // 更新连接总数
                dataConnectivity.value = String(connectedCities.length);
                dataConnectivity.valueNum = connectedCities.length;
            }

            // 3. 添加贸易路线信息（如果有）
            if (city.TradeRoutes) {
                const tradeRoutes = city.TradeRoutes.getOutgoingRoutes();
                if (tradeRoutes && tradeRoutes.length > 0) {
                    const tradeData = this.addChildYieldData(dataConnectivity, 
                        Locale.compose("LOC_UI_TRADE_ROUTES"), 
                        tradeRoutes.length, 
                        {
                            icon: "YIELD_GOLD",
                            iconContext: "YIELD"
                        });
                    
                    for (const route of tradeRoutes) {
                        const destCity = Cities.get(route.destinationID);
                        if (destCity) {
                            this.addChildYieldData(tradeData, 
                                Locale.compose("LOC_UI_TRADE_ROUTE_TO", destCity.name), 
                                "");
                        }
                    }
                }
            }
            // 推送数据到yields数组
            yields.push(dataConnectivity);
            // 【结束】城市连通性数据  ==============================================
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
            // 添加自定义数据
            this.addCustomYieldData(yields);
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
