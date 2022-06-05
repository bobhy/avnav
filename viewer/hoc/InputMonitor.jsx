/*
 * monitors a component to be included in the list of active
 * inputs
 */

import React from 'react';


let activeInputs={};
let currentId=0;

export default  function(Component){
    class InputMonitor extends React.Component{
        constructor(props){
            super(props);
            this.id=0;
        }
        componentDidMount(){
            currentId++;
            this.id=currentId;
            activeInputs[this.id]=true;
        }
        componentWillUnmount(){
            delete activeInputs[this.id];
        }
        render(){
            return <Component {...this.props}/>
        }
    };
    return InputMonitor;
};

export const hasActiveInputs=()=>{
    return Object.keys(activeInputs).length > 0;
}