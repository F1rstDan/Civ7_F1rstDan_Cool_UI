// ============================================================================
// Nasuellia 设置管理器 - 文明7 MOD的选项框架
// ============================================================================
// 作者: nasuellia
// 许可: 公共领域 - 也就是说: 您可以随意使用此代码，风险自负！
// 版本: 0.3 (未发布，仅嵌入到nasuellia的mod中)
// 
// 概述:
// 此文件提供了一个自包含、可重用的类，用于管理文明7中的mod设置。
// 它允许mod制作者通过单一配置定义选项，自动生成UI选项、存储和确认/取消行为，
// 与游戏原版选项系统匹配。选项显示在游戏设置菜单的"Mods"类别下，
// 该系统设计为避免与其他设置API冲突。
//
// 功能:
// - 选项定义的单一真实来源(settingsConfig)
// - 自动生成getter/setter、默认值和UI选项
// - 支持确认/取消行为(更改仅在"确认"时应用)
// - 与其他mod和设置API兼容
// - 在mod特定键下存储在localStorage中
//
// 使用方法:
// 1. 将此文件复制到您的mod脚本目录(例如，scripts/author-modname-settings.js)。
// 2. 为您的mod更新modSettingsKey和modGroup为唯一值。
// 3. 在settingsConfig中定义您的选项(格式见下文)。
// 4. 将文件添加到您的.modinfo(以下一项或两项):
//    - <UIScripts> 用于shell范围(主菜单)
//    - <ImportFiles> 用于游戏范围(游戏内)
// 5. 在您的mod脚本中导入getSettings以访问设置值。
//
// 导入示例:
// import { getSettings } from '/scripts/author-modname-settings.js';
// const getCurrentSettings = () => getSettings("yourModSettingsKey");
// console.log(getCurrentSettings().YourVariable);
// ============================================================================




// ============================================================================
// 自定义: Mod特定标识符
// ============================================================================
// 为您的mod在localStorage中定义一个唯一的键，以避免与其他mod冲突。
// 同时为UI中的选项设置一个组标识符，这有助于在"Mods"类别中组织选项。
//
// 变量:
// - modSettingsKey: 您的mod的唯一字符串(例如，"yourModNameSettingsKey")。
// - modGroup: 设置屏幕中您的mod组的本地化字符串。
const modSettingsKey = "f1rstdan-cool-ui";
const modGroup = "f1rstdan_mods";
export const getUserModOptions = () => getSettings(modSettingsKey);
// ============================================================================




// ============================================================================
// 导入: 选项系统的核心游戏模块
// ============================================================================
// 这些导入引入了与文明7的游戏选项系统交互所需的必要模块。
// 除非您知道自己在做什么，否则不要修改这些。
import { Options, OptionType } from '/core/ui/options/model-options.js';
import { CategoryType, CategoryData } from '/core/ui/options/options-helpers.js';
import '/core/ui/options/options.js';
const proto = Object.getPrototypeOf(Options);
// ============================================================================




// ============================================================================
// 类别设置: 添加"Mods"类别
// ============================================================================
// 此部分安全地向选项UI添加"Mods"类别，确保与可能也定义此类别的其他mod兼容。
// 如果该类别已存在(例如，由另一个API定义)，它会跳过重新定义以避免冲突。
// 如果"Mods"不可用，选项将回退到"Game"类别。
// 除非您知道自己在做什么，否则不要修改这些。
if (!CategoryType.Mods) {
    CategoryType.Mods = "mods";
    CategoryData[CategoryType.Mods] = {
        title: "LOC_UI_CONTENT_MGR_SUBTITLE",
        description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
    };
}
const modCategory = CategoryType.Mods || CategoryType.Game;
// ============================================================================




