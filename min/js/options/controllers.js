var optionsControllers=angular.module("optionsControllers",[]);optionsControllers.controller("StylesController",["$scope","$timeout",function($scope,$timeout){"use strict";function onInit(){$modal=$("#myModal"),_storage.getUnselectAfterHighlight(function(unselectAfterHighlight){$scope.unselectAfterHighlight=unselectAfterHighlight,$scope.$watch("unselectAfterHighlight",function(newVal,oldVal){newVal!==oldVal&&_storage.setUnselectAfterHighlight(newVal)})}),_storage.getHighlightBackgroundAlpha(function(opacity){if(void 0!==opacity){$scope.opacity=opacity;var timeout=null;$scope.$watch("opacity",function(newVal,oldVal){newVal!==oldVal&&(timeout&&$timeout.cancel(timeout),timeout=$timeout(function(){_storage.setHighlightBackgroundAlpha(newVal)},1e3))})}}),chrome.commands.getAll(function(commands){$scope.commands=commands}),chrome.storage.onChanged.addListener(onStorageChanged),resetStylesheetHighlightStyle()}function resetStylesheetHighlightStyle(){_storage.highlightDefinitions.getAll(function(result){onStorageChanged({sharedHighlightStyle:{newValue:result.sharedHighlightStyle},highlightDefinitions:{newValue:result.highlightDefinitions}},"sync")})}var $modal;$scope.highlightClassName="highlight",$scope.onClickModalSave=function(){$scope.modalDefinition&&_storage.highlightDefinitions.set($scope.modalDefinition),$modal.modal("hide")},$scope.onClickAdd=function(){$scope.modalTitle=chrome.i18n.getMessage("create_new_style"),$scope.modalSaveButtonTitle=chrome.i18n.getMessage("create"),$scope.modalDefinition=_storage.highlightDefinitions.create(),$modal.modal()},$scope.onClickReset=function(){window.confirm(chrome.i18n.getMessage("confirm_reset_default_styles"))&&_storage.highlightDefinitions.removeAll()},$scope.onClickEdit=function(index){$scope.modalTitle=chrome.i18n.getMessage("edit_style"),$scope.modalSaveButtonTitle=chrome.i18n.getMessage("update"),$scope.modalDefinition=angular.copy($scope.definitions[index]),$modal.modal()},$scope.onClickDelete=function(className){window.confirm(chrome.i18n.getMessage("confirm_remove_style"))&&_storage.highlightDefinitions.remove(className)};var onStorageChanged=function(changes,namespace){if("sync"===namespace){var change;if(changes.highlightBackgroundAlpha&&(change=changes.highlightBackgroundAlpha,change.newValue&&($scope.opacity=change.newValue,resetStylesheetHighlightStyle())),changes.sharedHighlightStyle&&(change=changes.sharedHighlightStyle,change.oldValue&&_stylesheet.clearHighlightStyle($scope.highlightClassName),change.newValue&&_stylesheet.setHighlightStyle({className:$scope.highlightClassName,style:change.newValue})),changes.highlightDefinitions){change=changes.highlightDefinitions,change.oldValue&&change.oldValue.forEach(function(h){_stylesheet.clearHighlightStyle(h.className)});var setDefinitions=function(definitions){$scope.definitions=definitions,$scope.$apply(),definitions.forEach(function(definition){_stylesheet.setHighlightStyle(definition)})};change.newValue?setDefinitions(change.newValue):_storage.highlightDefinitions.getAll(function(items){setDefinitions(items.highlightDefinitions)})}}};onInit()}]),optionsControllers.controller("PagesController",["$scope",function($scope){"use strict";function onInit(_backgroundPage){backgroundPage=_backgroundPage,backgroundPage._database.getMatchSums(function(err,rows){rows&&($scope.rows=rows.filter(function(row){return row.value>0}),$scope.$apply())})}var backgroundPage;$scope.onClickRemoveAllHighlights=function(index){if(window.confirm(chrome.i18n.getMessage("confirm_remove_all_highlights"))){var match=$scope.rows[index].key;backgroundPage._database.removeDocuments(match,function(err){err||($scope.rows.splice(index,1),$scope.$apply())})}},$scope.onClickRemoveAllPages=function(){window.confirm(chrome.i18n.getMessage("confirm_remove_all_pages"))&&backgroundPage._database.resetDatabase(function(err){err||($scope.rows=[],$scope.$apply())})},chrome.runtime.getBackgroundPage(function(backgroundPage){onInit(backgroundPage)})}]),optionsControllers.controller("AboutController",["$scope",function($scope){"use strict";$scope.manifest=chrome.runtime.getManifest(),$scope.libraries=_libraries,$scope.cc=_licenses,$scope.onClickRestoreAllWarnings=function(){_storage.setFileAccessRequiredWarningDismissed(!1)}}]);