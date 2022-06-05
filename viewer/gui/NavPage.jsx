/**
 * Created by andreas on 02.05.14.
 */

import keys from '../util/keys.jsx';
import React from 'react';
import MapPage,{overlayDialog} from '../components/MapPage.jsx';
import Toast from '../components/Toast.jsx';
import NavHandler from '../nav/navdata.js';
import OverlayDialog from '../components/OverlayDialog.jsx';
import Helper from '../util/helper.js';
import GuiHelpers from '../util/GuiHelpers.js';
import navobjects from '../nav/navobjects.js';
import ButtonList from '../components/ButtonList.jsx';
import WayPointDialog from '../components/WaypointDialog.jsx';
import RouteEdit,{StateHelper} from '../nav/routeeditor.js';
import LayoutHandler from '../util/layouthandler.js';
import LayoutFinishedDialog from '../components/LayoutFinishedDialog.jsx';
import EditWidgetDialog from '../components/EditWidgetDialog.jsx';
import EditPageDialog from '../components/EditPageDialog.jsx';
import anchorWatch from '../components/AnchorWatchDialog.jsx';
import Mob from '../components/Mob.js';
import Dimmer from '../util/dimhandler.js';
import FeatureInfoDialog from "../components/FeatureInfoDialog";
import {TrackConvertDialog} from "../components/TrackInfoDialog";
import FullScreen from '../components/Fullscreen';
import DialogButton from "../components/DialogButton";
import RemoteChannelDialog from "../components/RemoteChannelDialog";
import {InputReadOnly} from "../components/Inputs";
import assign from 'object-assign';
import WidgetFactory from "../components/WidgetFactory";
import ItemList from "../components/ItemList";
import Dynamic from "../hoc/Dynamic";

const RouteHandler=NavHandler.getRoutingHandler();

const activeRoute=new RouteEdit(RouteEdit.MODES.ACTIVE);

const PAGENAME='navpage';




const getPanelList=(panel)=>{
    return LayoutHandler.getPanelData(PAGENAME,panel,LayoutHandler.getOptionValues([LayoutHandler.OPTIONS.SMALL,LayoutHandler.OPTIONS.ANCHOR]));
};
const getPanelWidgets=(panel,store)=>{
    let panelData=getPanelList(panel);
    if (panelData && panelData.list) {
        let layoutSequence=store.getData(keys.gui.global.layoutSequence);
        let idx=0;
        panelData.list.forEach((item)=>{
            item.key=layoutSequence+"_"+idx;
            idx++;
        })
        return panelData.list;
    }
    return [];
}
/**
 *
 * @param item
 * @param idx if undefined - just update the let "to" point
 */
const startWaypointDialog=(item,idx)=>{
    if (! item) return;
    const wpChanged=(newWp,close)=>{
        let changedWp=WayPointDialog.updateWaypoint(item,newWp,(err)=>{
            Toast(Helper.escapeHtml(err));
        });
        if (changedWp) {
            if (idx !== undefined){
                activeRoute.changeSelectedWaypoint(changedWp,idx);
            }
            else{
                activeRoute.changeTargetWaypoint(changedWp);
            }
            return true;
        }
        return false;
    };
    let RenderDialog=function(props){
        return <WayPointDialog
            {...props}
            waypoint={item}
            okCallback={wpChanged}/>
    };
    OverlayDialog.dialog(RenderDialog);
};