// ============================================================================
// 设置配置: 在此定义所有选项
// ============================================================================
// 这是您的mod设置的单一真实来源。每个条目定义一个设置、其默认值和UI属性。
// 系统从此配置自动生成getter/setter、默认值和UI选项。
//
// 格式:
// - name: 设置名称(例如，"ModSettingName")。用于getter/setter。
// - defaultValue: 设置的默认值(例如，true)。
// - id: UI选项的唯一标识符(例如，"modname-setting-name")。
// - type: UI选项类型(例如，OptionType.Checkbox, OptionType.Dropdown)。
// - label: 选项标签的本地化字符串(例如，"MOD_SETTING_NAME_LABEL")。
// - description: 选项描述的本地化字符串(例如，"MOD_SETTING_NAME_DESCRIPTION")。
// - requiresRestart: 可选布尔值；如果为true，更改此选项将提示游戏UI在确认时重新加载。
// - extraProps: 高级选项类型的可选属性(当前不支持)。
//
// 复选框示例:
// {
//     name: 'EnableFeature',
//     defaultValue: true,
//     id: "modname-enable-feature",
//     type: OptionType.Checkbox,
//     label: "ENABLE_FEATURE_LABEL",
//     description: "ENABLE_FEATURE_DESCRIPTION",
//     requiresRestart: false
// }
//
// - 下拉菜单: 带有可选项的下拉菜单。
// {
//     name: 'FeatureMode',
//     defaultValue: "normal",
//     id: "modname-feature-mode",
//     type: OptionType.Dropdown,
//     label: "FEATURE_MODE_LABEL",
//     description: "FEATURE_MODE_DESCRIPTION",
//     requiresRestart: true,
//     extraProps: {
//         dropdownItems: [
//             { setting: "easy", label: "EASY_MODE_LABEL" },
//             { setting: "normal", label: "NORMAL_MODE_LABEL" },
//             { setting: "hard", label: "HARD_MODE_LABEL" }
//         ]
//     }
// }

const settingsConfig = [
    {   // 城市收入栏数值四舍五入
        name: 'cityYieldsBarValueFormat',
        defaultValue: false,
        id: "f1rstdan-city-yields-bar-value-format",
        type: OptionType.Checkbox,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_YIELDS_BAR_VALUE_FORMAT",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_YIELDS_BAR_VALUE_FORMAT_DESCRIPTION",
        requiresRestart: false
    },
    {   // 生产项目栏是否应用自定义布局
        name: 'pItemApplyLayout',
        defaultValue: true,
        id: "f1rstdan-p-item-apply-layout",
        type: OptionType.Checkbox,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_APPLY_LAYOUT",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_APPLY_LAYOUT_DESCRIPTION",
        requiresRestart: false
    },
    {   // 生产项目栏是否显示维护成本
        name: 'pItemDisplayMaintenance',
        defaultValue: true,
        id: "f1rstdan-p-item-display-maintenance",
        type: OptionType.Checkbox,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_MAINTENANCE",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_MAINTENANCE_DESCRIPTION",
        requiresRestart: false
    },
    {   // 生产项目栏是否显示生产成本
        name: 'pItemDisplayProductionCost',
        defaultValue: true,
        id: "f1rstdan-p-item-display-production-cost",
        type: OptionType.Checkbox,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_PRODUCTION_COST",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_PRODUCTION_COST_DESCRIPTION",
        requiresRestart: false
    },
    {   // 是否显示城市横幅上的 城市连接信息
        name: 'cityBannerDisplayConnectionInfo',
        defaultValue: true,
        id: "f1rstdan-city-banner-display-connection-info",
        type: OptionType.Checkbox,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_BANNER_DISPLAY_CONNECTION_INFO",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_BANNER_DISPLAY_CONNECTION_INFO_DESCRIPTION",
        requiresRestart: true
    },
];
// ============================================================================




// ============================================================================
// 默认设置: 从settingsConfig生成
// ============================================================================
// 自动生成getSettings和createSettings使用的默认设置对象。
// 这确保了默认值和设置配置之间的一致性。
// 除非您知道自己在做什么，否则不要修改这些。
const defaultSettings = {};
settingsConfig.forEach(setting => {
    defaultSettings[setting.name] = setting.defaultValue;
});
// ============================================================================




