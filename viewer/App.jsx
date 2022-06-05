//avnav (C) wellenvogel 2019

import React, { Component } from 'react';
import History from './util/history.js';
import Dynamic from './hoc/Dynamic.jsx';
import keys,{KeyHelper} from './util/keys.jsx';
import OverlayDialog from './components/OverlayDialog.jsx';
import globalStore from './util/globalstore.jsx';
import Requests from './util/requests.js';
import SoundHandler from './components/SoundHandler.jsx';
import Toast,{ToastDisplay} from './components/Toast.jsx';
import KeyHandler from './util/keyhandler.js';
import LayoutHandler from './util/layouthandler.js';
import assign from 'object-assign';
import AlarmHandler, {LOCAL_TYPES} from './nav/alarmhandler.js';
import GuiHelpers, {stateHelper} from './util/GuiHelpers.js';
import Mob from './components/Mob.js';
import Dimmer from './util/dimhandler.js';
import Button from './components/Button.jsx';
import LeaveHandler from './util/leavehandler';
import EditHandlerDialog from "./components/EditHandlerDialog";
import AndroidEventHandler from './util/androidEventHandler';
import remotechannel, {COMMANDS} from "./util/remotechannel";
import base from "./base";
import propertyHandler from "./util/propertyhandler";
import MapHolder from "./map/mapholder";
import NavData from './nav/navdata';
import {getPageForName} from "./gui/PageList";
import Store from "./util/store";
import alarmhandler from "./nav/alarmhandler.js";
import PageContext from "./gui/PageContext";
import {registerHolder} from "./hoc/MapEventGuard";
import {hasActiveInputs} from "./hoc/InputMonitor";


//to feed the sound with the alarm sound we have
const alarmStoreKeys={alarms:keys.nav.alarms.all,
    enabled:keys.properties.localAlarmSound,
    gui: keys.gui.global.soundEnabled};
const computeAlarmSound=(state)=> {
    let off = {src: undefined, repeat: undefined};
    if (!state.enabled || !state.gui) return {enabled: false, ...off};
    if (!state.alarms) return {enabled: true, ...off};
    let alarms = AlarmHandler.sortedActiveAlarms(state.alarms);
    if (alarms.length > 0) {
    //only use the first alarm
        return alarmhandler.getAlarmSound(alarms[0]);
    }
    return {enabled:true,...off};
}
//legacy support - hand over to the "old" gui handler
class Other extends React.Component{
    constructor(props){
        super(props);
    }
    render() {
        return <h1>Unknown page</h1>;
    }
}



class Router extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        let Page=getPageForName(History.getLocationFromState(this.props.location),true);
        if (Page === undefined){
            Page=Other;
        }
        let className="pageFrame "+ (this.props.nightMode?"nightMode":"");
        let style={};
        if (this.props.nightMode) style['opacity']=globalStore.getData(keys.properties.nightFade)/100;
        let dimStyle={opacity: 0.5};
        let small = (this.props.dimensions||{}).width
            < globalStore.getData(keys.properties.smallBreak);
        return <div className={className}>
            {this.props.dim ? <div className="dimm" style={dimStyle} onClick={Dimmer.trigger}></div>:null}
                <Page
                    style={style}
                    location={History.getLocationFromState(this.props.location)}
                    options={History.getOptionsFromState(this.props.location)}
                    pageContext={this.props.pageContext}
                    history={this.props.pageContext.getHistory()}
                    small={small}
                    isEditing={this.props.isEditing}
                />
            </div>
    }
}


//show one button (unscaled) to be able to compute button sizes
const ButtonSizer=(props)=>{
        let fontSize=props.fontSize/4; //unscaled button font size
        let style={fontSize:fontSize+"px"};
        return(
            <div className="buttonSizer" style={style} ref={props.refFunction}>
                <Button name={"dummy"}/>
            </div>
        )};


let lastError={
};

