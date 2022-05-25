/**
 * Created by andreas on 25.05.2022
 */

import History from '../util/history';


export default class PageContext{
    constructor(isMain,startpage) {
        this.isMain=isMain;
        this.history=new History();
        this.history.push(startpage);
        this.callback=undefined;
        this.history.setCallback((top)=>{
            if (! this.callback) return;
            this.callback();
        })
    }
    setCallback(cb){
        this.callback=cb;
    }
    getHistory(){
        return this.history;
    }
}
