/**
 * @file dan-city-custom-data.js
 * @description 城市数据处理层 (DPL)
 * 负责处理城市人口、连通性、产量等数据的获取、计算和缓存。
 * 遵循分层架构设计原则。
 */

import CityYields from '/base-standard/ui/utilities/utilities-city-yields.js';

// ==========================================
// 1. 数据处理层 (Data Processing Layer, DPL)
// ==========================================

// 定义通用的默认值常量
const DEFAULT_DATA_OPTIONS = {
    isCustom: true,
    showIcon: true,
    isNegative: false,
    isModifier: false,
    valueType: -1
};

/**
 * 添加子数据辅助函数
 * @param {Object} parentData - 父产量数据
 * @param {string} label - 子数据描述标签
 * @param {number|string} value - 子数据数值
 * @param {Object} additionalData - 额外数据
 * @returns {Object} - 创建的子数据对象
 */
const addChildYieldData = (parentData, label, value, additionalData = {}) => {
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
};

// 固定图标地址只在模块加载时构造一次，不包含本地化调用。
const CONNECTIVITY_ICON_URL = 'url("fs://game/f1rstdans_cool_ui/textures/DAN_CITY_CONNECTIVITY.png")';

let connectivityLabelCache = null;

/**
 * 延迟获取连通性标题，避免在 Locale 尚未就绪时提前求值。
 * @returns {string} 本地化并转为大写的标题
 */
