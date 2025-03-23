// 保存组件引用而不是数据
let decoratedComponent = null;

// 每次调用时从组件获取最新数据
export const getItems = () => {
    if (decoratedComponent && decoratedComponent._items) {
        return decoratedComponent._items;
    }
    return null;
};

// 每次调用时从组件获取最新数据
export const getItemByCategoryAndType = (category,type) => {
    if (decoratedComponent && decoratedComponent._items) {
        return decoratedComponent._items[category].find(item => item.type === type);
    }
    return null;
};

export class DanProductionChooserScreenDecorator {

    constructor(component) {
        this.component = component;
        // 保存组件引用而不是数据
        decoratedComponent = component;

        // this.GetItemsData.bind(this.component);
    }

    // GetItemsData() {
    //     return this._items;
    // }

    beforeAttach() {
    }

    afterAttach() {
    }

    beforeDetach() {
    }

    afterDetach() {
    }
    
}

Controls.decorate('panel-production-chooser', (component) => new DanProductionChooserScreenDecorator(component));