const setBoatOffset=(pageContext)=>{
    let store=pageContext.getStore();
    if (! store.getData(keys.nav.gps.valid)) return;
    let pos=store.getData(keys.nav.gps.position);
    if (! pos) return;
    let ok=pageContext.getMapHolder().setBoatOffset(pos);
    return ok;
}
const showLockDialog=(pageContext)=>{
    const LockDialog=(props)=>{
        return <div className={'LockDialog inner'}>
            <h3 className="dialogTitle">{'Lock Boat'}</h3>
            <div className={'dialogButtons'}>
                <DialogButton
                    name={'current'}
                    onClick={()=>{
                        props.closeCallback();
                        if (!setBoatOffset(pageContext)) return;
                        pageContext.getMapHolder().setGpsLock(true);
                    }}
                >
                    Current</DialogButton>
                <DialogButton
                    name={'center'}
                    onClick={()=>{
                        props.closeCallback();
                        pageContext.getMapHolder().setBoatOffset();
                        pageContext.getMapHolder().setGpsLock(true);
                    }}
                >
                    Center
                </DialogButton>
                <DialogButton
                    name={'cancel'}
                    onClick={()=>props.closeCallback()}
                >
                    Cancel
                </DialogButton>
            </div>
        </div>
    }
    OverlayDialog.dialog(LockDialog);
}

const setCenterToTarget=(pageContext)=>{
    pageContext.getMapHolder().setGpsLock(false);
    if (pageContext.getStore().getData(keys.nav.anchor.watchDistance) !== undefined){
        pageContext.getMapHolder().setCenter(activeRoute.getCurrentFrom());
    }
    else {
        pageContext.getMapHolder().setCenter(activeRoute.hasRoute() ? activeRoute.getPointAt() : activeRoute.getCurrentTarget());
    }
};

const navNext=()=>{
    if (!activeRoute.hasRoute() ) return;
    RouteHandler.wpOn(activeRoute.getNextWaypoint())
};


const OVERLAYPANEL="overlay";
class MapWidgetsDialog extends React.Component{
    constructor(props) {
        super(props);
        this.state={
            items:this.getCurrent()
        };
        this.sequence=GuiHelpers.storeHelper(this,this.props.store,()=>{
            this.setState({items:this.getCurrent()})
        },[keys.gui.global.layoutSequence]);
    }

    getCurrent() {
        let current = getPanelWidgets(OVERLAYPANEL,this.props.store);
        let idx = 0;
        let rt = [];
        current.forEach((item) => {
            rt.push(assign({index: idx}, item));
            idx++;
        })
        return rt;
    }
    onItemClick(item){
        EditWidgetDialog.createDialog(item,PAGENAME,OVERLAYPANEL,{fixPanel:true,types:['map']});
    }
    render(){
        return <div className={'MapWidgetsDialog'}>
            <h2>Map Widgets</h2>
            {this.state.items && this.state.items.map((item)=>{
                let theItem=item;
                return <div className={'dialogRow listEntry'}
                    onClick={()=>this.onItemClick(theItem)}
                >{item.name}</div>
            })}
            <div className={'dialogButtons'}>
                <DialogButton
                    name={'add'}
                    onClick={()=>EditWidgetDialog.createDialog(undefined,PAGENAME,OVERLAYPANEL,{fixPanel:true,types:['map']})}
                    >Add</DialogButton>
                <DialogButton
                    name={'cancel'}
                    onClick={this.props.closeCallback}
                >Close</DialogButton>
            </div>
        </div>
    }
}

