export default class PageContext{
    constructor(store,history) {
        this.store=store;
        this.history=history;
    }
    getStore(){return this.store}
    getHistory(){return this.history}

}
