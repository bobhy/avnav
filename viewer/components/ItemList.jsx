/**
 * Created by andreas on 10.10.16.
 * an itemlist to display items of a common type
 * it is able to handle a couple of selectors to add classes to the items
 * the itemClick callback will have the item from the list
 * that has a "true" value for each selector where the item key is the value in the property "selectors"
 * child items will have an onClick and an onItemClick
 * the onClick will insert the current item properties as first parameter and pass the provided parameter
 *             (if not being the event object) as second
 * ths onIemClick will directly pass through
 */

import React from 'react';
import PropTypes from 'prop-types';
import assign from 'object-assign';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';


const getKey=function(obj){
    let rt=obj.key;
    if (rt !== undefined) return rt;
    rt=obj.name;
    return rt;
};

class ItemList extends React.Component{
    constructor(props){
        super(props);
        this.onSortEnd=this.onSortEnd.bind(this);
        this.Content=this.Content.bind(this);
        this.ItemWrapper=this.ItemWrapper.bind(this);
        this.ItemWrapperNoClick=this.ItemWrapperNoClick.bind(this);
    }
    onSortEnd(data){
        let len=this.props.itemList?this.props.itemList.length:0;
        if (this.props.reverse) {
            if (this.props.onSortEnd) this.props.onSortEnd(len-data.oldIndex,len- data.newIndex);
        }
        else{
            if (this.props.onSortEnd) this.props.onSortEnd(data.oldIndex, data.newIndex);
        }

    }

    ItemWrapper(props){
        let self=this;
        let {ItemClass,...iprops}=props;
        const memoClick=React.useCallback((data)=>{
            if (data && data.stopPropagation) data.stopPropagation();
            if (data && data.preventDefault) data.preventDefault();
            if (self.props.reverse){
                let len=self.props.itemList?self.props.itemList.length:0;
                self.props.onItemClick(assign({},iprops,{index:len-iprops.index}),data);
            }
            else {
                self.props.onItemClick(iprops, data);
            }
        },[iprops]);
        return <ItemClass
            {...iprops}
            onClick={memoClick}
        />
    }
    ItemWrapperNoClick(props){
        let {ItemClass,...iprops}=props;
        return <ItemClass
            {...iprops}
        />
    }
    Content(props) {
        let self=this;
        let idx = 0;
        let existingKeys={};
        return (
            <div className={props.className}
                 style={props.style}
                 ref={(el)=>{if (props.listRef) props.listRef(el)}}
                 onClick={(ev)=>{
                     if (self.props.onClick){
                         ev.stopPropagation();
                         self.props.onClick(ev);
                     }
                 }}
            >
                {props.allitems.map(function (entry) {
                    let itemProps = assign({},self.props.itemProperties, entry);
                    let key = getKey(entry);
                    //we allow for multiple items with the same name
                    //we try at most 20 times to get a unique key by appending _idx
                    let tries=20;
                    while (tries > 0 && (! key || existingKeys[key])){
                        key+="_"+idx;
                        tries--;
                    }
                    itemProps.index=self.props.reverse?props.allitems.length-idx:idx;
                    itemProps.key = key;
                    existingKeys[key]=true;
                    if (self.props.selectedIndex !== undefined){
                        if (idx == self.props.selectedIndex) {
                            itemProps.selected = true;
                        }
                        else {
                            itemProps.selected = false;
                        }
                    }
                    let ItemClass;
                    if (self.props.itemCreator) {
                        ItemClass = self.props.itemCreator(entry);
                        if (!ItemClass) return null;
                    }
                    else {
                        ItemClass = self.props.itemClass;
                    }
                    if (self.props.dragdrop) {
                        ItemClass=SortableElement(ItemClass);
                    }
                    let ItemWrapper;
                    if (!itemProps.onClick && self.props.onItemClick) {
                        ItemWrapper=self.ItemWrapper;
                    }
                    else{
                        ItemWrapper=self.ItemWrapperNoClick;
                    }
                    idx++;

                    return <ItemWrapper ItemClass={ItemClass} key={key} {...itemProps}/>
                })}
            </div>
        );
    };
    render() {
        let allitems = this.props.itemList || [];
        if (this.props.hideOnEmpty && allitems.length < 1) return null;
        let self = this;
        let className = "listContainer";
        if (this.props.scrollable) className+=" scrollable";
        if (this.props.className) className += " " + this.props.className;
        if (this.props.horizontal) className += " horizontal";
        let style=this.props.style||{};
        if (this.props.fontSize){
            style.fontSize=this.props.fontSize;
        }

        let dragProps={};
        let Content=this.Content;
        if (this.props.dragdrop){
            Content= SortableContainer(Content);
            dragProps.axis=self.props.horizontal?"x":"y";
            dragProps.distance=20;
            dragProps.onSortEnd=self.onSortEnd;
            dragProps.helperClass="sortableHelper";

        }
        if (this.props.scrollable) {
            return (
                <div onClick={self.props.onClick} className={className} style={style} ref={(el)=>{if (self.props.listRef) self.props.listRef(el)}}>
                    <Content className="listScroll" allitems={allitems} {...dragProps}/>
                </div>
            );
        }
        else {
            return(
                <Content className={className} allitems={allitems} style={style} listRef={self.props.listRef} {...dragProps}/>
            );
        }
    }


}

ItemList.propTypes={
        onItemClick:    PropTypes.func, //will be called with 2 parameters:
                                        //1st: the item description, 2nd: the data provided by the item
        itemClass:      PropTypes.any, //one of itemClass or itemCreator must be set
        itemCreator:    PropTypes.func,
        itemProperties: PropTypes.object,
        itemList:       PropTypes.array,
        className:      PropTypes.string,
        scrollable:     PropTypes.bool,
        hideOnEmpty:    PropTypes.bool,
        fontSize:       PropTypes.any,
        listRef:        PropTypes.func,
        selectedIndex:  PropTypes.number,
        onClick:        PropTypes.func,
        dragdrop:       PropTypes.bool,
        horizontal:     PropTypes.bool,
        reverse:        PropTypes.bool, //let the index count backwards
        onSortEnd:      PropTypes.func
};

export default ItemList;