export class DanCityBannersDecorator {

    constructor(component) {
        this.banner = component;
        // this.observerConfig = { attributes: true, attributeFilter: ['value', 'max-value'] }; // currentFood and nextThreshold
        // this.observer = new MutationObserver(this.onGrowthUpdated.bind(this.component));


    }

    // onGrowthUpdated() {
    // }

    beforeAttach() {
        // Hook up to growthQueueMeter's updates, which will be updated when currentFood or population is updated.
        // this.observer.observe(this.component.elements.growthQueueMeter, this.observerConfig);
    }

    afterAttach() {
        try {
            // 应用自定义布局和样式
            this.applyCustomLayout();
        } catch (error) {
            console.error('F1rstDan DanCityBannersDecorator afterAttach error:', error);
        }
    }

    beforeDetach() {
    }

    afterDetach() {
        // this.observer.disconnect();
    }

    /**
     * 应用自定义布局样式到组件和DOM结构调整功能
     */
    applyCustomLayout() {
        const elements = this.banner.elements;
        const cityBanner = elements.container;
        const cityNameContainer = elements.cityNameContainer;
        const populationDiv = this.banner.Root.querySelector(".city-banner__population-container");
        const populationRing = elements.growthQueueMeter;

        // 增加 城市连通性 圆环元素 Ring=进度条 | Number=中心数字 | turn=下方旗帜 | turn-number=下方数字
        const connectivityDiv = this.createCustomElement('connectivityDiv', 'div', 'items-center justify-center w-6 h-6 -mt-2', cityBanner);
        // 创建进度条和中心数字  TODO：设置最大数值等等
        const connectivityRing = this.createCustomElement('connectivityRing', 'fxs-ring-meter', 'city-banner__ring bg-cover bg-center flex size-9 self-center align-center', connectivityDiv);
        connectivityRing.setAttribute("value", '50');
        connectivityRing.setAttribute("max-value", '100');
        const connectivityNumber = this.createCustomElement('connectivityNumber', 'div', 'font-body-xs text-white top-0 w-full text-center pointer-events-auto', connectivityRing);
        connectivityNumber.textContent = '5';
        // 创建下方旗帜和下方数字
        const connectivityTurn = this.createCustomElement('connectivityTurn', 'div', 'city-banner__turn flex flex-col justify-end align-center self-center top-0\.5 pointer-events-none relative', connectivityDiv);
        const connectivityTurnNumber = this.createCustomElement('connectivityTurnNumber', 'div', 'city-banner__turn-number font-base-2xs text-white text-center w-full bg-cover bg-center bg-no-repeat', connectivityTurn);
        const dataTurns = 15;
        if (dataTurns >= 0) {
            connectivityTurnNumber.innerHTML = dataTurns.toString();
            connectivityTurnNumber.classList.remove('hidden');
        }
        else {
            connectivityTurnNumber.classList.add('hidden');
        }


        // 确保DOM结构正确，确保 城市连通性 在 人口 之后
        if (cityNameContainer) {
            console.error("F1rstDan cityBanner is running")
            // 确保主要信息区在图标之后
            if (connectivityDiv && populationDiv) {
                cityNameContainer.insertBefore(connectivityDiv, populationDiv.nextSibling);
            }
        }
    }

    // 辅助函数
    /**
     * 创建自定义元素。确保自定义元素存在，如果不存在则创建。 
     * @param {string} propertyName - 元素属性名称
     * @param {string} tagName - 元素标签名称
     * @param {string} className - 元素的类名
     * @param {HTMLElement} parentElement - 父元素
     */
    createCustomElement(propertyName, tagName, className, parentElement) {
        if (!this.banner[propertyName]) {
            this.banner[propertyName] = document.createElement(tagName);
            this.banner[propertyName].className = className;
        }
        if (parentElement) parentElement.appendChild(this.banner[propertyName]);
        return this.banner[propertyName];
    }
    /**
     * 更新元素的类列表
     * (可接受字符串形式的类名，也能接受数组形式的类名)
     * @param {HTMLElement} element - 要更新的元素
     * @param {string[]} removeClasses - 要移除的类名数组
     * @param {string[]} addClasses - 要添加的类名数组
     */
    updateClassList(element, removeClasses, addClasses) {
        if (!element) {
            console.error('F1rstDan [updateClassList] element is null');
            return;
        }
        const normalizeClasses = (classes) => {
            return Array.isArray(classes) ? classes : classes.split(' ');
        };
        const normalizedRemoveClasses = normalizeClasses(removeClasses);
        const normalizedAddClasses = normalizeClasses(addClasses);

        element.classList.remove(...normalizedRemoveClasses);
        element.classList.add(...normalizedAddClasses);
    }
    /**
     * 移动元素到新的父元素，并更新类名和内容
     * @param {HTMLElement} element - 要移动的元素
     * @param {HTMLElement} newParent - 新的父元素
     * @param {string} className - 新的类名
     * @param {string} innerHTML - 新的内容
     */
    moveElement(element, newParent, className, innerHTML = '') {
        if (!element) {
            console.error('F1rstDan [moveElement] element is null');
            return;
        }
        if (element.parentNode && newParent) {
            element.parentNode.removeChild(element);
            newParent.appendChild(element);
        }
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
    }
}

Controls.decorate('city-banner', (component) => new DanCityBannersDecorator(component));