// ============================================================================
// ModSettingsManager: 设置的持久存储
// ============================================================================
// 在单个键("modSettings")下管理localStorage中的设置存储，
// 由modSettingsKey命名空间。这确保每个mod的设置是隔离的，
// 防止与其他mod冲突。
// 除非您知道自己在做什么，否则不要修改这些。
const ModSettingsManager = {
    save(key, data) {
        const modSettings = JSON.parse(localStorage.getItem("modSettings") || '{}');
        modSettings[key] = data;
        localStorage.setItem("modSettings", JSON.stringify(modSettings));
    },
    read(key) {
        const modSettings = localStorage.getItem("modSettings");
        try {
            if (modSettings) {
                const data = JSON.parse(modSettings || '{}')[key];
                if (data) return data;
            }
            return null;
        } catch (e) {
            console.error(`[ModSettingsManager][${key}] Error loading settings`, e);
        }
        return null;
    }
};
// ============================================================================




// ============================================================================
// getSettings: 访问已提交的设置值
// ============================================================================
// 导出函数，供其他脚本访问mod的设置。返回已提交的设置值
// (从localStorage)或默认设置(如果没有保存)。
// 注意，这仅反映已确认的更改，而不是待处理的更改。
// 除非您知道自己在做什么，否则不要修改这些。
export function getSettings(key = modSettingsKey) {
    return ModSettingsManager.read(key) || defaultSettings;
}
// ============================================================================


// ============================================================================
// createSettings: 动态设置类工厂
// ============================================================================
// 创建一个设置类，为settingsConfig中定义的每个设置动态生成getter和setter。
// 管理已提交(_data)和待处理(_pendingData)值，以支持确认/取消行为。
// 除非您知道自己在做什么，否则不要修改这些。
//
// 方法:
// - commit(): 将待处理的更改应用到已提交的数据并保存到localStorage。
// - restore(): 将待处理的更改恢复到最后提交的值。
// - save(): 将已提交的数据保存到localStorage(由commit()调用)。
// - resetToDefaults(): 将所有设置重置为默认值并保存。
function createSettings(modSettingsKey) {
    const settingsClass = class {
        _data = { ...defaultSettings };
        _pendingData = { ...this._data };

        constructor() {
            const savedData = ModSettingsManager.read(modSettingsKey);
            if (savedData) {
                this._data = { ...defaultSettings, ...savedData };
                this._pendingData = { ...this._data };
                if (Object.keys(savedData).length < Object.keys(defaultSettings).length) {
                    this.save();
                }
            } else {
                this.save();
            }
        }

        commit() {
            this._data = { ...this._pendingData };
            this.save();
            if (this._pendingRequiresRestart) {
                UI.reloadUI();
            }
        }

        restore() {
            this._pendingData = { ...this._data };
            this._pendingRequiresRestart = false;
        }

        save() {
            ModSettingsManager.save(modSettingsKey, this._data);
        }

        resetToDefaults() {
            this._data = { ...defaultSettings };
            this._pendingData = { ...this._data };
            this.save();
        }

    };

    // 动态添加getter和setter
    settingsConfig.forEach(setting => {
        Object.defineProperty(settingsClass.prototype, setting.name, {
            get() {
                return this._pendingData[setting.name];
            },
            set(value) {
                this._pendingData[setting.name] = value;
            },
            enumerable: true,
            configurable: true
        });
    });

    return new settingsClass();
}
const modSettings = createSettings(modSettingsKey);
// ============================================================================




// ============================================================================
// optionsConfig: 生成的UI选项配置
// ============================================================================
// 从settingsConfig自动生成UI选项的配置。
// 这定义了每个设置在游戏的选项菜单中的显示方式，
// 包括其类型、标签、描述和其他属性。
// 除非您知道自己在做什么，否则不要修改这些。
const optionsConfig = settingsConfig.map(setting => ({
    setting: setting.name,
    id: setting.id,
    type: setting.type,
    label: setting.label,
    description: setting.description,
    requiresRestart: setting.requiresRestart || false,
    // 如果将来需要，添加任何extraProps
    ...(setting.extraProps ? { extraProps: setting.extraProps } : {})
}));
// ============================================================================