const getConnectivityLabel = () => {
    if (connectivityLabelCache === null) {
        connectivityLabelCache = Locale.toUpper(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CONNECTED_1_TITLE"));
    }
    return connectivityLabelCache;
};

/**
 * 解析连接定居点，保持原始顺序并过滤无效结果。
 * 每个连接 ID 只调用一次 Cities.get。
 * @param {Object} city 城市对象
 * @returns {Array<Object>} 连接定居点对象数组
 */
const getConnectedSettlements = (city) => {
    const connectedCityIDs = city?.getConnectedCities?.() ?? [];
    const settlements = [];
    for (const connectedCityID of connectedCityIDs) {
        const settlement = Cities.get(connectedCityID);
        if (settlement) {
            settlements.push(settlement);
        }
    }
    return settlements;
};

/**
 * 统计连接城市数量，不分配临时过滤数组。
 * @param {Object} city 需要统计的城市对象
 * @returns {number} 非乡镇连接定居点数量
 */
const countConnectedCities = (city) => {
    let count = 0;
    for (const settlement of getConnectedSettlements(city)) {
        if (!settlement.isTown) {
            count++;
        }
    }
    return count;
};

/**
 * 格式化连接定居点名称。
 * @param {Object} city 连接定居点
 * @returns {string} （人口数）城市名称
 */
const formatCityName = (city) => {
    const isCapital = city.isCapital || false;
    return `(${city.population})${isCapital ? '★' : ''}${Locale.compose(city.name)}`;
};

export const DanCityData = {
    // ==========================================
    // 数据获取接口
    // ==========================================

    /**
     * 获取数据
     * @param {string} type 数据类型
     * @param {Object} city 城市对象
     * @param {boolean} includeDetails 是否包含详细子数据（默认为 false）
     * @returns {Object|null} 格式化后的数据对象
     */
    getData(type, city, includeDetails = false) {
        if (!type || !city) return null;
        return this._calculateData(type, city, includeDetails);
    },

    /**
     * 获取指定类型的完整产量明细（由 Tooltip 在打开时调用）
     * @param {string} type 数据类型
     * @param {Object} city 城市对象
     * @returns {Object|null} 指定类型的完整明细
     */
    getYieldDetails(type, city) {
        if (!type || !city) return null;
        if (type === 'DAN_CITY_POPULATION' || type === 'DAN_CITY_CONNECTIVITY') {
            return this.getData(type, city, true);
        }

        const details = this._calculateStandardYieldDetails(city);
        return details.find(data => data.type === type) || null;
    },

    /**
     * 内部计算数据方法
     */
    _calculateData(type, city, includeDetails = false) {
        let data = null;
        switch (type) {
            case 'DAN_CITY_POPULATION':
                data = this.getPopulationData(city, includeDetails);
                break;
            case 'DAN_CITY_CONNECTIVITY':
                data = this.getConnectivityData(city, includeDetails);
                break;
            case 'YIELDS_SUMMARY':
                data = this._calculateYieldsSummary(city);
                break;
            case 'YIELDS_DETAILS':
                data = this._calculateYieldsDetails(city, includeDetails);
                break;
        }
        return data;
    },

    /**
     * 计算产量栏摘要（仅包含顶层产量，不构造明细树）
     */
    _calculateYieldsSummary(city) {
        const yields = [];
        try {
            const cityYields = city?.Yields?.getYields?.();
            if (cityYields) {
                for (const [index, attribute] of cityYields.entries()) {
                    const yieldInfo = GameInfo.Yields[index];
                    if (!yieldInfo) continue;

                    const rawValue = attribute?.value ?? 0;
                    yields.push({
                        type: yieldInfo.YieldType,
                        label: yieldInfo.Name ? Locale.compose(yieldInfo.Name) : '',
                        value: Locale.toNumber(rawValue, "0.0"),
                        valueNum: rawValue,
                        valueType: attribute?.type ?? -1,
                        showIcon: true,
                        isNegative: rawValue < 0,
                        isModifier: false,
                        childData: [],
                        isSummary: true
                    });
                }
            }
        } catch (e) {
            console.error("DanCityData: Error getting city yields summary", e);
        }

        const populationData = this.getData('DAN_CITY_POPULATION', city, false);
        const connectivityData = this.getData('DAN_CITY_CONNECTIVITY', city, false);
        if (populationData) yields.push(populationData);
        if (connectivityData) yields.push(connectivityData);

        return yields;
    },

    /**
     * 计算标准城市产量明细（不包含自定义人口和连通性数据）
     */
    _calculateStandardYieldDetails(city) {
        let yields = [];
        try {
            if (city && city.id) {
                yields = CityYields.getCityYieldDetails(city.id);
            }
        } catch (e) {
            console.error("DanCityData: Error getting city yields details", e);
        }

        if (!yields) yields = [];

        return yields;
    },

    /**
     * 计算完整的城市产量数据（包含标准产量 + 自定义数据）
     */
    _calculateYieldsDetails(city, includeDetails = false) {
        const yields = this._calculateStandardYieldDetails(city);

        // 明细路径只解析一次连接定居点，人口和连通性数据共享结果。
        const settlements = includeDetails ? getConnectedSettlements(city) : null;
        const populationData = this.getPopulationData(city, includeDetails, settlements);
        const connectivityData = this.getConnectivityData(city, includeDetails, settlements);
        if (populationData) yields.push(populationData);
        if (connectivityData) yields.push(connectivityData);
        
        return yields;
    },

    /**
     * 获取人口数据
     */
    getPopulationData(city, includeDetails = false, settlements = null) {
        const typeName = 'DAN_CITY_POPULATION';
        
    // 【添加人口相关数据】 ==============================================
        const cityAllPop = city.population;
        const dataPopulation = {
            ...DEFAULT_DATA_OPTIONS,
            setMaxIndexLevel: 1,        // 用于控制子数据的数量
            // setLabelColumnWidth: 70, // 用于控制标签列的宽度
            type: typeName,
            label: Locale.toUpper(Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER")),
            value: String(cityAllPop),
            valueNum: Number(cityAllPop),
            icon: `url("fs://game/f1rstdan-cool-ui/textures/${typeName}.png")`,
            childData: [],
        };
        
        if (!includeDetails) {
            dataPopulation.isSummary = true;
            return dataPopulation;
        }

        const pendingPop = city.pendingPopulation;              // 待放置人口
        const ruralPop = city.ruralPopulation - pendingPop;     // 乡村人口
        const urbanPop = city.urbanPopulation;                  // 市区人口
        const specialistPop = city.Workers.getNumWorkers(false);  // 专家人口
        const migrantPop = cityAllPop - pendingPop - ruralPop - urbanPop - specialistPop;    // 移民人口
        
        addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_STATUS_RURAL_POPULATION"), ` ${ruralPop} [icon:CITY_RURAL]`, {isNoTopBorder: true});
        addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_STATUS_URBAN_POPULATION"), ` ${urbanPop} [icon:CITY_URBAN]`, {isNoTopBorder: true});
        
        // 专家人口 `（每个地块最多{1_SpecialistMax}名）`"LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE"
        const specialistMax = city.Workers.getCityWorkerCap();
        const textSpecialistMax = Locale.compose("LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE",` [B]${specialistMax}[/B] [icon:CITY_SPECIAL_BASE]`);
        // 专家人口大于0显示， 是城市且放置专家上限大于0显示。（这样初期不会显示了）
        if (specialistPop > 0 || (!city.isTown && specialistMax > 0)) {
            addChildYieldData(dataPopulation, Locale.compose("LOC_UI_SPECIALISTS_SUBTITLE"), `${specialistPop} [icon:CITY_SPECIAL_BASE]`, {isNoTopBorder: true});
            addChildYieldData(dataPopulation, `${textSpecialistMax}`, "", {isFullRow: true});
        }
        
        // 待放置人口，如果大于0才显示
        if (pendingPop > 0) {
            addChildYieldData(dataPopulation, Locale.compose("LOC_RESOURCE_UNASSIGNED"), pendingPop + ' [icon:CITY_CENTERPIN]', {isNoTopBorder: true});
        }
        // 移民，如果大于0才显示
        if (migrantPop > 0) {
            addChildYieldData(dataPopulation, Locale.compose("LOC_UNIT_MIGRANT_NAME"), migrantPop + ' [icon:UNIT_MIGRANT]', {isNoTopBorder: true});
        }

        // 获取连接城市数量，用于判断专业化乡镇
        const connectedSettlements = settlements ?? getConnectedSettlements(city);
        let connectedCityCount = 0;
        for (const settlement of connectedSettlements) {
            if (!settlement.isTown) {
                connectedCityCount++;
            }
        }
        
        // X回合后出现新市民
        // 如果是城镇并且专业化，连接城市大于0，则表示输送食物不涨人口。文本红色，加上"∞"回合后。数值正常显示
        const isNotGrowing = city.isTown && city.Growth?.growthType == GrowthTypes.PROJECT && connectedCityCount > 0;
        if (isNotGrowing) {
            addChildYieldData(dataPopulation, 
                Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS","∞"), city.Growth.turnsUntilGrowth + '[icon:DAN_ICON_TURN]', 
                {isNegative: true}
            );
        } else {
            // 正常情况下显示回合数
            addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS",city.Growth.turnsUntilGrowth), city.Growth.turnsUntilGrowth + '[icon:DAN_ICON_TURN]');
        }
        
        // 所需粮食数据
        const requiredFood = city.Growth.getNextGrowthFoodThreshold().value.toFixed(0);
        const currentFood = city.Growth.currentFood.toFixed(0);
        const requiredFoodText = (currentFood / requiredFood *100 ).toFixed(0);
        const yieldFood = city.Yields?.getNetYield(YieldTypes.YIELD_FOOD).toFixed(1);
        // 根据城市生长状态和食物产量计算显示文本
        // const yieldFoodText，如果 isNotGrowing 为真，yieldFoodText = “0”。如果 yieldFood 大于 0 ，前面加个 + 符号。
        const yieldFoodText = isNotGrowing ? "0" : (yieldFood > 0 ? `+${yieldFood}` : yieldFood);

        addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_DETAILS_FOOD_NEEDED_TO_GROW"), `${requiredFood} (${requiredFoodText}%)`);
        addChildYieldData(dataPopulation, '• ' + Locale.compose("LOC_UI_CITY_STATUS_CURRENT_FOOD_STOCKPILE"), `${currentFood}[icon:YIELD_FOOD]`, {isNoTopBorder: true});
        addChildYieldData(dataPopulation, '• ' + Locale.compose("LOC_UI_CITY_DETAILS_FOOD_PER_TURN"), `${yieldFoodText}[icon:YIELD_FOOD]`, {isNegative: isNotGrowing, isNoTopBorder: true});

        return dataPopulation;
        // 【结束】添加人口相关数据  ==============================================
    },

    /**
     * 获取城市连通性数据
     */
    getConnectivityData(city, includeDetails = false, settlements = null) {
        const typeName = 'DAN_CITY_CONNECTIVITY';

        const connectedSettlements = settlements ?? getConnectedSettlements(city);
        const connectedCitySettlements = [];
        const connectedTownSettlements = [];
        for (const settlement of connectedSettlements) {
            if (settlement.isTown) {
                connectedTownSettlements.push(settlement);
            } else {
                connectedCitySettlements.push(settlement);
            }
        }
        const connectedCityCount = connectedCitySettlements.length;
        const connectedTownCount = connectedTownSettlements.length;
        const connectedCitiesCount = connectedCityCount + connectedTownCount;

        let textShowValue = String(connectedCitiesCount);
        // 不在贸易网络中 🛇
        const isInTradeNetwork = city.Trade?.isInTradeNetwork();
        const isNotInTradeNetwork = !isInTradeNetwork;
        if (isNotInTradeNetwork && connectedCitiesCount == 0) {
            textShowValue = `-`;
        }
        
        // 【城市连通性数据】 ==============================================
        const dataConnectivity = {
            ...DEFAULT_DATA_OPTIONS,
            type: typeName,
            label: getConnectivityLabel(),
            value: textShowValue,
            valueNum: connectedCitiesCount,
            icon: CONNECTIVITY_ICON_URL,
            childData: [],
        };

        if (!includeDetails) {
            dataConnectivity.isSummary = true;
            return dataConnectivity;
        }

        if (connectedSettlements.length > 0) {
            if (!city.isTown) {
                // 城市数据结构
                // 1. 连接城市数据
                if (connectedCityCount > 0) {
                    const citiesData = addChildYieldData(dataConnectivity, 
                        '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_CITIES") + '[/B]', 
                        '[icon:YIELD_CITIES]' + connectedCityCount);
                    
                    // 添加具体城市名称
                    for (const connectedCity of connectedCitySettlements) {
                        addChildYieldData(citiesData, formatCityName(connectedCity), "");
                    }
                }

                // 2. 连接乡镇数据
                let totalReceivedFood = 0;
                let totalReceivedTownCount = 0;
                if (connectedTownCount > 0) {
                    const townsData = addChildYieldData(dataConnectivity, 
                        '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_TOWNS") + '[/B]', 
                        '[icon:YIELD_TOWNS]' + connectedTownCount);
                    
                    // 添加具体乡镇名称和食物数据
                    for (const connectedTown of connectedTownSettlements) {
                        // 检查乡镇是否已专业化
                        if (connectedTown.Growth?.growthType == GrowthTypes.PROJECT) {
                            const townFoodYield = connectedTown.Yields?.getNetYield(YieldTypes.YIELD_FOOD);
                            if (townFoodYield) {
                                const townConnectedCityCount = countConnectedCities(connectedTown);

                                if (townConnectedCityCount > 0) {
                                    const foodForCity = townFoodYield / townConnectedCityCount;
                                    totalReceivedFood += foodForCity;
                                    totalReceivedTownCount += 1;
                                    addChildYieldData(townsData,
                                        formatCityName(connectedTown),
                                        `+${foodForCity.toFixed(1)}[icon:YIELD_FOOD]`,
                                        {
                                            icon: "YIELD_FOOD",
                                            iconContext: "YIELD"
                                        });
                                }
                            }
                        } else {
                            // 乡镇未专业化，只显示名称
                            addChildYieldData(townsData, formatCityName(connectedTown), "");
                        }
                    }
                }

                if (totalReceivedFood > 0 && totalReceivedTownCount > 1) {
                    addChildYieldData(dataConnectivity, 
                        '[icon:YIELD_FOOD]' + Locale.compose("LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME"), 
                        `+${totalReceivedFood.toFixed(1)}[icon:YIELD_FOOD]`, 
                        {
                            icon: "YIELD_FOOD",
                            iconContext: "YIELD"
                        });
                }
            } else {
                // 乡镇数据结构
                // 1. 连接城市数据
                let townFoodYield;
                if (connectedCityCount > 0) {
                    const citiesData = addChildYieldData(dataConnectivity, 
                        '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_CITIES") + '[/B]', 
                        '[icon:YIELD_CITIES]' + connectedCityCount);
                    
                    // 如果是专业化城镇，并且有食物产出，则添加食物输送数据
                    townFoodYield = city.Yields?.getNetYield(YieldTypes.YIELD_FOOD);
                    const isSpecializedTown = townFoodYield > 0 && city.Growth?.growthType == GrowthTypes.PROJECT;
                    const foodPerCity = isSpecializedTown ? townFoodYield / connectedCityCount : 0;
                    // TODO 还没用过 const foodForEachCity = town.getSentFoodPerCity();
                    
                    // 添加具体城市名称和食物数据
                    for (const connectedCity of connectedCitySettlements) {
                        if (isSpecializedTown) {
                            // 专业化城镇显示食物输送数据
                            addChildYieldData(citiesData,
                                formatCityName(connectedCity),
                                `[STYLE:text-gradient-negative]${(-foodPerCity).toFixed(1)}[/STYLE][icon:YIELD_FOOD]`,
                                {
                                    icon: "YIELD_FOOD",
                                    iconContext: "YIELD",
                                    isNegative: false,
                                });
                        } else {
                            // 默认只显示城市名称
                            addChildYieldData(citiesData, formatCityName(connectedCity), "");
                        }
                    }
                }
                // 2. 连接乡镇数据
                if (connectedTownCount > 0) {
                    const townsData = addChildYieldData(dataConnectivity, 
                        '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_TOWNS") + '[/B]', 
                        '[icon:YIELD_TOWNS]' + connectedTownCount);
                    
                    // 添加具体乡镇名称
                    for (const connectedTown of connectedTownSettlements) {
                        addChildYieldData(townsData, formatCityName(connectedTown), "");
                    }
                }
                // 3. 总共输出食物 - 只有在专业化且有食物产出时才显示
                // 没必要显示，有些冗余，因为必然是食物产量
                if (townFoodYield > 0 && connectedCityCount > 1 && city.Growth?.growthType == GrowthTypes.PROJECT) {
                    addChildYieldData(dataConnectivity, 
                        '[icon:YIELD_FOOD]' + Locale.compose("LOC_ATTR_YIELD_MINUS_DEDUCTIONS"), 
                        (-townFoodYield).toFixed(1) + '[icon:YIELD_FOOD]', 
                        {
                            icon: "YIELD_FOOD",
                            iconContext: "YIELD",
                            isNegative: true
                        });
                }
            }
        }

        // 3. 添加贸易路线信息（如果有）
        // 定居点未连接到帝国的贸易网络。
        if (city.Trade && isInTradeNetwork == false) {
            addChildYieldData(dataConnectivity, Locale.compose("LOC_UI_RESOURCE_ALLOCATION_SETTLEMENT_DISCONNECTED"), "", {isFullRow: true, isNegative: true});
        }
        // TODO: 增加贸易信息
        // <Replace Tag="LOC_PEDIA_CONCEPTS_PAGE_DIPLO_4_TITLE" Language="zh_Hans_CN">
        //   <Text>贸易范围</Text>
        // <Replace Tag="LOC_REWARD_TRADE_ROUTE_RANGE_LAND" Language="zh_Hans_CN">
        //   <Text>+{1_Value}陆地贸易路线范围</Text>
        // </Replace>
        // <Replace Tag="LOC_REWARD_TRADE_ROUTE_RANGE_SEA" Language="zh_Hans_CN">
        //   <Text>+{1_Value}海洋贸易路线范围</Text>
        // const tradeRoute = TradeRoutesModel.getTradeRoute(Number.parseInt(this.tradeRouteIndex));
        
        return dataConnectivity;
        // 【结束】城市连通性数据  ==============================================
    }
};

// 初始化缓存清理
// DanCityData.init();

export const updateCustomDataToCityBanner = (type, city) => DanCityData.getData(type, city);
