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
        this.props.history.reset(); //reset history if we reach the mainpage
    }
}
const pages = {
    mainpage: MainWrapper,
    infopage: InfoPage,
    gpspage: GpsPage,
    aispage: AisPage,
    aisinfopage: AisInfoPage,
    addonpage: AddOnPage,
    addresspage: AddressPage,
    statuspage: StatusPage,
    wpapage: WpaPage,
    routepage: RoutePage,
    downloadpage: DownloadPage,
    settingspage: SettingsPage,
    navpage: NavPage,
    editroutepage: EditRoutePage,
    warningpage: WarningPage,
    viewpage: ViewPage,
    addonconfigpage: AddonConfigPage
};

export const getPageForName=(name, isMain)=>{
    return pages[name];
}
export const isMainPage=(name)=>{
    return true;
}