class NavPage extends React.Component{
    constructor(props){
        super(props);
        let store=this.props.pageContext.getStore();
        let self=this;
        this.getButtons=this.getButtons.bind(this);
        this.mapEvent=this.mapEvent.bind(this);
        this.state={
            showWpButtons: false
        };
        this.showWpButtons=this.showWpButtons.bind(this);
        this.widgetClick=this.widgetClick.bind(this);
        this.sequence=GuiHelpers.storeHelper(this,store,()=>{
            this.props.pageContext.getMapHolder().triggerRender();
        },[keys.gui.global.layoutSequence]);
        store.storeData(keys.map.measurePosition,undefined);
        this.waypointButtons=[
            anchorWatch(this.props.pageContext),
            {
                name:'WpLocate',
                onClick:()=>{
                    self.wpTimer.startTimer();
                    setCenterToTarget(this.props.pageContext);
                    this.showWpButtons(false);
                }
            },
            {
                name:'WpEdit',
                onClick:()=>{
                    if (activeRoute.hasRoute()){
                        startWaypointDialog(activeRoute.getPointAt(),activeRoute.getIndex());
                    }
                    else {
                        startWaypointDialog(activeRoute.getCurrentTarget());
                    }
                    this.showWpButtons(false);
                },
                storeKeys: {watchDistance:keys.nav.anchor.watchDistance},
                updateFunction:(state)=>{
                    return {visible:! (state.watchDistance !== undefined)}
                },

            },
            {
                name:'WpGoto',
                storeKeys:activeRoute.getStoreKeys({watchDistance:keys.nav.anchor.watchDistance}),
                updateFunction: (state)=> {
                    return {visible: !StateHelper.selectedIsActiveTarget(state) && ! (state.watchDistance !== undefined)}
                },
                onClick:()=>{
                    let selected=activeRoute.getPointAt();
                    this.showWpButtons(false);
                    if (selected) RouteHandler.wpOn(selected);
                },


            },
            {
                name:'NavNext',
                storeKeys:activeRoute.getStoreKeys({watchDistance:keys.nav.anchor.watchDistance}),
                updateFunction: (state)=> {
                    return {visible:  StateHelper.selectedIsActiveTarget(state)
                            &&  StateHelper.hasPointAtOffset(state,1)
                            && ! (state.watchDistance !== undefined)
                    };
                },
                onClick:()=>{
                    self.showWpButtons(false);
                    activeRoute.moveIndex(1);
                    RouteHandler.wpOn(activeRoute.getPointAt());

                }
            },
            {
                name:'WpNext',
                storeKeys:activeRoute.getStoreKeys({watchDistance:keys.nav.anchor.watchDistance}),
                updateFunction: (state)=> {
                    return {
                        disabled:!StateHelper.hasPointAtOffset(state,1),
                        visible: StateHelper.hasRoute(state) && ! (state.watchDistance !== undefined)
                    };
                },
                onClick:()=>{
                    self.wpTimer.startTimer();
                    activeRoute.moveIndex(1);
                    let next=activeRoute.getPointAt();
                    this.props.pageContext.getMapHolder().setCenter(next);

                }
            },
            {
                name:'WpPrevious',
                storeKeys:activeRoute.getStoreKeys({watchDistance:keys.nav.anchor.watchDistance}),
                updateFunction: (state)=> {
                    return {
                        disabled:!StateHelper.hasPointAtOffset(state,-1),
                        visible: StateHelper.hasRoute(state) && ! (state.watchDistance !== undefined)
                    }
                },
                onClick:()=>{
                    self.wpTimer.startTimer();
                    activeRoute.moveIndex(-1);
                    let next=activeRoute.getPointAt();
                    this.props.pageContext.getMapHolder().setCenter(next);
                }
            }
        ];
        activeRoute.setIndexToTarget();
        this.wpTimer=GuiHelpers.lifecycleTimer(this,()=>{
            this.showWpButtons(false);
        },store.getData(keys.properties.wpButtonTimeout)*1000);
        GuiHelpers.keyEventHandler(this,(component,action)=>{
            if (action == "centerToTarget"){
                return setCenterToTarget(this.props.pageContext);
            }
            if (action == "navNext"){
                return navNext();
            }
            if (action == "toggleNav"){
                this.navToWp(!activeRoute.hasActiveTarget(),store)
            }
        },"page",["centerToTarget","navNext","toggleNav"])
        if (store.getData(keys.properties.mapLockMode) === 'center'){
            this.props.pageContext.getMapHolder().setBoatOffset();
        }
    }
    navToWp(on,store){
        if(on){
            let center = store.getData(keys.map.centerPosition);
            let current=activeRoute.getCurrentTarget();
            let wp=new navobjects.WayPoint();
            //take over the wp name if this was a normal wp with a name
            //but do not take over if this was part of a route
            if (current && current.name && current.name !== navobjects.WayPoint.MOB ){
                wp.name=current.name;
            }
            else{
                wp.name = 'Marker';
            }
            wp.routeName=undefined;
            center.assign(wp);
            RouteHandler.wpOn(wp);
            return;
        }
        RouteHandler.routeOff();
        this.props.pageContext.getMapHolder().triggerRender();
    }
    widgetClick(item,data,panel,invertEditDirection){
        let pagePanels=LayoutHandler.getPagePanels(PAGENAME);
        let idx=pagePanels.indexOf(OVERLAYPANEL);
        if (idx >=0){
            pagePanels.splice(idx,1);
        }
        if (EditWidgetDialog.createDialog(item,PAGENAME,panel,{fixPanel:pagePanels,beginning:invertEditDirection,types:["!map"]})) return;
        if (item.name == "AisTarget"){
            let mmsi=(data && data.mmsi)?data.mmsi:item.mmsi;
            if (! mmsi) return;
            this.props.history.push("aisinfopage",{mmsi:mmsi});
            return;
        }
        if (item.name == "ActiveRoute"){
            if (!activeRoute.hasRoute()) return;
            activeRoute.setIndexToTarget();
            activeRoute.syncTo(RouteEdit.MODES.EDIT);
            this.props.history.push("editroutepage");
            return;
        }
        if (item.name == "Zoom"){
            this.props.pageContext.getMapHolder().checkAutoZoom(true);
            return;
        }
        if (panel && panel.match(/^bottomLeft/)){
            activeRoute.setIndexToTarget();
            this.showWpButtons(true);
            return;
        }
        this.props.history.push("gpspage",{widget:item.name});

    };
    showWpButtons(on){
        if (on) {
            this.wpTimer.startTimer();
        }
        else {
            this.wpTimer.stopTimer();
        }
        this.setState({showWpButtons:on})
    }
    mapEvent(evdata){
        console.log("mapevent: "+evdata.type);
        if (evdata.type === this.props.pageContext.getMapHolder().EventTypes.SELECTAIS){
            let aisparam=evdata.aisparam;
            if (!aisparam) return;
            if (aisparam.mmsi){
                this.props.history.push('aisinfopage',{mmsi:aisparam.mmsi});
                return true;
            }
            return;
        }
        if (evdata.type === this.props.pageContext.getMapHolder().EventTypes.FEATURE){
            let feature=evdata.feature;
            if (! feature) return;
            feature.additionalActions=[];
            feature.additionalInfoRows=[];
            const showFeature=()=>{
                if (feature.nextTarget && ! feature.activeRoute) {
                    feature.additionalActions.push(
                        {
                            name: 'goto', label: 'Goto', onClick: () => {
                                let target = feature.nextTarget;
                                if (!target) return;
                                let wp = new navobjects.WayPoint(target[0], target[1], feature.name);
                                RouteHandler.wpOn(wp);
                            }
                        }
                    );
                }
                FeatureInfoDialog.showDialog(this.props.history,feature);
            }
            if (feature.overlayType === 'route' && ! feature.activeRoute){
                let currentRouteName=activeRoute.getRouteName();
                if (Helper.getExt(currentRouteName) !== 'gpx') currentRouteName+='.gpx';
                if (activeRoute.hasActiveTarget() && currentRouteName === feature.overlayName){
                    //do not show a feature pop up if we have an overlay that exactly has the current route
                    return false;
                }
            }
            if (feature.overlayType === 'track'){
                feature.additionalActions.push({
                   name:'toroute',
                   label: 'Convert',
                   onClick:(props)=>{
                       TrackConvertDialog.showDialog(this.props.pageContext, props.overlayName)
                   }
                });
            }
            if (feature.overlayType !== 'route' || ! feature.nextTarget){
                showFeature()
            } else {
                let currentTarget=activeRoute.getCurrentTarget();
                //show a "routeTo" if this is not the current target
                if (! feature.activeRoute || ! currentTarget ||
                    currentTarget.lon !== feature.nextTarget[0]||
                    currentTarget.lat !== feature.nextTarget[1]
                ) {
                    feature.additionalActions.push({
                        name: 'routeTo',
                        label: 'Route',
                        onClick: (props) => {
                            RouteHandler.wpOn(props.routeTarget);
                        },
                        condition: (props) => props.routeTarget
                    });
                }
                feature.additionalActions.push({
                    name:'editRoute',
                    label:'Edit',
                    onClick:()=>{
                        RouteHandler.fetchRoute(feature.overlayName,false,
                            (route)=>{
                                let idx=route.findBestMatchingIdx(feature.nextTarget);
                                let editor=new RouteEdit(RouteEdit.MODES.EDIT);
                                editor.setNewRoute(route,idx >= 0?idx:undefined);
                                this.props.history.push("editroutepage");
                            },
                            (error)=> {
                                if (error) Toast(error);
                            });
                    }
                });
                showFeature();
            }
            return true;
        }
    }
    componentWillUnmount(){
        let store=this.props.pageContext.getStore();
        store.storeData(keys.map.measurePosition,undefined);
        this.props.pageContext.getMapHolder().unregisterPageWidgets(PAGENAME);
    }
    componentDidMount(){
        this.props.pageContext.getMapHolder().showEditingRoute(false);
    }
    getButtons(){
        let store=this.props.pageContext.getStore();
        let rt=[
            {
                name: "ZoomIn",
                onClick:()=>{this.props.pageContext.getMapHolder().changeZoom(1)}
            },
            {
                name: "ZoomOut",
                onClick:()=>{this.props.pageContext.getMapHolder().changeZoom(-1)}
            },
            {
                name: "LockPos",
                storeKeys:{
                    toggle: keys.map.lockPosition
                },
                updateFunction:(state)=>{
                    return state;
                },
                onClick:()=>{
                    let old=store.getData(keys.map.lockPosition);
                    if (! old){
                        let lockMode=store.getData(keys.properties.mapLockMode,'center');
                        if ( lockMode === 'ask'){
                            showLockDialog(this.props.pageContext);
                            return;
                        }
                        if (lockMode === 'current'){
                            if (! setBoatOffset(this.props.pageContext)) return;
                        }
                        else{
                            this.props.pageContext.getMapHolder().setBoatOffset();
                        }
                    }
                    this.props.pageContext.getMapHolder().setGpsLock(!old);
                },
                editDisable:true
            },
            {
                name: "LockMarker",
                storeKeys: activeRoute.getStoreKeys(),
                updateFunction:(state)=>{
                    return {visible:!StateHelper.hasActiveTarget(state)}
                },
                onClick:()=>{
                    this.navToWp(true,store);
                },
                editDisable: true
            },
            {
                name: "StopNav",
                storeKeys: activeRoute.getStoreKeys(),
                updateFunction:(state)=>{
                    return {visible:StateHelper.hasActiveTarget(state)};
                },
                toggle:true,
                onClick:()=>{
                    this.navToWp(false,store);
                },
                editDisable:true
            },
            {
                name: "CourseUp",
                storeKeys:{
                    toggle: keys.map.courseUp
                },
                onClick:()=>{
                    this.props.pageContext.getMapHolder().setCourseUp(!store.getData(keys.map.courseUp,false))
                },
                editDisable:true
            },
            {
                name: "ShowRoutePanel",
                onClick:()=>{
                    if (activeRoute.getIndex() < 0 ) activeRoute.setIndexToTarget();
                    activeRoute.syncTo(RouteEdit.MODES.EDIT);
                    this.props.history.push("editroutepage");
                },
                overflow: true

            },
            {
                name: "NavOverlays",
                onClick:()=>overlayDialog(this.props.pageContext),
                overflow: true,
                storeKeys:{
                    visible:keys.gui.capabilities.uploadOverlays
                }
            },
            {
                name:'GpsCenter',
                onClick:()=>{
                    this.props.pageContext.getMapHolder().centerToGps();

                },
                overflow: true,
                editDisable: true
            },
            {
                name: 'Night',
                storeKeys: {
                    toggle: keys.properties.nightMode,
                    visible: keys.properties.nightModeNavPage
                },
                onClick: ()=> {
                    let mode = store.getData(keys.properties.nightMode, false);
                    mode = !mode;
                    store.storeData(keys.properties.nightMode, mode);
                },
                overflow: true
            },
            {
                name: 'Measure',
                storeKeys: {
                    toggle: keys.map.measurePosition,
                    visible: keys.properties.showMeasure
                },
                overflow: true,
                onClick: ()=>{
                    let current=store.getData(keys.map.measurePosition);
                    if (current){
                        store.storeData(keys.map.measurePosition,undefined);
                        this.props.pageContext.getMapHolder().triggerRender();
                        return;
                    }
                    if (this.props.pageContext.getMapHolder().getGpsLock()) return;
                    let center = store.getData(keys.map.centerPosition);
                    store.storeData(keys.map.measurePosition,center);
                    this.props.pageContext.getMapHolder().triggerRender();
                }
            },
            Mob.mobDefinition(this.props.pageContext),
            EditPageDialog.getButtonDef(PAGENAME,
                MapPage.PANELS,
                [LayoutHandler.OPTIONS.SMALL,LayoutHandler.OPTIONS.ANCHOR]),
            {
                name: 'NavMapWidgets',
                editOnly: true,
                overflow: true,
                onClick: ()=>OverlayDialog.dialog((props)=><MapWidgetsDialog
                    store={store}
                    {...props}/>)
            },
            LayoutFinishedDialog.getButtonDef(),
            RemoteChannelDialog({overflow:true}),
            FullScreen.fullScreenDefinition,
            Dimmer.buttonDef(),
            {
                name: 'Cancel',
                onClick: ()=>{this.props.history.pop()}
            }
        ];
        return rt;
    }
    registerMapWidget(widget,callback){
        this.props.pageContext.getMapHolder().registerMapWidget(PAGENAME,widget,callback);
    }
    render(){
        let self=this;
        let store=this.props.pageContext.getStore();
        let autohide=undefined;
        if (store.getData(keys.properties.autoHideNavPage) && ! this.state.showWpButtons && ! store.getData(keys.gui.global.layoutEditing)){
            autohide=store.getData(keys.properties.hideButtonTime,30)*1000;
        }
        let pageProperties=Helper.filteredAssign(MapPage.propertyTypes,self.props);
        return (
            <MapPage
                {...pageProperties}
                id={PAGENAME}
                mapEventCallback={self.mapEvent}
                onItemClick={self.widgetClick}
                panelCreator={getPanelList}
                overlayContent={ (props)=>
                    <React.Fragment>
                        {this.state.showWpButtons?<ButtonList
                            itemList={self.waypointButtons}
                            className="overlayContainer"
                        />:null}
                        <ItemList
                            className={'mapWidgetContainer widgetContainer'}
                            itemCreator={(widget)=>{
                                let widgetConfig=WidgetFactory.findWidget(widget) || {};
                                let key=widget.key;
                                return WidgetFactory.createWidget(widget,
                                    {
                                        handleVisible:!store.getData(keys.gui.global.layoutEditing),
                                        registerMap: (callback)=>this.registerMapWidget({
                                            name: key,
                                            storeKeys: widgetConfig.storeKeys
                                        },callback),
                                        triggerRender: ()=>this.props.pageContext.getMapHolder().triggerRender()
                                    }
                                )
                            }}
                            itemList={getPanelWidgets(OVERLAYPANEL,store)}
                        />
                    </React.Fragment>}
                buttonList={self.getButtons()}
                preventCenterDialog={(self.props.options||{}).remote}
                autoHideButtons={autohide}
                />
        );
    }
}

export default NavPage;