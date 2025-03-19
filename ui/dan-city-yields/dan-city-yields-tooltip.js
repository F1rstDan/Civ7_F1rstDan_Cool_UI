/**
 * target 数据结构
 * .type .label .value .isNegative 
 * yieldData{}
 * 
 */
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
// import CityYieldsEngine from '/base-standard/ui/utilities/utilities-city-yields.js';
import CityDetails from "/base-standard/ui/city-details/model-city-details.js";
const styleElement = document.createElement('style');
styleElement.innerHTML = `
    .dan-city-yields-tooltip .tooltip__content {
        border: 0.1rem solid #82705588;
        border-radius: 1.2rem 0.16rem;
        background-image: linear-gradient(180deg, rgb(7, 8, 8, 0.95) 0%, rgb(19, 21, 31, 0.9) 100%);
        padding-left: 0.6666666667rem;
        padding-right: 0.6666666667rem;
        width: auto;
    }
    .text-yield-food {
        color: #9fce7b;
    }
    .text-yield-production {
        color: #ce8f81;
    }
`;
document.head.appendChild(styleElement);
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
class DanCityYieldsTooltipType {
    constructor() {
        this.target = null;  // 当前提示框关联的目标元素
        
        // DOM初始化 --------------------------------------------------
        this.tooltip = document.createElement('fxs-tooltip');
        this.container = document.createElement('div');
        this.description = document.createElement('p');
        this.header = document.createElement('div');
        // 设置tooltip样式
        this.tooltip.classList.add('dan-city-yields-tooltip');
        this.container.className = 'flex flex-col min-w-96 font-body text-md text-accent-2';    // bg-black p-4 w-96

        // 创建标题组件
        this.yieldTitle = document.createElement("div");
        this.yieldTitle.style.setProperty('text-align', 'center');
        this.yieldTitle.className = 'text-secondary font-title-lg uppercase text-center tracking-100 flex flex-auto justify-center items-center'; 
        
        // 创建分隔线
        this.divider = document.createElement("div");
        this.divider.classList.add("main-menu-filigree-divider", "h-4", "mt-1", "min-w-60", "bg-center", "bg-contain", "bg-no-repeat", "self-center");
        this.divider.style.setProperty("background-image", `url("fs://game/shell_simple-div.png")`);

        // 组装DOM结构
        this.header.append(this.yieldTitle, this.divider);
        this.container.append(this.header, this.description);
        this.tooltip.appendChild(this.container);
    }

    getHTML() {
        return this.tooltip;
    }

    reset() {
        // 只清空内容，不移除节点
        this.yieldTitle.innerHTML = '';
        this.yieldTitle.style.setProperty('text-align', 'center');
        this.yieldTitle.className = 'text-secondary font-title-lg uppercase text-center tracking-100 flex flex-auto justify-center items-center'; 
        this.description.innerHTML = '';
    }

    isUpdateNeeded(target) {
        // 检查target是否发生变化
        if (this.target !== target) {
            this.target = target;
            return true;
        }
        return false;
    }

