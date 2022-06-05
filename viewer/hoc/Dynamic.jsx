/*
 * add updates from the store to components
 * it adds 2 properties to the component:
 * storeKeys: either an array of keys or an object with the keys being the keys of state and the values the store keys
 * and the values being the keys for the state
 * updateFunction: optional - a function that will receive the values as fetched from the store
 * (possibly already translated if storeKeys was an object) and the list of keys and must return the new state
 */

import React from 'react';
import assign from 'object-assign';



export default  function(Component,store,opt_options){
    class Dynamic extends React.Component{
        constructor(props){
            super(props);
            this.getTranslatedStoreValues=this.getTranslatedStoreValues.bind(this);
            this.getStoreKeys=this.getStoreKeys.bind(this);
            this.dataChanged=this.dataChanged.bind(this);
            let keys=this.getStoreKeys();
            if (! store || ! store.register){
                console.trace("invalid store - no register");
            }
            if (! store || ! store.deregister){
                console.trace("invalid store - no deregister");
            }
            if (keys) store.register(this,keys);
            this.lastUpdate=0;
            this.state=this.getTranslatedStoreValues();
            this.updateCallback(this.state);
            this.timer=undefined;
        }
        updateCallback(data){
            this.lastUpdate=(new Date()).getTime();
            let updateFunction=this.props.changeCallback;
            if (! updateFunction && opt_options) updateFunction=opt_options.changeCallback;
            if (! updateFunction) return;
            let {storeKeys,uf,changeCallback,...forwardProps}=this.props;
            let childprops=assign({},forwardProps,data);
            updateFunction(childprops);
        }
        getStoreKeys(){
            let storeKeys=this.props.storeKeys;
            if (opt_options && opt_options.storeKeys) {
                storeKeys=assign({},opt_options.storeKeys,storeKeys);
            }
            if (!storeKeys) return ;
            if (storeKeys instanceof Array) return storeKeys;
            if (storeKeys instanceof Object) return Object.values(storeKeys);
            return [storeKeys];
        }
        getTranslatedStoreValues(){
            if (! this.getStoreKeys()) return {};
            let values=store.getMultiple(this.props.storeKeys||opt_options.storeKeys);
            let updateFunction=this.props.updateFunction;
            if (! updateFunction){
                if (opt_options && opt_options.updateFunction) updateFunction=opt_options.updateFunction;
            }
            if (updateFunction) {
                return updateFunction(values,this.getStoreKeys());
            }
            return values;
            }
        doUpdate(){
            let data=this.getTranslatedStoreValues()||{};
            this.setState(data);
            this.updateCallback(data);
        }
        dataChanged(){
            if (opt_options && opt_options.minTime){
                let now=(new Date()).getTime();
                let tdiff=this.lastUpdate+opt_options.minTime -now;
                if (tdiff > 0){
                    if (this.timer){
                        window.clearTimeout(this.timer);
                        this.timer=undefined;
                    }
                    this.timer=window.setTimeout(()=>{
                        this.timer=undefined;
                        this.doUpdate();
                    },tdiff);
                    return;
                }
            }
            this.doUpdate();
        }
        componentDidMount(){
            let keys=this.getStoreKeys();
            if (!keys) return;
            if (! store || ! store.register){
                console.trace("invalid store - no register");
            }
            store.register(this,keys);
        }
        componentWillUnmount(){
            if (! store || ! store.deregister){
                console.trace("invalid store - no deregister");
            }
            store.deregister(this);
        }
        render(){
            let {storeKeys,updateFunction,changeCallback,...forwardProps}=this.props;
            let childprops=assign({store:store},forwardProps,this.state);
            return <Component {...childprops}/>
        }
    };
    return Dynamic;
};
