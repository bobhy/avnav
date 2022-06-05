/**
 * Created by andreas on 02.05.14.
 */

import Button from '../components/Button.jsx';
import ItemList from '../components/ItemList.jsx';
import keys from '../util/keys.jsx';
import React from 'react';
import Page from '../components/Page.jsx';
import Toast from '../components/Toast.jsx';
import Requests from '../util/requests.js';
import base from '../base.js';
import chartImage from '../images/Chart60.png';
import GuiHelper from '../util/GuiHelpers.js';
import LayoutFinishedDialog from '../components/LayoutFinishedDialog.jsx';
import Mob from '../components/Mob.js';
import Addons from '../components/Addons.js';
import EditOverlaysDialog, {DEFAULT_OVERLAY_CHARTENTRY} from '../components/EditOverlaysDialog.jsx';
import FullScreen from '../components/Fullscreen';
import RemoteChannelDialog from "../components/RemoteChannelDialog";
import {RecursiveCompare} from '../util/compare';



const getImgSrc=function(color,store){
    if (color == "red") return store.getData(keys.properties.statusErrorImage);
    if (color == "green") return store.getData(keys.properties.statusOkImage);
    if (color == "yellow")return store.getData(keys.properties.statusYellowImage);
};

class BottomLine extends React.Component {
        constructor(props) {
            super(props);
            this.state = {status:{}};
            this.timer = GuiHelper.lifecycleTimer(this,
                this.timerCall,
                this.props.store.getData(keys.properties.positionQueryTimeout), true);
            this.timerCall = this.timerCall.bind(this);
            GuiHelper.storeHelperState(this,this.props.store,{
                valid: keys.nav.gps.valid,
                connectionLost: keys.nav.gps.connectionLost
            })
        }

        timerCall(sequence) {
            Requests.getJson("?request=nmeaStatus")
                .then((json)=> {
                    this.timer.guardedCall(sequence,()=> {
                        this.setState({status: json.data});
                        this.timer.startTimer(sequence);
                    });
                })
                .catch((error)=> {
                    this.timer.guardedCall(sequence,()=> {
                        this.setState({status: {}});
                        this.timer.startTimer(sequence);
                    });
                })
        }

