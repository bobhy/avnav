export default class PageContext{
    constructor(store,history,mapholder) {
        this.store=store;
        this.history=history;
        this.mapholder=mapholder;
    }
    getStore(){return this.store}
    getHistory(){return this.history}
    getMapHolder(){return this.mapholder}

}
