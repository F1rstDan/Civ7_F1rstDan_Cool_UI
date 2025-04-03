/**
 * 添加自定义数据到城市横幅 addCustomDataToCityBanner
 */
export const updateCustomDataToCityBanner = (type, city) => {
    if (!type || !city) {
        return;
    }
    const dataHandlers = {
        'DAN_CITY_POPULATION': getPopulationData,
        'DAN_CITY_CONNECTIVITY': getConnectivityData,
        // 可以在这里添加更多的处理函数
    };

    let data;
    // 如果有指定类型且存在对应处理函数，则调用该函数
    if (type && dataHandlers[type]) {
        data = dataHandlers[type](city);
    }
    // 保存数据到城市对象
    setCityDanData(data, type, city);
    return data;
}

export const addCustomDataToYields = (parentData, city) => {
    if (!parentData || !city) {
        return;
    }
    // 默认添加所有数据 'ALL'

    const populationData = getPopulationData(city);
    const connectivityData = getConnectivityData(city);
    parentData.push(populationData);
    parentData.push(connectivityData);
    setCityDanData(populationData, 'DAN_CITY_POPULATION', city);
    setCityDanData(connectivityData, 'DAN_CITY_CONNECTIVITY', city);

}

export const setCityDanData = (data, type, city) => {
    if (!type ||!city) {
        return;
    }
    if (!city.danData){
        city.danData = {};
        // console.error("F1rstDan setCityDanData city.danData = {};");
    };
    city.danData[type] = data;
    // console.error(`F1rstDan setCityDanData city.${ JSON.stringify(city.id) } ADD[${type}] : ${ JSON.stringify(city.danData) }` );
    return city.danData[type];
}

export const getCityDanData = (type, city) => {
    if (!type ||!city) {
        return;
    }
    if (!city.danData){
        city.danData = {};
        console.error("F1rstDan getCityDanData null");
        return null;
    };
    return city.danData[type];
}

/**
 * 添加子数据
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
}
// 定义通用的默认值常量
const DEFAULT_DATA_OPTIONS = {
    isCustom: true,
    showIcon: true,
    isNegative: false,
    isModifier: false,
    valueType: -1
};
/**
 * 添加人口相关数据
 */