        render() {
            //we have the raw nmea in "raw"
            let nmeaColor = !this.state.connectionLost ? "yellow" : "red";
            let aisColor = !this.state.connectionLost ? "yellow" : "red";
            let nmeaText = !this.state.connectionLost ? "" : "server connection lost";
            let aisText = "";
            if (!this.state.connectionLost) {
                if (this.state.status && this.state.status.nmea) {
                    nmeaColor = this.state.status.nmea.status;
                    nmeaText = this.state.status.nmea.source + ":" + this.state.status.nmea.info;
                }
                if (this.state.status && this.state.status.ais) {
                    aisColor = this.state.status.ais.status;
                    aisText = this.state.status.ais.source + ":" + this.state.status.ais.info;
                }
            }
            return (
                <div className='footer'>
                    <div className='inner'>
                        <div className='status'>
                            <div >
                                <img className='status_image' src={getImgSrc(nmeaColor,this.props.store)}/>
                                NMEA&nbsp;{nmeaText}
                            </div>
                            {!this.state.connectionLost ? <div >
                                <img className='status_image' src={getImgSrc(aisColor,this.props.store)}/>
                                AIS&nbsp;{aisText}
                            </div> : null
                            }
                        </div>
                        <div className="link">
                            <div > AVNav Version <span >{avnav.version}</span></div>
                            <div><a href="http://www.wellenvogel.de/software/avnav/index.php" className="extLink">www.wellenvogel.de/software/avnav/index.php</a>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    };


class MainPage extends React.Component {
    constructor(props) {
        super(props);
        let store=this.props.pageContext.getStore();
        this.state={
            chartList:[],
            addOns:[],
            selectedChart:0,
            sequence:0,
            overlays:{}
        };
        this.fillList=this.fillList.bind(this);
        GuiHelper.storeHelper(this,store,(data)=>{
            this.readAddOns();
        },{sequence:keys.gui.global.reloadSequence},2);
        GuiHelper.storeHelper(this,store,(data)=>{
            this.fillList();
        },{sequence:keys.gui.global.reloadSequence});
        this.timer=GuiHelper.lifecycleTimer(this,(sequence)=>{
            this.fillList(sequence);
        },3000,true);
        let self=this;
        this.selectChart(0);
        GuiHelper.keyEventHandler(this,(component,action)=>{
            if (action == "selectChart"){
                let chartlist=this.state.chartList;
                let selected=this.state.selectedChart||0;
                if (chartlist && chartlist[selected]){
                    this.showNavpage(chartlist[selected]);
                }
            }
            if (action == "nextChart"){
                self.selectChart(1);
            }
            if (action == "previousChart"){
                self.selectChart(-1);
            }
        },"page",["selectChart","nextChart","previousChart"]);
        this.showNavpage=this.showNavpage.bind(this);
        this.ChartItem=this.ChartItem.bind(this);

    }

    /**
     * the click handler for the charts
     * @param entry - the chart entry
     */
    showNavpage(entry) {
        base.log("activating navpage with url " + entry.url);
        this.props.pageContext.getMapHolder().setChartEntry(entry);
        this.props.history.push('navpage');
    };


    getButtons() {
        let store=this.props.pageContext.getStore();
        return [
            {
                name: 'ShowStatus',
                onClick: ()=> {
                    this.props.history.push('statuspage')
                },
                editDisable: true
            },
            {
                name: 'ShowSettings',
                onClick: ()=> {
                    this.props.history.push('settingspage')
                },
                overflow: true
            },
            {
                name: 'ShowDownload',
                onClick: ()=> {
                    this.props.history.push('downloadpage')
                },
                editDisable: true
            },
            {
                name: 'Connected',
                storeKeys: [keys.gui.global.onAndroid, keys.properties.connectedMode, keys.gui.capabilities.canConnect],
                updateFunction: (state, skeys) => {
                    return {
                        visible: !state[keys.gui.global.onAndroid] && state[keys.gui.capabilities.canConnect] == true,
                        toggle: state[keys.properties.connectedMode]
                    }
                },
                onClick: ()=> {
                    let con = store.getData(keys.properties.connectedMode, false);
                    con = !con;
                    store.storeData(keys.properties.connectedMode, con);
                },
                editDisable: true,
                overflow: true
            },
            {
                name: 'ShowGps',
                onClick: ()=> {
                    this.props.history.push('gpspage')
                }
            },
            {
                name: 'Night',
                storeKeys: {toggle: keys.properties.nightMode},
                onClick: ()=> {
                    let mode = store.getData(keys.properties.nightMode, false);
                    mode = !mode;
                    store.storeData(keys.properties.nightMode, mode);
                }
            },
            Mob.mobDefinition(this.props.pageContext),
            LayoutFinishedDialog.getButtonDef(),

            {
                name: 'NavOverlays',
                onClick: ()=> {
                    EditOverlaysDialog.createDialog(DEFAULT_OVERLAY_CHARTENTRY);
                },
                editDisable: true,
                overflow: true,
                storeKeys: {
                    visible: keys.gui.capabilities.uploadOverlays,
                    connected: keys.properties.connectedMode
                },
                updateFunction: (state)=>{
                    return {
                        visible: state.visible && state.connected
                    }
                }
            },
            {
                name: 'MainAddOns',
                onClick: ()=> {
                    this.props.history.push('addonpage')
                },
                visible: this.state.addOns.length > 0,
                editDisable: true
            },
            RemoteChannelDialog({overflow:true}),
            FullScreen.fullScreenDefinition,
            {
                name: 'Cancel',
                storeKeys: {visible: keys.gui.global.onAndroid},
                onClick: ()=> {
                    if (avnav.android) avnav.android.goBack()
                }

            }
        ];
    }

    ChartItem(props){
        let store=this.props.pageContext.getStore();
        let self=this;
        let cls="chartItem";
        if (props.selected) cls+=" activeEntry";
        if (props.originalScheme) cls+=" userAction";
        cls+=props.hasOverlays?" withOverlays":" noOverlays";
        let isConnected=store.getData(keys.properties.connectedMode,false);
        return (
            <div className={cls} onClick={props.onClick}>
                <img src={props.icon||chartImage}/>
                <span className="chartName">{props.name}</span>
                {isConnected && <Button
                    className="smallButton"
                    name="MainOverlays"
                    onClick={(ev)=>{
                        ev.stopPropagation();
                        EditOverlaysDialog.createDialog(props,()=>{
                            self.fillList();
                        });
                    }}
                />}
            </div>
        );
    };


    componentDidMount() {
        let store=this.props.pageContext.getStore();
        store.storeData(keys.gui.global.soundEnabled,true);
    }

    selectChart(offset){
        let len=(this.state.chartList||[]).length;
        let currentIndex=this.state.selectedChart;
        let newIndex=currentIndex+offset;
        if (newIndex >= len){
            newIndex=0;
        }
        if (newIndex < 0){
            newIndex=0;
        }
        if (newIndex != currentIndex){
            this.setState({selectedChart:newIndex});
        }
    };

    readOverlays(newChartList){
        return Requests.getJson('',{},{
            request:'api',
            type:'chart',
            command:'listOverlays'
        })
            .then((json)=>{
                let overlays={};
                for (let i in json.data){
                    let overlay=json.data[i];
                    overlays[overlay.name]=overlay;
                }
                for (let i in newChartList){
                    newChartList[i].hasOverlays=!!overlays[newChartList[i].overlayConfig];
                }
                return{overlays:overlays,chartList:newChartList};
            },(e)=>{return {chartList:newChartList}})

    }
    fillList(sequence) {
        let store=this.props.pageContext.getStore();
        let mapholder=this.props.pageContext.getMapHolder();
        Requests.getJson("?request=list&type=chart",{timeout:3*parseFloat(store.getData(keys.properties.networkTimeout))}).then((json)=>{
                let items = [];
                let current=mapholder.getBaseChart();
                let lastChartKey=current?current.getChartKey():mapholder.getLastChartKey();
                let i=0;
                let selectedChart;
                json.items.sort((a,b)=>{
                    let nameA = (a.name).toUpperCase();
                    let nameB = (b.name).toUpperCase();
                    if (nameA < nameB) {
                        return -1;
                    }
                    if (nameA > nameB) {
                        return 1;
                    }
                    return 0;
                })
                for (let e in json.items) {
                    let chartEntry = json.items[e];
                    if (!chartEntry.key) chartEntry.key=chartEntry.chartKey||chartEntry.url;
                    chartEntry.hasOverlays=!!this.state.overlays[chartEntry.overlayConfig];
                    if (lastChartKey === chartEntry.key){
                        selectedChart=i;
                    }
                    items.push(chartEntry);
                    i++;
                }
                let newState={};
                if (selectedChart === undefined && items.length > 0){
                    selectedChart=0;
                    current=undefined; //it seems that the last chart from the mapholder is not available any more
                                       //just set the first chart
                }
                if (selectedChart !== undefined) {
                    newState.selectedChart=selectedChart;
                    //if current is undefined we have just started
                    //just set the chart entry at the mapholder
                    if (! current) mapholder.setChartEntry(items[selectedChart]);
                }
                if (newState.selectedChart !== this.state.selectedChart)  this.setState(newState);
                this.readOverlays(items).then((newState)=>{
                    this.setState((state,props)=>{
                        let rt={};
                        if (! RecursiveCompare(state.chartList,newState.chartList)){
                            rt.chartList=newState.chartList;
                        }
                        if (!RecursiveCompare(state.overlays,newState.overlays)) rt.overlays=newState.overlays;
                        if (! rt.chartList && ! rt.overlays) return null;
                        return rt;
                    });
                    if (sequence !== undefined) this.timer.startTimer(sequence);
                });
            },
            (error)=>{
                Toast("unable to read chart list: "+error);
                if (sequence !== undefined) this.timer.startTimer(sequence);
            });

    };
    readAddOns() {
        Addons.readAddOns(true)
            .then((items)=>{
                this.setState({addOns: items});
            })
            .catch(()=>{});
    };


    render() {
        let self = this;
        let store=this.props.pageContext.getStore();
        return (
            <Page
                {...self.props}
                  id="mainpage"
                  title="AvNav"
                  mainContent={
                    <ItemList className="mainContent"
                               itemClass={this.ChartItem}
                               onItemClick={this.showNavpage}
                               itemList={this.state.chartList}
                               selectedIndex={this.state.selectedChart}
                               scrollable={true}
                               listRef={(list)=>{
                                    if (!list) return;
                                    let selected=list.querySelector('.activeEntry');
                                    let mode=GuiHelper.scrollInContainer(list,selected);
                                    if (mode < 1 || mode > 2) return;
                                    selected.scrollIntoView(mode==1);
                               }}
                        />
                        }
                  bottomContent={
                    <BottomLine
                        store={store}
                    />
                    }
                  buttonList={self.getButtons()}
                  dummy={self.state.status}
                />
        );


    }


}







export default MainPage;