// ============================================================================
// 确认/取消钩子: 与游戏UI集成
// ============================================================================
// 覆盖游戏的Options.commitOptions和Options.restore方法，
// 以集成确认/取消流程。这确保更改仅在用户点击"确认"时应用，
// 在"取消"时丢弃。
// 注意: 这些覆盖链接到原始方法，确保与可能也覆盖这些方法的其他mod兼容。
// 除非您知道自己在做什么，否则不要修改这些。
const commitOptions = proto.commitOptions;
proto.commitOptions = function(...args) {
    commitOptions.apply(this, args);
    modSettings.commit();
};

const restore = proto.restore;
proto.restore = function(...args) {
    restore.apply(this, args);
    modSettings.restore();
};

const resetOptionsToDefault = proto.resetOptionsToDefault;
proto.resetOptionsToDefault = function(...args) {
    resetOptionsToDefault.apply(this, args);
    modSettings.resetToDefaults();
};
// ============================================================================




// ============================================================================
// 选项注册: 将选项添加到游戏UI
// ============================================================================
// 使用Options.addInitCallback向游戏的选项系统注册所有选项。
// 每个选项都配置了initListener和updateListener来处理UI交互，
// 在确认之前将更改缓冲在modSettings中。
// 选项放置在"Mods"类别(或作为后备的"Game")中，
// 并按modGroup分组以在UI中组织。
// 除非您知道自己在做什么，否则不要修改这些。
Options.addInitCallback(() => {
    optionsConfig.forEach(opt => {
        let initListener;
        let updateListener;

        // 各种选项类型的默认处理。
        switch (opt.type) {
            case OptionType.Checkbox:
                initListener = (optionInfo) => {
                    optionInfo.currentValue = modSettings[opt.setting];
                };
                updateListener = (optionInfo, value) => {
                    if (optionInfo.currentValue !== value) {  // 只在值真正改变时
                        optionInfo.currentValue = value;
                        modSettings[opt.setting] = value;
                        if (opt.requiresRestart) {
                            modSettings._pendingRequiresRestart = true;
                        }
                    }
                };
                break;
                // updateListener = (optionInfo, value) => {
                //     optionInfo.currentValue = value;
                //     modSettings[opt.setting] = value;
                // };
                // if (opt.requiresRestart) {  // 这里的判断位置不对，导致选项中任一有requiresRestart=ture只要点击确认，就会重启UI
                //     modSettings._pendingRequiresRestart = true;
                // }
                // break;
            case OptionType.Dropdown:
                initListener = (optionInfo) => {
                    const currentValue = modSettings[opt.setting];
                    if (optionInfo.dropdownItems && Array.isArray(optionInfo.dropdownItems)) {
                        const index = optionInfo.dropdownItems.findIndex(item => item.setting === currentValue);
                        optionInfo.selectedItemIndex = index >= 0 ? index : 0;
                    }
                };
                updateListener = (optionInfo, value) => {
                    if (optionInfo.dropdownItems && Array.isArray(optionInfo.dropdownItems)) {
                        modSettings[opt.setting] = optionInfo.dropdownItems[value].setting;
                        if (opt.requiresRestart) {
                            modSettings._pendingRequiresRestart = true;
                        }
                    }
                };
                break;
            default:
                console.error(
                    `NASUDEBUG: Unsupported option type "${opt.type}" for option "${opt.id}". ` +
                    `Only OptionType.Checkbox and OptionType.Dropdown are supported. ` +
                    `This option will be skipped.`
                );
                return;
        }

        // 构建选项对象。
        const optionObj = {
            category: opt.category || modCategory,
            group: opt.group || modGroup,
            type: opt.type,
            id: opt.id,
            initListener: initListener,
            updateListener: updateListener,
            label: opt.label,
            description: opt.description
        };

        // 合并任何额外属性(如dropdownItems、min、max、steps等)。
        if (opt.extraProps) {
            Object.assign(optionObj, opt.extraProps);
        }

        Options.addOption(optionObj);
    });
});
// ============================================================================