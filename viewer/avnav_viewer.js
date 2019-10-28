/*
# vim: ts=2 sw=2 et
###############################################################################
# Copyright (c) 2014, Andreas Vogel andreas@wellenvogel.net
# parts of software from movable-type
# http://www.movable-type.co.uk/
# for their license see the file latlon.js
#
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the "Software"),
#  to deal in the Software without restriction, including without limitation
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,
#  and/or sell copies of the Software, and to permit persons to whom the
#  Software is furnished to do so, subject to the following conditions:
#
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
#
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#  DEALINGS IN THE SOFTWARE.
###############################################################################

icons partly from http://www.tutorial9.net/downloads/108-mono-icons-huge-set-of-minimal-icons/
                  http://ionicons.com/ (MIT license)
*/

avnav.provide('avnav.main');

var NavData=require('./nav/navdata');
var React=require('react');
var ReactDOM=require('react-dom');
var OverlayDialog=require('./components/OverlayDialog.jsx');
var propertyHandler=require('./util/propertyhandler');
ol.DEFAULT_TILE_CACHE_HIGH_WATER_MARK=256;
var MainPage=require('./gui/MainPage.jsx');





function getParam(key)
{
    // Find the key and everything up to the ampersand delimiter
    var value=RegExp(""+key+"[^&]+").exec(window.location.search);

    // Return the unescaped value minus everything starting from the equals sign or an empty string
    return unescape(!!value ? value.toString().replace(/^[^=]+./,"") : "");
}

/**
 * main function called when dom is loaded
 *
 */
avnav.main=function() {
    //some workaround for lees being broken on IOS browser
    //less.modifyVars();
    $("body").show();

    if (getParam('log')) avnav.debugMode=true;
    propertyHandler.loadUserData();
    var navurl=getParam('navurl');
    if (navurl){
        propertyHandler.setValueByName('navUrl',navurl);
        propertyHandler.setValueByName('routingServerError',false);
    }
    else {
        propertyHandler.setValueByName('routingServerError',true);
    }
    var navdata=new NavData(propertyHandler);
    var mapholder=new avnav.map.MapHolder(propertyHandler,navdata);
    var gui=new avnav.gui.Handler(propertyHandler,navdata,mapholder);

    if (getParam('onAndroid')){
        propertyHandler.setValueByName('onAndroid',true);
    }
    else {
        propertyHandler.setValueByName('onAndroid',false);
    }
    var ro="readOnlyServer";
    if (getParam(ro) && getParam(ro) == "true"){
        propertyHandler.setValueByName(ro,true);
        propertyHandler.setValueByName('connectedMode',false);
    }
    else{

        propertyHandler.setValueByName(ro,false);
    }
    if (avnav_version !== undefined){
        $('#avi_mainpage_version').text(avnav_version);
    }
    //make the android API available as avnav.android
    if (window.avnavAndroid){
        avnav.log("android integration enabled");
        propertyHandler.setValueByName('onAndroid',true);
        avnav.android=window.avnavAndroid;
        propertyHandler.setValueByName('routingServerError',false);
        propertyHandler.setValueByName('connectedMode',true);
        $('#avi_mainpage_version').text(avnav.android.getVersion());
        avnav.android.applicationStarted();
    }
    ReactDOM.render(React.createElement(OverlayDialog,{
            showCallback: function(id){gui.addActiveInput(id);},
            hideCallback: function(id){gui.removeActiveInput(id);}
        }),
        document.getElementById('avi_dialog_container'));

    ReactDOM.render(React.createElement(MainPage,{}),document.getElementById('avi_new_pages'));

    avnav.guiHandler=gui; //intermediate...
    gui.showPage("mainpage");
    //ios browser sometimes has issues with less...
    setTimeout(function(){
        propertyHandler.updateLayout();
        $(document).trigger(avnav.util.PropertyChangeEvent.EVENT_TYPE,new avnav.util.PropertyChangeEvent(propertyHandler));
    },1000);
    avnav.log("avnav loaded");
};

