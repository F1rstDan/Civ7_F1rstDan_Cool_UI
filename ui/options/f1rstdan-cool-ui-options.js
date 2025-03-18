/**
 * F1rstDan's Cool UI - Mod Options
 * Mod options from: https://forums.civfanatics.com/threads/configuring-mod-options-with-a-dedicated-mods-tab.696784/
 * MOD下载地址：https://forums.civfanatics.com/resources/31961/
 * GitHub：https://github.com/F1rstDan/Civ7_F1rstDan_Cool_UI
 */
import '/core/ui/options/options.js';  // make sure this loads first
import { CategoryType } from '/core/ui/options/options-helpers.js';
import { Options, OptionType } from '/core/ui/options/model-options.js';
import ModSettings from '/f1rstdan-cool-ui/ui/options/mod-options-decorator.js';

const MOD_ID = "f1rstdan-cool-ui";

const F1rstDanModOptions = new class {
    data = {
        // 城市收入栏数值四舍五入
        cityYieldsBarValueFormat: false,
        pItemApplyLayout: true,
        pItemDisplayMaintenance: true,
        pItemDisplayProductionCost: true,
    };
    constructor() {
        const modSettings = ModSettings.load(MOD_ID);
        if (modSettings) this.data = modSettings;
    }
    save() {
        ModSettings.save(MOD_ID, this.data);
    }
    // ============
    get cityYieldsBarValueFormat() {
        return this.data.cityYieldsBarValueFormat;
    }
    set cityYieldsBarValueFormat(flag) {
        this.data.cityYieldsBarValueFormat = !!flag;
        this.save();
    }
    // ============
    get pItemApplyLayout() {
        return this.data.pItemApplyLayout;
    }
    set pItemApplyLayout(flag) {
        this.data.pItemApplyLayout = !!flag;
        this.save();
    }
    get pItemDisplayMaintenance() {
        return this.data.pItemDisplayMaintenance;
    }
    set pItemDisplayMaintenance(flag) {
        this.data.pItemDisplayMaintenance = !!flag;
        this.save();
    }
    get pItemDisplayProductionCost() {
        return this.data.pItemDisplayProductionCost;
    }
    set pItemDisplayProductionCost(flag) {
        this.data.pItemDisplayProductionCost = !!flag;
        this.save();
    }
};
// ============
const onInitCityYieldsBarValueFormat = (info) => {
    info.currentValue = F1rstDanModOptions.cityYieldsBarValueFormat;
};
const onUpdateCityYieldsBarValueFormat = (_info, flag) => {
    F1rstDanModOptions.cityYieldsBarValueFormat = flag;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "f1rstdan_mods",
        type: OptionType.Checkbox,
        id: "f1rstdan-city-yields-bar-value-format",
        initListener: onInitCityYieldsBarValueFormat,
        updateListener: onUpdateCityYieldsBarValueFormat,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_YIELDS_BAR_VALUE_FORMAT",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_YIELDS_BAR_VALUE_FORMAT_DESCRIPTION",
    });
});
// ============
const onInitPItemApplyLayout = (info) => {
    info.currentValue = F1rstDanModOptions.pItemApplyLayout;
};
const onUpdatePItemApplyLayout = (_info, flag) => {
    F1rstDanModOptions.pItemApplyLayout = flag;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "f1rstdan_mods",
        type: OptionType.Checkbox,
        id: "f1rstdan-p-item-apply-layout",
        initListener: onInitPItemApplyLayout,
        updateListener: onUpdatePItemApplyLayout,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_APPLY_LAYOUT",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_APPLY_LAYOUT_DESCRIPTION",
    });
});
const onInitPItemDisplayMaintenance = (info) => {
    info.currentValue = F1rstDanModOptions.pItemDisplayMaintenance;
};
const onUpdatePItemDisplayMaintenance = (_info, flag) => {
    F1rstDanModOptions.pItemDisplayMaintenance = flag;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "f1rstdan_mods",
        type: OptionType.Checkbox,
        id: "f1rstdan-p-item-display-maintenance",
        initListener: onInitPItemDisplayMaintenance,
        updateListener: onUpdatePItemDisplayMaintenance,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_MAINTENANCE",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_MAINTENANCE_DESCRIPTION",
    });
});
const onInitPItemDisplayProductionCost = (info) => {
    info.currentValue = F1rstDanModOptions.pItemDisplayProductionCost;
};
const onUpdatePItemDisplayProductionCost = (_info, flag) => {
    F1rstDanModOptions.pItemDisplayProductionCost = flag;
};
Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        group: "f1rstdan_mods",
        type: OptionType.Checkbox,
        id: "f1rstdan-p-item-display-production-cost",
        initListener: onInitPItemDisplayProductionCost,
        updateListener: onUpdatePItemDisplayProductionCost,
        label: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_PRODUCTION_COST",
        description: "LOC_OPTIONS_F1RSTDAN_CITY_PRODUCTION_ITEM_DISPLAY_PRODUCTION_COST_DESCRIPTION",
    });
});


//
export { F1rstDanModOptions as default };
