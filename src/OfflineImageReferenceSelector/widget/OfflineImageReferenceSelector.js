/*jslint browser:true, nomen:true, plusplus: true */
/*global mx, mendix, require, console, alert, define, module, logger, cordova, resolveLocalFileSystemURL, mxform */
/*
    OfflineImageReferenceSelector
    ========================

    @file      : OfflineImageReferenceSelector.js
    @version   : 1.0
    @author    : Marcel Groeneweg
    @date      : Fri, 03 Mar 2017 08:28:57 GMT
    @copyright : ITvisors
    @license   : Apache 2

    Documentation
    ========================
    Intended for offline apps only. Select a referenced entity object from a list of icons rather than a drop down.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",

    "mxui/dom",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/_base/event",
    "dojo/_base/connect",
    "dojo/NodeList-dom"
], function (declare, _WidgetBase, dom, dojoDom, dojoQuery, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoEvent, dojoConnect) {
    "use strict";

    // Declare widget's prototype.
    return declare("OfflineImageReferenceSelector.widget.OfflineImageReferenceSelector", [ _WidgetBase], {

        // Parameters configured in the Modeler.
        selectableObjectsEntity: "",
        selectableObjectAssociation: "",
        showImage: true,
        captionAttr: "",
        valueAttr: "",
        sortAttr: "",
        sortDirection: "",
        constraintList: null,
        subscribeTopic: "",
        closePage: false,
        containerClass: "",
        itemClass: "",
        itemImagePosition: "",
        itemNotSelectedClass: "",
        itemSelectedClass: "",
        buttonClass: "",
        captionClass: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _contextObj: null,
        _containerNode: null,
        _runOnDevice: false,
        _documentDirectory: null,
        _dojoConnectHandle: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
                        
            this._runOnDevice = typeof cordova !== "undefined";
            if (this._runOnDevice) {
                this._documentDirectory = cordova.file.externalDataDirectory || cordova.file.dataDirectory;
            }
            
            this._updateRendering();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._resetSubscriptions();
            this._updateRendering(callback); // We're passing the callback to updateRendering to be called after DOM-manipulation
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
            logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _createItems: function () {
            logger.debug(this.id + "._createItems");
            
            var thisObj = this;

            this._containerNode = dojoConstruct.create("div", { "class" : this.containerClass }, this.domNode);
            
            mx.data.getSlice(this.selectableObjectsEntity, this.constraintList, {
                sort: [[this.sortAttr, this.sortDirection]]
            }, function (objArray, count) {
                dojoArray.forEach(objArray, lang.hitch(thisObj, thisObj._createItem));
            }, function (e) {
                console.error("An error occured: " + e.message);
            });
            
        },

        _createItem: function (obj, i) {
            logger.debug(this.id + "._createItem");

            var itemNode,
                guid = obj.getGuid(),
                buttonNode,
                imageUrl,
                isImage = obj.inheritsFrom("System.Image"),
                thisObj = this;

            // Create the item
            itemNode = dojoConstruct.create("div", { "class" : this.itemClass, "data-value" : obj.get(this.valueAttr) }, this._containerNode);
            
            // Show current selection
            if (guid === this._contextObj.getReference(this.selectableObjectAssociation)) {
                dojoClass.add(itemNode, thisObj.itemSelectedClass);
            } else {
                dojoClass.add(itemNode, thisObj.itemNotSelectedClass);
            }
            
            // The button.
            buttonNode = dojoConstruct.create("button", { "class" : this.buttonClass }, itemNode);
            this.connect(buttonNode, "click", function (e) {
                thisObj._handleItemClick(e, itemNode, buttonNode, obj);
            });
            
            // Caption
            if (this.captionAttr) {
                dojoConstruct.create("span", { "class" : this.captionClass,  innerHTML: mx.parser.formatAttribute(obj, this.captionAttr) }, buttonNode);
            }
            
            // Actually set the image URL if applicable.
            if (isImage && this.showImage) {
                if (this._runOnDevice) {
                    resolveLocalFileSystemURL(this._documentDirectory + "files/documents/" + guid, function (fileObject) {
                        dojoStyle.set(itemNode, "background", "url(" + fileObject.nativeURL + ") no-repeat " + thisObj.itemImagePosition);
                    });
                } else {
                    imageUrl = "filesystem:" + mx.appUrl + "temporary/files/documents/" + guid;
                    dojoStyle.set(itemNode, "background", "url(" + imageUrl + ") no-repeat " + thisObj.itemImagePosition);
                }
            }
        },
        
        _handleItemClick: function (e, itemNode, buttonNode, obj) {
            
            var guid = obj.getGuid(),
                isImage = obj.inheritsFrom("System.Image"),
                publishData,
                thisObj = this;
                
            // Only on mobile stop event bubbling!
            this._stopBubblingEventOnMobile(e);

            // Remove selection class on old selection, if any
            dojoQuery("." + this.itemSelectedClass, this.domNode).removeClass(this.itemSelectedClass);

            // Replace NOT selected class with selected class on the selection node of the item.
            dojoClass.replace(itemNode, this.itemSelectedClass, this.itemNotSelectedClass);

            // Set NOT selected class on all other items
            dojoQuery("." + this.itemClass + ":not(." + this.itemSelectedClass + ")", this.domNode).addClass(this.itemNotSelectedClass);

            // Set association on the context object.
            this._contextObj.addReference(this.selectableObjectAssociation, guid);

            publishData = {
                contextGuid: this._contextObj.getGuid(),
                association: this.selectableObjectAssociation,
                selectedGuid: guid
            };
            dojoConnect.publish("OfflineImageReferenceSelector-" + this._contextObj.getEntity(), publishData);

            // Close the current page?
            if (this.closePage) {
                mx.data.commit({
                    mxobj: thisObj._contextObj,
                    callback: function () {
                        thisObj.mxform.close();
                    },
                    error: function (e) {
                        console.log("Error occurred attempting to commit: " + e);
                    }
                });
            }
        },
        
        // Rerender the interface.
        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

            dojoConstruct.empty(this.domNode);
            this._containerNode = null;
            if (this._contextObj !== null) {
                dojoStyle.set(this.domNode, "display", "block");
                this._createItems();

            } else {
                dojoStyle.set(this.domNode, "display", "none");
            }

            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            this._executeCallback(callback, "_updateRendering");
        },


        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this.unsubscribeAll();
            
            if (this._dojoConnectHandle) {
                dojoConnect.unsubscribe(this._dojoConnectHandle);
                this._dojoConnectHandle = null;
            }
            this._dojoConnectHandle = dojoConnect.subscribe(this.subscribeTopic + "-" + this._contextObj.getEntity() + "." + this._contextObj.getGuid(), lang.hitch(this, this._updateRendering));

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });
            }
        },

        _executeCallback: function (cb, from) {
            logger.debug(this.id + "._executeCallback" + (from ? " from " + from : ""));
            if (cb && typeof cb === "function") {
                cb();
            }
        }
    });
});

require(["OfflineImageReferenceSelector/widget/OfflineImageReferenceSelector"]);