    // 构建tooltip内容
    buildYieldTooltipContent(yieldData) {
        if (!yieldData) return '';
        //debug
        // console.error("F1rstDan debug yieldData[" + yieldData.label + `] : ${JSON.stringify(yieldData)}`);

        const tooltipContent = document.createElement("div");
        
        // 递归处理子数据
        const tooltipDetailContent = document.createElement("div");
        if (yieldData.childData && yieldData.childData.length > 0) {
            // debug
            //console.error("F1rstDan debug yieldData[" + yieldData.childData.label + `] : ${JSON.stringify(yieldData.childData)}`);
            this.tooltipAppendData(tooltipDetailContent, yieldData.childData, 1);
        }
        tooltipContent.appendChild(tooltipDetailContent);
        tooltipContent.innerHTML = Locale.stylize(tooltipContent.innerHTML);
        //debug
        // console.error("F1rstDan debug innerHTML:" + tooltipContent.innerHTML);
        return tooltipContent.innerHTML;
    }
    // 为tooltip内容 进行递归处理子数据
    tooltipAppendData(tooltipContent, childData, indexLevel, exData = {}) {
        const maxIndexLevel = 2;   // 设置最大递归层级
        
        // 创建表格容器
        const tableContainer = document.createElement("div");
        tableContainer.style.setProperty("width", "auto");
        if (indexLevel === 1) {
            tableContainer.style.setProperty("margin-left", "0.4rem");
            tableContainer.style.setProperty("margin-right", "0.4rem");
        }

        // 创建表格
        const table = document.createElement("div");
        table.style.setProperty("width", "100%");

        // 数值列总宽度50%
        const dataColumnWidth = (50 / maxIndexLevel) + "%";  // 平分50%宽度
        const labelColumnWidth = "50%";  // 标签列占50%
        
        for (const child of childData) {
            if (child.valueType >= 5) continue; // 如果 child.valueType 大于等于 5，则跳过当前循环

            // 负数使下级数值翻转正负。如果是 "label": "减去扣除"
            // 使用 exData 传递给下级，层层传递
            let isNegativeChildren = exData && exData.isNegativeChildren ? exData.isNegativeChildren : false;
            if (child.label == Locale.compose("LOC_ATTR_YIELD_MINUS_DEDUCTIONS")) {
                isNegativeChildren = true;
            }

            let expandMore = false; // 展开更多有用信息，代替它的层级。
            if (!expandMore) { expandMore = child.label == Locale.compose("LOC_ATTR_SOURCES"); }                // 如果 "label": "来源",则展开详情（自己消失，代替层级）
            if (!expandMore) { expandMore = child.label == Locale.compose("LOC_ATTR_HAPPINESS_DEDUCTION"); }    // 如果 "label": "快乐值减益",则展开详情（自己消失，代替层级）
            // 检查是否为"收入"标签，且父级只有这一个子数据。是则展开详情（自己消失，代替层级）
            if (!expandMore) { expandMore = child.label === Locale.compose("LOC_ATTR_YIELD_INCOME") && childData.length === 1; }
            if (expandMore && child.childData && child.childData.length > 0) {
                this.tooltipAppendData(tooltipContent, child.childData, indexLevel, {isNegativeChildren: isNegativeChildren});
                continue;
            }

            // 创建行，使用 span
            const row = document.createElement("div");
            row.style.setProperty("display", "flex");
            // row.style.setProperty("flex-direction", "column");
            row.style.setProperty("flex-direction", "row");
            row.style.setProperty("flex-wrap", "nowrap");

            // 根据层级创建单元格
            for(let i = 0; i < maxIndexLevel + 1; i++) {
                const cell = document.createElement("span");
                cell.style.setProperty("min-height", "1.4rem");
                cell.style.setProperty("padding-left", "0.4rem");
                cell.style.setProperty("display", "flex");
                cell.style.setProperty("flex-direction", "row");
                cell.style.setProperty("flex-wrap", "nowrap");
                
                // 设置单元格宽度
                if(i === maxIndexLevel) {
                    cell.style.setProperty("width", labelColumnWidth);
                } else {
                    cell.style.setProperty("width", dataColumnWidth);
                }

                // 设置边框，竖线：除最后一列外都显示右边框
                if(i < maxIndexLevel) {
                    cell.style.setProperty("border-right", "0.06rem solid #877b6544");
                }
                
                // 横线：根据规则显示上边框
                // - 第一行的横线不显示
                // - 第1列的有数值 (indexLevel=1) ，显示上面的横线
                // - 递归2层及以上的 (indexLevel>1) ，横线都不显示
                const isFirstRow = table.childElementCount === 0;
                const showTopBorder = !isFirstRow && indexLevel == 1;  //有点bug，下面修
                if(showTopBorder) {
                    cell.style.setProperty("border-top", "0.06rem solid #877b6544");
                }
                // 莫名的bug，有isModifier加成的会被判断是第一行，从而不显示横线
                if(child.isModifier && indexLevel === 1) {
                    cell.style.setProperty("border-top", "0.06rem solid #877b6544");
                }

                let isNegative = child.isNegative;
                // 如果在"减去扣除"下级，数值正负翻转
                if(exData && exData.isNegativeChildren) {
                    isNegative = !child.isNegative;
                }

                // 如果是加成，加粗显示。正面黄色，负面红色
                if(child.isModifier) cell.classList.add('font-bold');
                if(child.isModifier && !isNegative) {
                    cell.classList.add('text-gradient-secondary');
                } else if(isNegative){
                    cell.classList.add('text-gradient-negative');
                }
                
                // 单元格内容
                if(i === maxIndexLevel) {  // 标签列
                    let displayLabel ='';
                    if (indexLevel == 2) {
                        displayLabel = '• ';
                    } 
                    // 修复本地化缺失：幸福感赤字
                    if (child.label == "LOC_ATTR_CLAMPED_HAPPINESS_DEFICIT") {
                        displayLabel += Locale.compose("LOC_ATTR_HAPPINESS_DEFICIT");
                    } else {
                        displayLabel += Locale.compose(child.label);
                    }

                    cell.style.setProperty("border-left", "0.06rem solid #877b6588");
                    cell.innerHTML = Locale.stylize(displayLabel);
                }
                else if(i === indexLevel - 1) {  // 数值列
                    cell.classList.add('justify-end');  // 数值列右对齐
                    // cell.style.setProperty("white-space", "nowrap");    // 添加文字不换行的样式
                    cell.style.setProperty("padding-right", "0.4rem");
                    cell.style.setProperty("padding-left", "0rem");
                    let displayValue = '';
                    if (child.value) {
                        if (child.valueType == -1) {
                            displayValue = child.value;
                        } else if (exData && exData.isNegativeChildren)  {
                            if (child.isNegative == false) {
                                displayValue = `-${child.value}`;
                            } else {
                                // 检查值是否已经有负号，如果有则去掉，然后添加加号
                                let valueStr = String(child.value);
                                if (valueStr.startsWith('-')) {
                                    valueStr = valueStr.substring(1); // 去掉负号
                                }
                                displayValue = `+${valueStr}`;
                            }
                        } else {
                            displayValue = isNegative ? child.value : `+${child.value}`;
                        }
                    }
                    cell.innerHTML = Locale.stylize(displayValue);
                    // 如果是第1列的数值，加粗显示
                    if(indexLevel == 1) {
                        cell.classList.add('font-bold');
                    }
                }
                else {  // 空单元格
                    cell.innerHTML = Locale.stylize("&nbsp;");
                }
                
                row.appendChild(cell);
            }

            table.appendChild(row);
            // 隐藏繁杂无效的信息。如果是 "label": "来自改良设施"，则不展开更多详情
            const improvementLocale = Locale.compose("LOC_ATTR_IMPROVEMENT_YIELDS");
            if (child.label == improvementLocale) continue;

            // 递归处理子数据，默认最多递归2级。maxIndexLevel可设置
            if (child.childData && child.childData.length > 0 && indexLevel < maxIndexLevel) {
                this.tooltipAppendData(table, child.childData, indexLevel + 1, {isNegativeChildren: isNegativeChildren});
            }
        }

        tableContainer.appendChild(table);
        tooltipContent.appendChild(tableContainer);
    }

