/**
 * Created by andreas on 25.05.2022
 */

import History from '../util/history';
import {allowInSecond, getPageForName} from "./PageList";


export default class PageContext{
    constructor(isMain,startpage) {
        this.isMain=isMain;
        this.history=new History(isMain?
            undefined:
            (location)=>allowInSecond(location));
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
    getPage(){
        let location=this.history.currentLocation();
        return getPageForName(location,this.isMain);
    }
    canShowPage(name){
        if (this.isMain) return true;
        return allowInSecond(name);
    }
}
