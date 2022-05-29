/**
 * Created by andreas on 02.05.14.
 */

import Dynamic from '../hoc/Dynamic.jsx';
import keys from '../util/keys.jsx';
import React from 'react';
import Page from '../components/Page.jsx';
import InputMonitor from '../hoc/InputMonitor.jsx';
import Mob from '../components/Mob.js';
import Addons from '../components/Addons.js';
import remotechannel, {COMMANDS} from "../util/remotechannel";
import alarmhandler from "../nav/alarmhandler";


class AddOnPage extends React.Component{
    constructor(props){
        super(props);
        let self=this;
        this.buttons=[
            Mob.mobDefinition(this.props.pageContext),
            {
                name: 'Back',
                onClick: ()=>{window.history.back();}
            },
            {
                name: 'Cancel',
                onClick: ()=>{self.props.history.pop()}
            }
        ];
        this.state={
            addOns:[]
        };
        let store=this.props.pageContext.getStore();
        this.buildButtonList=this.buildButtonList.bind(this);
        if (this.props.options && this.props.options.activeAddOn !== undefined){
            store.storeData(keys.gui.addonpage.activeAddOn,this.props.options.activeAddOn);
        }
        if (store.getData(keys.gui.addonpage.activeAddOn) === undefined){
            store.storeData(keys.gui.addonpage.activeAddOn,0);
        }
        this.remoteToken=remotechannel.subscribe(COMMANDS.addOn,(number)=>{
            let i=parseInt(number);
            if (i < 0 || i >= this.state.addOns.length) return;
            store.storeData(keys.gui.addonpage.activeAddOn, -1);
            window.setTimeout(()=> {
                store.storeData(keys.gui.addonpage.activeAddOn, i);
            },100);
        })
        this.blockIds={};
    }
    componentWillUnmount() {
        remotechannel.unsubscribe(this.remoteToken);
        for (let id in this.blockIds){
            alarmhandler.removeBlock(id);
        }
        this.blockIds={};
    }
    blockAlarm(name){
        for (let k in this.blockIds){
            if (this.blockIds[k] === name) return;
        }
        this.blockIds[alarmhandler.addBlock(name)]=name;
    }
    unblockAlarm(name){
        for (let k in this.blockIds){
            if (this.blockIds[k] === name) {
                alarmhandler.removeBlock(k);
                delete this.blockIds[k];
                return;
            }
        }
    }

    componentDidMount(){
        let self=this;
        let store=this.props.pageContext.getStore();
        Addons.readAddOns(true)
            .then((items)=>{
                let currenIndex=store.getData(keys.gui.addonpage.activeAddOn);
                if (self.props.options && self.props.options.addonName){
                    for (let i=0;i<items.length;i++){
                        if (items[i].name == self.props.options.addonName){
                            if (i != currenIndex){
                                currenIndex=i;
                                store.storeData(keys.gui.addonpage.activeAddOn,i);
                            }
                            break;
                        }
                    }
                }
                if (currenIndex === undefined || currenIndex < 0 || currenIndex >= items.length){
                    store.storeData(keys.gui.addonpage.activeAddOn,0);
                }
                self.setState({addOns:items})
            })
            .catch(()=>{});
    }
    buildButtonList(addOns,activeIndex){
        let store=this.props.pageContext.getStore();
        let rt = [];
        if (addOns) {
            for (let i = 0; i < addOns.length; i++) {
                let addOn = addOns[i];
                let button = {
                    name: addOn.key,
                    icon: addOn.icon,
                    onClick: ()=> {
                        remotechannel.sendMessage(COMMANDS.addOn,i);
                        if (addOn.newWindow === 'true'){
                            window.open(addOn.url,addOn.key);
                            return;
                        }
                        //first unload the iframe completely to avoid pushing to the history
                        store.storeData(keys.gui.addonpage.activeAddOn, -1);
                        window.setTimeout(()=> {
                            store.storeData(keys.gui.addonpage.activeAddOn, i);
                        },100);
                    },
                    toggle: activeIndex == i,
                    overflow: true,
                    visible: addOn.newWindow !== 'true' || addOn.url.match(/^http/) || ! store.getData(keys.gui.global.onAndroid,false)
                };
                rt.push(button);
            }
        }
        return this.buttons.concat(rt);
    }
    render(){
        let self=this;
        let Rt=Dynamic((props)=> {
                let currentAddOn={};
                if (self.state.addOns) {
                    currentAddOn = self.state.addOns[props.activeAddOn || 0] || {};
                }
                let url=currentAddOn.url;
                if (url && ! currentAddOn.keepUrl){
                    let urladd="_="+(new Date()).getTime();
                    if (url.match(/\?/)) url+="&"+urladd;
                    else url+="?"+urladd;
                }
                if (currentAddOn.preventConnectionLost){
                    this.blockAlarm('connectionLost');
                }
                else{
                    this.unblockAlarm('connectionLost');
                }
                let showInWindow=currentAddOn.newWindow === 'true';
                let MainContent= InputMonitor((props)=>
                    <div className="addOnFrame">
                        {(currentAddOn.url && ! showInWindow)?<iframe src={url} className="addOn"/>:null}
                    </div>);
                return (
                    <Page
                        {...self.props}
                        id="addonpage"
                        title={showInWindow?'':currentAddOn.title}
                        mainContent={
                            <MainContent/>
                        }
                        buttonList={self.buildButtonList(self.state.addOns,props.activeAddOn||0)}/>
                );
            },{
            storeKeys:{
                activeAddOn:keys.gui.addonpage.activeAddOn,
                }
            }
        );
        return <Rt/>;
    }
}

export default AddOnPage;