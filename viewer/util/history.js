import remotechannel, {COMMANDS} from "./remotechannel";
const REMOTE_CMD=COMMANDS.setPage;
import assign from 'object-assign'

class History{
    constructor(checkFunction){
        this.history=[];
        this.callback=undefined;
        this.pop=this.pop.bind(this);
        this.push=this.push.bind(this);
        this.updateCallback=this.updateCallback.bind(this);
        this.reset=this.reset.bind(this);
        this.replace=this.replace.bind(this);
        this.setOptions=this.setOptions.bind(this);
        this.remoteChannel=remotechannel;
        this.checkFunction=checkFunction;

    }
    setCallback(callback){
        this.callback=callback;
    }
    checkLocation(newLocation){
        if (! this.checkFunction) return true;
        return this.checkFunction(newLocation);
    }
    setFromRemote(location,options){
        if (! this.checkLocation(location)) return;
        this.history.splice(1, this.history.length);
        this.history.push({location:location,options:assign({},options,{remote:true})});
        this.updateCallback(false, true);
    }
    replace(location,options){
        if (! this.checkLocation(location)) return;
        if (this.history.length < 1){
            this.push(location,options);
            return;
        }
        let hentry=this.history[this.history.length - 1];
        this.history.splice(-1,1,{location:location,options:options||{},back:hentry});
        this.updateCallback();
    }
    backFromReplace(opt_popNotFound){
        if (this.history.length < 1) return false;
        let hentry=this.history[this.history.length - 1];
        if (!hentry.back) {
            if (!opt_popNotFound) return false;
            this.pop();
            return true;
        }
        hentry.location=hentry.back.location;
        hentry.options=hentry.back.options;
        hentry.back=hentry.back.back;
        this.updateCallback();
        return true;
    }
    setOptions(options){this.history[this.history.length - 1]
        if (this.history.length < 1){
            return false;
        }
        let hentry=this.history[this.history.length - 1];
        hentry.options=assign({},hentry.options,options);
        this.updateCallback();
    }
    push(location,options){
        if (! this.checkLocation(location)) return;
        this.history.push({location:location,options:options||{}});
        this.updateCallback();
    }
    pop(){
        this.history.splice(-1,1);
        this.updateCallback(true);
    }

    currentLocation(opt_includeOptions){
        if (this.history.length < 1) return;
        if (! opt_includeOptions) {
            return this.history[this.history.length - 1].location;
        }
        else{
            let hentry=this.history[this.history.length - 1];
            return {location: hentry.location,options:hentry.options};
        }
    }

    /**
     * remove all except the first entries
     */
    reset(){
        this.history.splice(1,this.history.length);
        this.updateCallback();
    }

    /**
     *
     * @param opt_returning - legacy support with returning flag
     * @param opt_noremote
     */
    updateCallback(opt_returning, opt_noremote){
        let topEntry={};
        if (this.history.length > 0){
            topEntry=this.history[this.history.length-1];
            if (opt_returning){
                if (! topEntry.options){
                    topEntry.options={};
                }
                topEntry.options.returning=true;
            }
        }
        if (this.callback) this.callback(topEntry);
        if (! opt_noremote){
            this.remoteChannel.sendMessage(REMOTE_CMD+' '+topEntry.location+' '+JSON.stringify(topEntry.options))
        }
    }
}
export default History;