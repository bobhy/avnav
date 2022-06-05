/**
 * Created by andreas on 02.05.14.
 */

import Dynamic from '../hoc/Dynamic.jsx';
import AisData from '../nav/aisdata.js';
import ItemList from '../components/ItemList.jsx';
import keys from '../util/keys.jsx';
import React from 'react';
import Page from '../components/Page.jsx';
import AisHandler from '../nav/aisdata.js';
import AisFormatter from '../nav/aisformatter.jsx';
import GuiHelpers from '../util/GuiHelpers.js';
import Mob from '../components/Mob.js';
import {Drawing} from '../map/drawing.js';
import MapEventGuard from "../hoc/MapEventGuard";

const displayItems = [
    {name: 'mmsi', label: 'MMSI'},
    {name: 'shipname', label: 'Name'},
    {name: 'callsign', label: 'Callsign'},
    {name: 'distance', label: 'Distance(nm)'},
    {name: 'heading', label: 'HeadingTo'},
    {name: 'cpa', label: 'CPA(nm)'},
    {name: 'tcpa', label: 'TCPA(h:min:sec)'},
    {name: 'speed', label: 'SOG(kn)'},
    {name: 'course', label: 'COG'},
    {name: 'destination', label: 'Destination'},
    {name: 'shiptype', label: 'Type'},
    {name: 'passFront', label: 'we pass', addClass: 'aisFront'},
    {name: 'position', label: 'Position'},
    {name: 'clazz', label: 'Class'},
    {name: 'length', label: 'Length(m)'},
    {name: 'beam',label: 'Beam(m)'},
    {name: 'draught',label: 'Draught(m)'}
];

const createUpdateFunction=(config,mmsi)=>{
    return (state)=>{
        if (!mmsi) return {current:undefined,...config};
        return {current:AisHandler.getAisByMmsi(mmsi),...config};
    }
};
const storeKeys={
    aisSequence:keys.nav.ais.updateCount
};
const createItem=(store,config,mmsi)=>{
    let cl="aisData";
    if (config.addClass)cl+=" "+config.addClass;
    return Dynamic((props)=> {
        return (
        <div className="aisInfoRow">
            <div className='label '>{props.label}</div>
            <div className={cl}>{AisFormatter.format(props.name, props.current)}</div>
        </div>
        );
    },store,{
        storeKeys:storeKeys,
        updateFunction:createUpdateFunction(config,mmsi)

    });
};
const GuardedList=MapEventGuard(ItemList);
class AisInfoPage extends React.Component{
    constructor(props){
        super(props);
        let self=this;
        this.buttons=[
            {
                name: 'AisNearest',
                onClick:()=>{
                    AisHandler.setTrackedTarget(0);
                    let pos=AisHandler.getAisPositionByMmsi(AisHandler.getTrackedTarget());
                    if (pos) this.props.pageContext.getMapHolder().setCenter(pos);
                    self.props.history.pop();
                }
            },
            {
                name: 'AisInfoLocate',
                onClick:()=>{
                    if (!self.props.options || ! self.props.options.mmsi) return;
                    AisData.setTrackedTarget(self.props.options.mmsi);
                    let pos=AisHandler.getAisPositionByMmsi(self.props.options.mmsi);
                    if (pos) {
                        this.props.pageContext.getMapHolder().setCenter(pos);
                        this.props.pageContext.getMapHolder().setGpsLock(false);
                    }
                    self.props.history.pop();
                }
            },
            {
                name: 'AisInfoList',
                onClick:()=>{
                    let mmsi=(this.props.options||{}).mmsi;
                    if (! self.props.history.backFromReplace()) {
                        self.props.history.replace('aispage', {mmsi: mmsi});
                    }
                }
            },
            Mob.mobDefinition(this.props.pageContext),
            {
                name: 'Cancel',
                onClick: ()=>{self.props.history.backFromReplace(true)}
            }
        ];
        this.checkNoTarget=this.checkNoTarget.bind(this);
        this.drawIcon=this.drawIcon.bind(this);
        this.timer=GuiHelpers.lifecycleTimer(this,this.checkNoTarget,5000,true);

    }

    checkNoTarget(timerSequence){
        let mmsi=this.props.options?this.props.options.mmsi:undefined;
        if (! mmsi || ! AisHandler.getAisByMmsi(mmsi)){
            this.props.history.pop();
            return;
        }
        this.timer.startTimer(timerSequence);
    }
    drawIcon(canvas,current){
        let store=this.props.pageContext.getStore();
        if (! canvas) return;
        if (! current) return;
        let drawing=new Drawing({
            coordToPixel:(p)=>{return p;},
            pixelToCoord:(p)=>{return p;}
        },store.getData(keys.properties.style.useHdpi,false));
        let ctx=canvas.getContext('2d');
        drawing.setContext(ctx);
        let rect=canvas.getBoundingClientRect();
        canvas.width=rect.width;
        canvas.height=rect.height;
        this.props.pageContext.getMapHolder().aislayer.drawTargetSymbol(
            drawing,
            [rect.width/2,rect.height/2],
            current,
            (xy,rotation,distance)=>{
                rotation=rotation/180*Math.PI;
                return [
                    rect.width/2*(1+Math.sin(rotation)),
                    rect.height/2*(1-Math.cos(rotation))
                ]
            });
    }

    render(){
        let self=this;
        const Status = function (props) {
            return <canvas className="status" ref={(ctx)=>{self.drawIcon(ctx,props.current)}}/>
        };
        const RenderStatus=Dynamic(Status, this.props.pageContext.getStore());
        //gets mmsi
        const MainContent=(props)=> {
            return(
            <React.Fragment>
                <RenderStatus
                    storeKeys={storeKeys}
                    updateFunction={createUpdateFunction({},props.mmsi)}
                    />
                <GuardedList
                    itemCreator={(config)=>{return createItem(this.props.pageContext.getStore(),
                        config,props.mmsi)}}
                    itemList={displayItems}
                    scrollable={true}
                    className="infoList"
                    onClick={()=>{
                        if (! self.props.history.backFromReplace()) {
                            self.props.history.pop();
                        }
                    }}
                    />

            </React.Fragment>
            );
        };

        return (
            <Page
                {...self.props}
                id="aisinfopage"
                title="AIS Info"
                mainContent={
                            <MainContent
                                mmsi={this.props.options?this.props.options.mmsi:undefined}
                            />
                        }
                buttonList={self.buttons}/>
        );
    }
}

export default AisInfoPage;