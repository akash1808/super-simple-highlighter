var _xpath={_getXPathFromNode:function(node){"use strict";for(var paths=[];node&&(node.nodeType===Node.ELEMENT_NODE||node.nodeType===Node.TEXT_NODE);node=node.parentNode){var index=0;if(node.id){var selector='[id="'+node.id+'"]',length=document.querySelectorAll(selector).length;if(1===length){paths.splice(0,0,'/*[@id="'+node.id+'"][1]');break}}for(var sibling=node.previousSibling;sibling;sibling=sibling.previousSibling)sibling.nodeType!==Node.DOCUMENT_TYPE_NODE&&sibling.nodeName===node.nodeName&&index++;var tagName=node.nodeType===Node.ELEMENT_NODE?node.nodeName.toLowerCase():"text()",pathIndex=index?"["+(index+1)+"]":"";paths.splice(0,0,tagName+pathIndex)}return paths.length?"/"+paths.join("/"):null},createXPathRangeFromRange:function(range){"use strict";return{startContainerPath:this._getXPathFromNode(range.startContainer),startOffset:range.startOffset,endContainerPath:this._getXPathFromNode(range.endContainer),endOffset:range.endOffset,collapsed:range.collapsed}},createRangeFromXPathRange:function(xpathRange){"use strict";var startContainer,endContainer,endOffset,evaluator=new XPathEvaluator;if(startContainer=evaluator.evaluate(xpathRange.startContainerPath,document.documentElement,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null),!startContainer.singleNodeValue)return null;if(xpathRange.collapsed||!xpathRange.endContainerPath)endContainer=startContainer,endOffset=xpathRange.startOffset;else{if(endContainer=evaluator.evaluate(xpathRange.endContainerPath,document.documentElement,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null),!endContainer.singleNodeValue)return null;endOffset=xpathRange.endOffset}var range=document.createRange();return range.setStart(startContainer.singleNodeValue,xpathRange.startOffset),range.setEnd(endContainer.singleNodeValue,endOffset),range}};