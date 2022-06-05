import React from 'react';
import PropTypes from 'prop-types';
import Headline from './Headline.jsx';
import ButtonList from './ButtonList.jsx';
import {hideToast} from '../components/Toast.jsx';
import WidgetFactory from './WidgetFactory.jsx';
import globalStore from '../util/globalstore.jsx';
import keys from '../util/keys.jsx';
import KeyHandler from '../util/keyhandler.js';
import AlarmHandler from '../nav/alarmhandler.js';
import Dynamic from '../hoc/Dynamic.jsx';
import GuiHelpers from "../util/GuiHelpers";
import assign from 'object-assign';
import {hasActiveInputs} from "../hoc/InputMonitor";

const alarmClick =function(){
    let alarms=globalStore.getData(keys.nav.alarms.all,"");
    if (! alarms) return;
    for (let k in alarms){
        if (!alarms[k].running)continue;
        AlarmHandler.stopAlarm(k);
    }
};

class Page extends React.Component {
    constructor(props){
        super(props);
        let store=this.props.pageContext.getStore();
        this.alarmWidget=WidgetFactory.createWidget({name:'Alarm'});
        this.userEvent=this.userEvent.bind(this);
        this.timerCallback=this.timerCallback.bind(this);
        this.timer=GuiHelpers.lifecycleTimer(this,this.timerCallback,1000,true);
        this.lastUserAction=(new Date()).getTime();
        this.state={
            hideButtons:false,
            connectionLost:globalStore.getData(keys.nav.gps.connectionLost)
        }
        GuiHelpers.storeHelper(this,store,(data)=>{
            this.setState(data)
        },{connectionLost: keys.nav.gps.connectionLost});
    }
    timerCallback(sequence){
        if (this.props.autoHideButtons !== undefined){
            let now=(new Date()).getTime();
            if (hasActiveInputs()){
                this.lastUserAction=now;
            }
            if (! this.state.hideButtons) {
                if (this.lastUserAction < (now - this.props.autoHideButtons)) {
                    this.setState({hideButtons: true})
                    if (this.props.buttonWidthChanged) this.props.buttonWidthChanged();
                }
            }
        }
        this.timer.startTimer(sequence);
    }
    userEvent(ev){
        this.lastUserAction=(new Date()).getTime();
        if (this.state.hideButtons && ev.type === 'click'){
            window.setTimeout(()=>{
                this.setState({hideButtons:false});
                if (this.props.buttonWidthChanged) this.props.buttonWidthChanged();
            },1);
        }
    }
    ButtonShade(){
        return Dynamic((props)=>{
            let {buttonWidth,showShade,...forward}=props;
            let style={
                width: buttonWidth
            };
            let className="buttonShade";
            if (showShade) className+=" shade";
            return <div className={className} style={style} {...forward}/>;
        },this.props.pageContext.getStore(),{
            storeKeys:{
                buttonWidth: keys.gui.global.computedButtonWidth,
                showShade: keys.properties.showButtonShade
            }
        });
    }
    render() {
        let Buttons=Dynamic(ButtonList,this.props.pageContext.getStore(),
            {storeKeys:ButtonList.storeKeys});
        let Shade=this.ButtonShade();
        let props=this.props;
        let className = "page";
        let hideButtons=this.state.hideButtons && props.autoHideButtons;
        if (hideButtons) className+=" hiddenButtons";
        if (props.isEditing) className+=" editing";
        if (props.className) className += " " + props.className;
        let Alarm=this.alarmWidget;
        return <div className={className} id={props.id} style={props.style}
                    onClick={this.userEvent}
                    onTouchMove={this.userEvent}
                    onTouchStart={this.userEvent}
                    onMouseMove={this.userEvent}
                    onWheel={this.userEvent}
            >
            {props.floatContent && props.floatContent}
            <div className="leftPart">
                {props.title ? <Headline title={props.title} connectionLost={this.state.connectionLost}/> : null}
                {props.mainContent ? props.mainContent : null}
                {props.bottomContent ? props.bottomContent : null}
                <Alarm onClick={alarmClick}/>
            </div>
            {! hideButtons && <Buttons itemList={props.buttonList} widthChanged={props.buttonWidthChanged}/>}
            { hideButtons && <Shade onClick={
                (ev)=>{
                    ev.stopPropagation();
                    ev.preventDefault();
                    this.userEvent(ev);
                }
            }/>}
        </div>
    }
    componentDidMount(){
        KeyHandler.setPage(this.props.id);
    }
    componentWillUnmount(){
        hideToast();
    }

}

Page.pageProperties={
    className: PropTypes.string,
    style: PropTypes.object,
    location: PropTypes.string.isRequired,
    options: PropTypes.object,
    pageContext: PropTypes.object.isRequired,
    small: PropTypes.bool.isRequired
}
Page.propTypes=assign({},Page.pageProperties,{
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    mainContent: PropTypes.any,
    floatContent: PropTypes.any,
    bottomContent: PropTypes.any,
    buttonList: PropTypes.any,
    style: PropTypes.object,
    isEditing: PropTypes.bool,
    buttonWidthChanged: PropTypes.func,
    autoHideButtons: PropTypes.any // number of ms or undefined
});



export default Page;