    /**
     * 将CityDetails.yields数据结构转换为CityYieldsEngine数据结构
     * @param {Object} modelYield - 来自model-city-details.js的产量数据
     * @returns {Object} - 转换后符合utilities-city-yields.js格式的数据
     */
    convertYieldDataFormat(modelYield) {
        if (!modelYield) return null;
        // 创建新对象而不是修改原对象
        const convertedYield = {
            label: modelYield.name,
            value: typeof modelYield.value === 'number' ? Locale.toNumber(modelYield.value, '0.0') : modelYield.value,
            valueNum: modelYield.value,
            valueType: 1, // 默认值，可能需要根据实际情况调整
            type: modelYield.icon,
            showIcon: false,
            isNegative: typeof modelYield.value === 'number' ? modelYield.value < 0 : false,
            isModifier: false,
            childData: []
        };
        // 递归处理子数据
        if (modelYield.children && modelYield.children.length > 0) {
            convertedYield.childData = modelYield.children
                .map(child => this.convertYieldDataFormat(child))
                .filter(child => child !== null); // 过滤掉空的子数据
        }
        return convertedYield;
    }

    update() {
        if (!this.target) return;

        this.reset();

        // 获取yieldData数据
        const yieldData = this.target.yieldData;
        if (!yieldData) return;

        // 设置标题和内容
        let value;
        if (this.target.value) {
            if (yieldData.valueType == -1) {
                value = this.target.value;
            } else {
                value = !yieldData.isNegative ? `+${this.target.value}` : this.target.value;
            }
        }
        // 确保label存在
        const label = this.target.label || Locale.toUpper(Locale.compose('LOC_LEADER_UNKNOWN_NAME'));
        this.yieldTitle.innerHTML = Locale.stylize(`${value} ${label}`);
        this.yieldTitle.classList.add( yieldTypeTextClassMap[this.target.type], );

        // 如果子数据为空 且产量不为0 且不是自定义数据，则去城市详细面板借数据显示
        if (yieldData.childData.length === 0 && yieldData.valueNum !== 0 && !yieldData.isCustom) {
            const modelYields = CityDetails.yields;
            let convertedYields = null;
            if (modelYields) {
                for (const yieldItem of modelYields) {
                    if (yieldItem.icon === this.target.type) {
                        convertedYields = this.convertYieldDataFormat(yieldItem);
                        break;
                    }
                }
            }
            this.description.innerHTML = this.buildYieldTooltipContent(convertedYields);
            // console.error("F1rstDan yieldData[" + label + `] : ${JSON.stringify(yieldData)}`);
            // console.error("F1rstDan modelYields[" + label + `] : ${JSON.stringify(convertedYields)}`);
        } else {
            // 如果没有意外，构建Tooltip数据内容
            this.description.innerHTML = this.buildYieldTooltipContent(yieldData);
        }

        //debug
        // console.error("F1rstDan debug yieldTitle.innerHTML:" + this.yieldTitle.innerHTML);
        // console.error("F1rstDan debug description.innerHTML:" + this.description.innerHTML);
        // console.error("F1rstDan debug yieldData[" + label + `] : ${JSON.stringify(yieldData)}`);

        // 打印完整的DOM结构
        // 使用JSON.stringify()来格式化输出对象结构
        // console.error("F1rstDan debug this.tooltip structure:", JSON.stringify({
        //     element: {
        //         tagName: this.tooltip.tagName,
        //         className: this.tooltip.className,
        //     },
        //     children: Array.from(this.tooltip.children).map(child => ({
        //         tagName: child.tagName,
        //         className: child.className,
        //         children: Array.from(child.children).map(grandChild => ({
        //             tagName: grandChild.tagName, 
        //             className: grandChild.className,
        //             children: Array.from(grandChild.children || []).map(greatGrandChild => ({
        //                 tagName: greatGrandChild.tagName,
        //                 className: greatGrandChild.className
        //             }))
        //         }))
        //     })), 
        // }, null, 2));
    }

    isBlank() {
        return !this.target;  // 用target判断是否显示tooltip
    }
}

// 注册tooltip类型
TooltipManager.registerType('dan-city-yields-tooltip', new DanCityYieldsTooltipType());
// console.error("F1rst CustomTooltipType registerType");