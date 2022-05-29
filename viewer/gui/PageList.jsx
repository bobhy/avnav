import InfoPage from "./InfoPage";
import GpsPage from "./GpsPage";
import AisPage from "./AisPage";
import AisInfoPage from "./AisInfoPage";
import AddOnPage from "./AddOnPage";
import AddressPage from "./AddressPage";
import StatusPage from "./StatusPage";
import WpaPage from "./WpaPage";
import RoutePage from "./RoutePage";
import DownloadPage from "./DownloadPage";
import SettingsPage from "./SettingsPage";
import NavPage from "./NavPage";
import EditRoutePage from "./EditRoutePage";
import WarningPage from "./WarningPage";
import ViewPage from "./ViewPage";
import AddonConfigPage from "./AddOnConfigPage";
import React from "react";
import MainPage from "./MainPage";

class MainWrapper extends React.Component{
    constructor(props){
        super(props);
    }
    render(){
        return <MainPage {...this.props}/>
    }
    componentDidMount(){
        this.props.pageContext.getHistory().reset(); //reset history if we reach the mainpage
    }
}
class PageEntry{
    constructor(page,opt_mainOnly) {
        this.page=page;
        this.mainOnly=opt_mainOnly;
    }
}
const pages = {
    mainpage: new PageEntry(MainWrapper),
    infopage: new PageEntry(InfoPage,true),
    gpspage: new PageEntry(GpsPage),
    aispage: new PageEntry(AisPage),
    aisinfopage: new PageEntry(AisInfoPage),
    addonpage: new PageEntry(AddOnPage,true),
    addresspage: new PageEntry(AddressPage,true),
    statuspage: new PageEntry(StatusPage,true),
    wpapage: new PageEntry(WpaPage,true),
    routepage: new PageEntry(RoutePage),
    downloadpage: new PageEntry(DownloadPage,true),
    settingspage: new PageEntry(SettingsPage,true),
    navpage: new PageEntry(NavPage),
    editroutepage: new PageEntry(EditRoutePage),
    warningpage: new PageEntry(WarningPage,true),
    viewpage: new PageEntry(ViewPage),
    addonconfigpage: new PageEntry(AddonConfigPage,true)
};

export const getPageForName=(name, isMain)=>{
    let rt=pages[name];
    if (! rt) return;
    if (rt.mainOnly && ! isMain) return;
    return rt.page;
}
export const allowInSecond=(name)=>{
    let rt=pages[name];
    if (! rt) return false;
    if (rt.mainOnly) return false;
    return true;
}