class App extends React.Component {
    constructor(props) {
        super(props);
        this.checkSizes=this.checkSizes.bind(this);
        this.keyDown=this.keyDown.bind(this);
        this.state={
            error:0
        };
        let pageContextKeys=KeyHelper.getContextAwareKeys();
        this.commonStore=globalStore;
        this.store=new Store('main',this.commonStore,pageContextKeys);
        this.secondStore=new Store('second',this.commonStore,pageContextKeys);
        this.buttonSizer=null;
        this.commonStore.storeData(keys.gui.global.onAndroid,false,true);
        //make the android API available as avnav.android
        if (window.avnavAndroid){
            base.log("android integration enabled");
            this.commonStore.storeData(keys.gui.global.onAndroid,true,true);
            avnav.android=window.avnavAndroid;
            this.commonStore.storeData(keys.properties.routingServerError,false,true);
            this.commonStore.storeData(keys.properties.connectedMode,true,true);
            avnav.version=avnav.android.getVersion();
            avnav.android.applicationStarted();
            avnav.android.receiveEvent=(key,id)=>{
                try {
                    //inform the android part that we noticed the event
                    avnav.android.acceptEvent(key, id);
                } catch (e) {
                }
                if (key == 'backPressed'){
                    let currentPage=this.history.currentLocation()
                    if (currentPage == "mainpage"){
                        avnav.android.goBack();
                        return;
                    }
                    this.history.pop();
                }
                if (key == 'propertyChange'){
                    this.commonStore.storeData(keys.gui.global.propertySequence,
                        this.commonStore.getData(keys.gui.global.propertySequence,0)+1);
                }
                if (key == "reloadData"){
                    this.commonStore.storeData(keys.gui.global.reloadSequence,
                        this.commonStore.getData(keys.gui.global.reloadSequence,0)+1);
                }
                AndroidEventHandler.handleEvent(key,id);
            };
        }
        let startpage="warningpage";
        let firstStart=true;
        if (typeof window.localStorage === 'object'){
            if (localStorage.getItem(this.commonStore.getData(keys.properties.licenseAcceptedName)) === 'true'){
                startpage="mainpage";
                firstStart=false;
            }
        }
        this.history=new History(this.store,startpage);
        this.secondHistory=new History(this.secondStore,'mainpage');
        if (firstStart){
            propertyHandler.firstStart();
        }
        let FirstHolder=new MapHolder(this.store);
        registerHolder('first',FirstHolder);
        this.pageContext=new PageContext(this.store,this.history,FirstHolder);
        let SecondHolder=new MapHolder(this.secondStore);
        registerHolder('second',SecondHolder);
        this.secondPageContext=new PageContext(this.secondStore,this.secondHistory,SecondHolder);
        GuiHelpers.storeHelperState(this,this.store,
            {location:keys.gui.global.currentLocation});
        GuiHelpers.storeHelperState(this,this.secondStore,
            {secondLocation:keys.gui.global.currentLocation});
        Requests.getJson("/user/viewer/images.json",{useNavUrl:false,checkOk:false})
            .then((data)=>{
                FirstHolder.setImageStyles(data);
                SecondHolder.setImageStyles(data);
            })
            .catch((error)=> {
                Toast("unable to load user image definitions: " + error);
            });
        Requests.getJson("keys.json",{useNavUrl:false,checkOk:false}).then(
            (json)=>{
                KeyHandler.registerMappings(json);
            },
            (error)=>{
                Toast("unable to load key mappings: "+error);
            }
        );
        Requests.getJson("/user/viewer/keys.json",{useNavUrl:false,checkOk:false}).then(
            (json)=>{
                KeyHandler.mergeMappings(2,json);
            },
            (error)=>{
            }
        );
        LayoutHandler.loadStoredLayout(true)
            .then((layout)=>{})
            .catch((error)=>{Toast(error)});
        GuiHelpers.keyEventHandler(this,()=>{
            Mob.controlMob(true);
        },'global','mobon');
        GuiHelpers.keyEventHandler(this,()=>{
            Mob.controlMob(false);
        },'global','moboff');
        GuiHelpers.keyEventHandler(this,()=>{
            Mob.toggleMob();
        },'global','mobtoggle');
        GuiHelpers.keyEventHandler(this,()=>{
            NavData.getRoutingHandler().anchorOn(undefined,undefined,true);
        },'global','anchoron');
        GuiHelpers.keyEventHandler(this,()=>{
            NavData.getRoutingHandler().anchorOff();
        },'global','anchoroff');
        GuiHelpers.keyEventHandler(this,(component,action)=>{
            let addon=parseInt(action);
            if (this.history.currentLocation() === "addonpage"){
                this.history.replace("addonpage",{activeAddOn:addon});
            }
            else {
                this.history.push("addonpage", {activeAddOn: addon});
            }
        },'addon',['0','1','2','3','4','5','6','7']);
        this.newDeviceHandler=this.newDeviceHandler.bind(this);
        GuiHelpers.storeHelperState(this,this.store,{
            buttonFontSize: keys.properties.style.buttonSize,
            fontSize: keys.properties.baseFontSize,
            smallDisplay: keys.gui.global.smallDisplay,
            nightMode: keys.properties.nightMode,
            layoutName: keys.properties.layoutName
        });
        this.subscription=AndroidEventHandler.subscribe('deviceAdded',this.newDeviceHandler);
        this.remoteChannel=remotechannel;
        this.remoteChannel.start();
        this.remoteChannel.subscribe(COMMANDS.setPage,(msg)=>{
            let parts=msg.split(/  */);
            try {
                let location = parts[0];
                let options={};
                if (parts.length > 1) {
                    options = JSON.parse(parts[1]);
                }
                if (getPageForName(location,true) === undefined){
                    return;
                }
                this.history.setFromRemote(location,options);
            }catch (e){}
        });
        GuiHelpers.storeHelper(this,this.commonStore,(data)=>{
            let lost=data.connectionLost;
            if (lost) {
                if (this.commonStore.getData(keys.properties.connectionLostAlarm)) {
                    alarmhandler.startLocalAlarm(LOCAL_TYPES.connectionLost);
                }
            }
            else alarmhandler.stopAlarm(LOCAL_TYPES.connectionLost);
        },{connectionLost:keys.nav.gps.connectionLost})

    }
    newDeviceHandler(){
        try{
            let devData=avnav.android.getAttachedDevice();
            if (! devData) return;
            let config=JSON.parse(devData);
            if (config.typeName && config.initialParameters){
                EditHandlerDialog.createNewHandlerDialog(config.typeName,config.initialParameters);
            }
        }catch(e){}
    }
    static getDerivedStateFromError(error) {
        lastError.error=error;
        lastError.stack=(error||{}).stack;
        // Update state so the next render will show the fallback UI.
        return { error: 1 };
    }
    componentDidCatch(error,errorInfo){
        lastError.componentStack=(errorInfo||{}).componentStack;
        this.setState({error:2});
    }
    checkSizes(){
        if (hasActiveInputs()) return;
        if (! this.refs.app) return;
        let current=this.refs.app.getBoundingClientRect();
        if (! current) return;
        let small = current.width <this.commonStore.getData(keys.properties.smallBreak);
        this.commonStore.storeData(keys.gui.global.smallDisplay,small); //set small before we change dimensions...
        this.commonStore.storeData(keys.gui.global.windowDimensions,{width:current.width,height:current.height});
        this.computeButtonSizes();

    }
    computeButtonSizes(){
        if (! this.buttonSizer) return;
        let rect=this.buttonSizer.getBoundingClientRect();
        this.commonStore.storeMultiple(
            {height:rect.height,width:rect.width},
            {height: keys.gui.global.computedButtonHeight,width:keys.gui.global.computedButtonWidth}
        );
    }
    componentDidMount(){
        document.addEventListener("keydown",this.keyDown);
        let iv=window.setInterval(this.checkSizes,1000);
        this.checkSizes();
        this.setState({interval:iv});
        window.addEventListener('resize',this.checkSizes);
        AlarmHandler.start();
        this.newDeviceHandler();


    }
    componentWillUnmount(){
        AndroidEventHandler.unsubscribe(this.subscription);
        document.removeEventListener("keydown",this.keyDown);
        window.removeEventListener('resize',this.checkSizes);
        if (this.state.interval){
            window.clearInterval(this.state.interval);
        }
    }
    keyDown(evt){
        let inDialog=hasActiveInputs();
        KeyHandler.handleKeyEvent(evt,inDialog);
    }
    render(){
        if (this.state.error){
            LeaveHandler.stop();
            let version=(window.avnav||{}).version;
            let etext=`VERSION:${version}\nERROR:${lastError.error}\n${lastError.stack}\n${lastError.componentStack}`;
            let etextData='data:text/plain;charset=utf-8,'+encodeURIComponent(etext);
            return <div className="errorDisplay">
                <h1>Internal Error</h1>
                <button
                    className="button"
                    onClick={()=>window.location.href=window.location.href}
                    >
                    Reload App
                </button>
                <a className="errorDownload button"
                   href={etextData}
                   download="AvNavError"
                    >
                    Download Error
                </a>
                <div className="errorInfo">
                    {etext}
                </div>
                </div>
        }
        const Dialogs = OverlayDialog.getDialogContainer;
        let appClass="app";
        let layoutClass=(this.state.layoutName||"").replace(/[^0-9a-zA-Z]/g,'_');
        appClass+=" "+layoutClass;
        if (this.state.smallDisplay) appClass+=" smallDisplay";
        const DynamicSound=Dynamic(SoundHandler, this.commonStore);
        const DynamicFirstRouter=Dynamic(Router, this.store);
        return <div
            className={appClass}
            ref="app"
            style={{fontSize: this.state.fontSize+"px"}}
            tabIndex="0"
            >
            <DynamicFirstRouter
                storeKeys={assign({
                sequence: keys.gui.global.propertySequence,
                dimensions: keys.gui.global.windowDimensions,
                dim: keys.gui.global.dimActive,
                isEditing:keys.gui.global.layoutEditing
                },keys.gui.capabilities)
            }
                pageContext={this.pageContext}
                location={this.state.location}
                nightMode={this.state.nightMode}
                />
            <Dialogs
                className={this.state.nightMode?"nightMode":""}/>
            { ! avnav.android ?<DynamicSound
                storeKeys={alarmStoreKeys}
                updateFunction={computeAlarmSound}
                />:
                null}
            <ToastDisplay/>
            <ButtonSizer
                fontSize={this.state.buttonFontSize}
                refFunction={(el)=>{
                this.buttonSizer=el;
                this.computeButtonSizes();
            }}/>
        </div>
    };
}
export default App;