/*global _stringUtils, _stylesheet, _storage, document, window, _highlighter, _xpath, _highlightDefinitions*/

var _contentScript  = {
    /**
     * A random string applied as an additional class name to all highlights,
     * allowing .on() event handling, and shared style
     */
    highlightClassName: null,

    /**
     * Called when the script loads
     */
    init: function () {
        "use strict";
        // create a random class name
        _contentScript.highlightClassName = _stringUtils.createUUID({beginWithLetter: true});

//        document.body.style.backgroundColor = "#ffd";

        // listen for changes to styles
        chrome.storage.onChanged.addListener(_contentScript.onStorageChanged);

        // fake a change for initial update
        _highlightDefinitions.getAll(function (result) {
            _contentScript.onStorageChanged({
                sharedHighlightStyle: {
                    newValue: result.sharedHighlightStyle
                },
                highlightDefinitions: {
                    newValue: result.highlightDefinitions
                }
            }, "sync");
        });

        // listen for messages from event page
        chrome.runtime.onMessage.addListener(_contentScript.onRuntimeMessage);

        // because .on() expects the element to be in the DOM, we use this form
        // http://stackoverflow.com/questions/9827095/is-it-possible-to-use-jquery-on-and-hover
        $(document).on({
            mouseenter: _contentScript.onMouseEnterHighlight,
            mouseleave: _contentScript.onMouseLeaveHighlight
        }, "." + _contentScript.highlightClassName);
    },

    isSelectionCollapsed: function () {
        "use strict";
        return window.getSelection().isCollapsed;
    },

    /**
     * Get text selection range
     * @return {Range}
     */
    getSelectionRange: function () {
        "use strict";
        return window.getSelection().getRangeAt(0);
    },

    /**
     * Highlight part of the DOM, identified by the selection
     * @param xpathRange
     * @param id id to set on the first span of the highlight
     * @param className
     * @return {*} span of highlight list, or null on error
     */
    createHighlight: function (xpathRange, id, className) {
        "use strict";
        var range;

        // this is likely to cause exception when the underlying DOM has changed
        try {
            range = _xpath.createRangeFromXPathRange(xpathRange);
        } catch (err) {
            console.log("Exception parsing xpath range: " + err.message);
            return null;
        }

        if (!range) {
            console.log("error parsing xpathRange: " + xpathRange);
            return null;
        }

        // create span(s), with 2 class names
        return _highlighter.create(range, id, [
            _contentScript.highlightClassName,
            className
        ]);
    },

    /**
     * Delete a previously created highlight
     * @param {string} id id of the first element of the list of spans that a highlight consists of.
     */
    deleteHighlight: function (id) {
        "use strict";
        return _highlighter.del(id);
    },

    /**
     * Check whether a highlight with this id is on the page
     * @param {string} id
     * @return {boolean} true if on page
     */
    isHighlightInDOM: function (id) {
        "use strict";
        return $('#' + id).length === 1;
    },

    /**
     * Update the class name for all the spans of a highlight
     * @param id existing highlight id
     * @param className class name to replace
     */
    updateHighlight: function (id, className) {
        // remember to also include the shared highlights class name
        "use strict";
        return _highlighter.update(id, [_contentScript.highlightClassName, className]);
    },

    scrollTo: function (selector) {
        "use strict";
        var $elm = $(selector);
        if ($elm) {
            $('body').animate({
                'scrollTop': $elm.offset().top
            }, 'slow');
        }

        return $elm !== null;
    },

    /**
     * Fired when a message is sent from either an extension process or a content script.
     *
     * NB: sendResponse is a function to call (at most once) when you have a response.
     * The argument should be any JSON-ifiable object.
     * If you have more than one onMessage listener in the same document, then only one may send a response.
     * This function becomes invalid when the event listener returns, unless you return true from the event listener to
     * indicate you wish to send a response asynchronously (this will keep the message channel open to the other end
     * until sendResponse is called).
     */
    onRuntimeMessage: function (message, sender, sendResponse) {
        "use strict";
        switch (message.id) {
        case "create_highlight":
            // the caller specifies the id to use for the first span of the highlight,
            // so it can identify it to remove it later
            sendResponse(_contentScript.createHighlight(message.range,
                message.highlightId, message.className) !== null);
            break;

        case "update_highlight":
            sendResponse(_contentScript.updateHighlight(message.highlightId, message.className));
            break;

        case "delete_highlight":
            // returns boolean true on success, false on error
            sendResponse(_contentScript.deleteHighlight(message.highlightId));
            break;

        case "is_highlight_in_dom":
            sendResponse(_contentScript.isHighlightInDOM(message.highlightId));
            break;

        case "get_selection_range":
            var range = _contentScript.getSelectionRange();
            sendResponse(_xpath.createXPathRangeFromRange(range));
            break;

        case "scroll_to":
            sendResponse(_contentScript.scrollTo("#" + message.fragment));
            break;

        case "console_log":
            console.log(message.text);
            break;

        default:
            throw "unhandled message: sender=" + sender + ", id=" + message.id;
        }
    },

    /**
     * Given one of the elements in the list of spans which compose a highlight, get the id (only set on the first item)
     * @param element
     * @return {*}
     */
    _getHighlightId: function (element) {
        "use strict";
        // even if the first span sets the firstSpan property to itself
        if (!element.firstSpan) {
            // unusual
            return;
        }

        return element.firstSpan.id;
    },

    /**
     * Mouse entered one of the highlight's spans
     */
    onMouseEnterHighlight: function () {
        "use strict";
        // 'this' is one of the spans in the list, related to a single highlight.
        var id = _contentScript._getHighlightId(this);
        if (id) {
            // tell event page that this is the current highlight.
            // if the range is not collapsed, it will probably be ignored
            chrome.runtime.sendMessage({
                id: "on_mouse_enter_highlight",
                highlightId: id,
                selectionCollapsed: _contentScript.isSelectionCollapsed()
            });
        }
    },

    /**
     * Mouse left one of the highlight's spans
     */
    onMouseLeaveHighlight: function () {
        "use strict";
        var id = _contentScript._getHighlightId(this);
        if (id) {
            // tell event page that this is the current highlight
            chrome.runtime.sendMessage({
                id: "on_mouse_leave_highlight",
                highlightId: id
            });
        }
    },

    /**
     * A value in the storage changed
     * @param changes
     * @param namespace
     */
    onStorageChanged: function (changes, namespace) {
        "use strict";
        if (namespace === "sync") {
            // changes is an Object mapping each key that changed to its
            // corresponding storage.StorageChange for that item.

            // default FIRST
            if (changes.sharedHighlightStyle) {
                var c1 = changes.sharedHighlightStyle;

                if (c1.oldValue) {
                    _stylesheet.clearHighlightStyle(_contentScript.highlightClassName);
                }

                if (c1.newValue) {
                    _stylesheet.setHighlightStyle({
                        className: _contentScript.highlightClassName,
                        style: c1.newValue
                    });
                }
            }

            // specific last
            if (changes.highlightDefinitions) {
                var c2 = changes.highlightDefinitions;

                // Remove all event handlers in the ".hotkeys" namespace
                $(document).off('keypress.hotkeys');

                if (c2.oldValue) {
                    c2.oldValue.forEach( function (h) {
                        _stylesheet.clearHighlightStyle(h.className);
                    });
                }

                if (c2.newValue) {
                    c2.newValue.forEach( function (h) {
                        _stylesheet.setHighlightStyle(h);

                        if (h.hotkey && h.hotkey.length > 0) {
                            // sort modifiers alphabetically
                            var tokens = h.hotkey.split("+");

                            // remove last letter
                            var key = tokens.pop();
                            // sort alphabetically
                            tokens = tokens.map( function (modifier) {
                                return modifier.toLowerCase();
                            }).sort();
                            // add last letter again
                            tokens.push(key);
                            // reform
                            var hotkey = tokens.join("+");

                            $(document).on('keypress.hotkeys', null, hotkey,
                                _contentScript.onKeyPressFactory(h.className));
                        }
                    });
                }

                // if the highlight definitions define any shortcuts, add the handler, with specific data


            }
        }
    },

    /**
     * Factory method for onKeyPress handler
     * @param {string} className class name to associated with the highlight
     */
    onKeyPressFactory: function(className){
        "use strict";
        return function() {
            // get the current selection, if any
            if ( _contentScript.isSelectionCollapsed() ) {
                return;
            }

            var range = _contentScript.getSelectionRange();

            // tell event page to highlight the selection
            chrome.runtime.sendMessage({
                id: "create_highlight",
                className: className,
                range: _xpath.createXPathRangeFromRange(range),
                selectionText: range.toString()
            });
        };
    }
};

/**
 * Listener for change events in storage
 */
_contentScript.init();

//$().ready(function () {
//    "use strict";
//    _contentScript.onReady();
//});
