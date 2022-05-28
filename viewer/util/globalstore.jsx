/**
 * Created by andreas on 27.07.19.
 */
import Store from './store';
import {KeyHelper} from "./keys";

export default new Store('global',undefined,undefined,KeyHelper.getContextAwareKeys());

