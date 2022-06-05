/**
 *###############################################################################
 # Copyright (c) 2012-2020 Andreas Vogel andreas@wellenvogel.net
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
 #  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHERtime
 #  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 #  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 #  DEALINGS IN THE SOFTWARE.
 #
 ###############################################################################
 * prevents onClick to pass through for a guard time after the last map "onclick"
 * openLayers triggers it's click event on pointerUp - but normally the browser
 * will fire a "click" shortly afterwards
 * so with this monitor we can stop click events from passing for a certain time
 */


import React from 'react';

let holders={};
export const registerHolder=(name,holder)=>holders[name]=holder;

const shouldIgnore=()=>{
    for (let n in holders){
        if (holders[n] && holders[n].shouldBlock()) return true;
    }
}

export default  (Component)=>{
    return React.forwardRef((props,ref)=>{
        let {onClick,...forwards}=props;
        let clickHandler=onClick?function() {
            if (shouldIgnore()) {
                return;
            }
            if (props.onClick) {
                props.onClick.apply(this, [...arguments]);
            }
        }:undefined;
        return <Component
                ref={ref}
                onClick={clickHandler}
            {...forwards}
            />
    })
};