const getPopulationData = (city) => {
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
    
    // 添加 城市人口
    // const cityPopData = addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_INTERACT_CURENT_POPULATION_HEADER"), cityAllPop);

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
    // const textSpecialistMax = Locale.compose("LOC_UI_CITY_DETAILS_SPECIALIST_PER_TILE",` [B]${specialistMax}[/B][icon:CITY_SPECIAL_BASE]`);
    // 专家人口大于0显示， 是城市且放置专家上限大于0显示。（这样初期不会显示了）
    if (specialistPop > 0 || (!city.isTown && specialistMax > 0)) {
        addChildYieldData(dataPopulation, Locale.compose("LOC_UI_SPECIALISTS_SUBTITLE"), `${specialistPop} [icon:CITY_SPECIAL_BASE]`, {isNoTopBorder: true});
        addChildYieldData(dataPopulation, `${textSpecialistMax}`, "", {isFullRow: true});
        // const specialistData = addChildYieldData(dataPopulation, Locale.compose("LOC_UI_SPECIALISTS_SUBTITLE"), specialistPop + ' [icon:CITY_SPECIAL_BASE]',{setMaxIndexLevel: 2});
        // addChildYieldData(specialistData, textSpecialistMax, specialistMax);
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
    const connectedCities = city.getConnectedCities ? city.getConnectedCities() : [];
    let conectedCityCount = 0;
    if (connectedCities && connectedCities.length > 0) {
        for (const connectedCityID of connectedCities) {
            const connectedCity = Cities.get(connectedCityID);
            if (connectedCity && !connectedCity.isTown) {
                conectedCityCount++;
            }
        }
    }
    
    // X回合后出现新市民
    // 如果是城镇并且专业化，连接城市大于0，则表示输送食物不涨人口。文本红色，加上"∞"回合后。数值正常显示
    const isNotGrowing = city.isTown && city.Growth?.growthType == GrowthTypes.PROJECT && conectedCityCount > 0;
    if (isNotGrowing) {
        addChildYieldData(dataPopulation, 
            Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS","∞"), city.Growth.turnsUntilGrowth + '[icon:DAN_ICON_TURN]', 
            {isNegative: true}
        );
        // 城镇的所有[icon:YIELD_PRODUCTION]生产力转换为[icon:YIELD_GOLD]金币。城镇的所有[icon:YIELD_FOOD]食物直接送往相连的城市。
        // addChildYieldData(dataPopulation, Locale.compose("LOC_PROJECT_DEFAULT_TOOLTIP_DESCRIPTION"), "", {isFullRow: true});
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
    // const foodData = addChildYieldData(dataPopulation, '[icon:YIELD_FOOD]' + Locale.compose("LOC_UI_CITY_DETAILS_FOOD_NEEDED_TO_GROW"), requiredFood);
    // addChildYieldData(foodData, Locale.compose("LOC_UI_CITY_STATUS_CURRENT_FOOD_STOCKPILE"), '[icon:YIELD_FOOD]' + currentFood);
    addChildYieldData(dataPopulation, Locale.compose("LOC_UI_CITY_DETAILS_FOOD_NEEDED_TO_GROW"), `${requiredFood} (${requiredFoodText}%)`);
    addChildYieldData(dataPopulation, '• ' + Locale.compose("LOC_UI_CITY_STATUS_CURRENT_FOOD_STOCKPILE"), `${currentFood}[icon:YIELD_FOOD]`, {isNoTopBorder: true});
    addChildYieldData(dataPopulation, '• ' + Locale.compose("LOC_UI_CITY_DETAILS_FOOD_PER_TURN"), `${yieldFoodText}[icon:YIELD_FOOD]`, {isNegative: isNotGrowing, isNoTopBorder: true});

    return dataPopulation;
    // 【结束】添加人口相关数据  ==============================================
}

/**
 * 添加城市连通性数据
 */
const getConnectivityData = (city) => {
    const typeName = 'DAN_CITY_CONNECTIVITY';
    
    // （人口数）城市名称
    const formatCityName = (city) => {
        // 检查是否为首都
        const isCapital = city.isCapital || false;
        // 如果是首都，添加星号标记
        return `(${city.population})${isCapital ? '★' : ''}${Locale.compose(city.name)}`;
    };
    
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

    let textShowValue = String(connectedCitiesCount);
    // 不在贸易网络中 🛇
    const isNotInTradeNetwork = !city.Trade?.isInTradeNetwork();
    if (isNotInTradeNetwork && connectedCitiesCount == 0) {
        // textShowValue = `[STYLE:text-gradient-negative]-[/STYLE]`;
        textShowValue = `-`;
        // textShowValue = "🛇";
    }
    
    // 【城市连通性数据】 ==============================================
    const dataConnectivity = {
        ...DEFAULT_DATA_OPTIONS,
        type: typeName,
        label: Locale.toUpper(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CONNECTED_1_TITLE")),
        value: textShowValue,
        valueNum: connectedCitiesCount,
        icon: `url("fs://game/f1rstdans_cool_ui/textures/${typeName}.png")`,
        childData: [],
    };

    // 获取城市连接信息
    if (connectedCities && connectedCities.length > 0) {
        if (!city.isTown) {
            // 城市数据结构
            // 1. 连接城市数据
            if (conectedCityCount > 0) {
                const citiesData = addChildYieldData(dataConnectivity, 
                    '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_CITIES") + '[/B]', 
                    '[icon:YIELD_CITIES]' + conectedCityCount);
                
                // 添加具体城市名称
                for (const connectedCityID of connectedCities) {
                    const connectedCity = Cities.get(connectedCityID);
                    if (connectedCity && !connectedCity.isTown) {
                        addChildYieldData(citiesData, formatCityName(connectedCity), "");
                    }
                }
            }

            // 2. 连接乡镇数据
            let totalReceivedFood = 0;
            let totalReceivedTownCount = 0;
            if (conectedTownCount > 0) {
                const townsData = addChildYieldData(dataConnectivity, 
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
                                    totalReceivedTownCount += 1;
                                    addChildYieldData(townsData, 
                                        formatCityName(connectedTown), 
                                        `+${foodForCity.toFixed(1)}[icon:YIELD_FOOD]`, 
                                        {
                                            // valueType: 1,
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
            }

            // 3. 总共获得食物
            if (totalReceivedFood > 0 && totalReceivedTownCount > 1) {
                addChildYieldData(dataConnectivity, 
                    '[icon:YIELD_FOOD]' + Locale.compose("LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME"), 
                    `+${totalReceivedFood.toFixed(1)}[icon:YIELD_FOOD]`, 
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
                const citiesData = addChildYieldData(dataConnectivity, 
                    '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_CITIES") + '[/B]', 
                    '[icon:YIELD_CITIES]' + conectedCityCount);
                
                // 如果是专业化城镇，并且有食物产出，则添加食物输送数据
                townFoodYield = city.Yields?.getNetYield(YieldTypes.YIELD_FOOD);
                const isSpecializedTown = townFoodYield > 0 && city.Growth?.growthType == GrowthTypes.PROJECT;
                const foodPerCity = isSpecializedTown ? townFoodYield / conectedCityCount : 0;
                // TODO 还没用过 const foodForEachCity = town.getSentFoodPerCity();
                
                // 添加具体城市名称和食物数据
                for (const connectedCityID of connectedCities) {
                    const connectedCity = Cities.get(connectedCityID);
                    if (connectedCity && !connectedCity.isTown) {
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
            }
            // 2. 连接乡镇数据
            if (conectedTownCount > 0) {
                const townsData = addChildYieldData(dataConnectivity, 
                    '[B]' + Locale.compose("LOC_UI_SETTLEMENT_TAB_BAR_TOWNS") + '[/B]', 
                    '[icon:YIELD_TOWNS]' + conectedTownCount);
                
                // 添加具体乡镇名称
                for (const connectedCityID of connectedCities) {
                    const connectedTown = Cities.get(connectedCityID);
                    if (connectedTown && connectedTown.isTown) {
                        addChildYieldData(townsData, formatCityName(connectedTown), "");
                    }
                }
            }
            // 3. 总共输出食物 - 只有在专业化且有食物产出时才显示
            // 没必要显示，有些冗余，因为必然是食物产量
            if (townFoodYield > 0 && conectedCityCount > 1 && city.Growth?.growthType == GrowthTypes.PROJECT) {
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
    if (city.Trade && city.Trade.isInTradeNetwork() == false) {
        addChildYieldData(dataConnectivity, Locale.compose("LOC_UI_RESOURCE_ALLOCATION_SETTLEMENT_DISCONNECTED"), "", {isFullRow: true, isNegative: true});
        // console.error("F1rstDan CityYield isInTradeNetwork");
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