/*global angular, _highlightDefinitions, _stylesheet, _stringUtils, _i18n*/

/**
 * Controllers module
 * @type {ng.IModule}
 */
var optionsControllers = angular.module('optionsControllers', []);

// TODO: rewrite, this is too linked with storage stuff

// array this is something to do with minification
optionsControllers.controller('StylesController', ["$scope", '$sce', function ($scope, $sce) {
    'use strict';
    var $modal;

    // model
    $scope.highlightClassName = "highlight";
    $scope.html_highlight_keyboard_shortcut_help = $sce.trustAsHtml(
        chrome.i18n.getMessage("html_highlight_keyboard_shortcut_help"));

    function onInit () {
        // cache
        $modal = $('#myModal');

        // listen for edit modal close
//        $modal.on('hidden.bs.modal', onModalHidden);

        // listen for changes to styles
        chrome.storage.onChanged.addListener(onStorageChanged);

        // fake a change for initial update
        _highlightDefinitions.getAll(function (result) {
            onStorageChanged({
                sharedHighlightStyle: {
                    newValue: result.sharedHighlightStyle
                },
                highlightDefinitions: {
                    newValue: result.highlightDefinitions
                }
            }, "sync");
        });

    }

    $scope.onClickModalSave = function () {
        // set contents of selectedDefintion into storage
        if ($scope.modalDefinition) {
            _highlightDefinitions.set($scope.modalDefinition);
        }

        $modal.modal('hide');
    };

    /**
     * Clicked the 'add new definition' button
     */
    $scope.onClickAdd = function () {
        // default new definition
        $scope.modalTitle = chrome.i18n.getMessage("create_new_style");
        $scope.modalSaveButtonTitle = chrome.i18n.getMessage("create");

        $scope.modalDefinition = _highlightDefinitions.create();
//        $scope.$apply();

        // activate the 'edit' model
        $modal.modal();
    };

    /**
     * Clicked the 'reset styles' button
     */
    $scope.onClickReset = function () {
        if (window.confirm(chrome.i18n.getMessage("confirm_reset_default_styles"))) {
            _highlightDefinitions.removeAll();
        }
    };

    /**
     * Clicked an existing definition
     * @param {number} index index of definition in local array
     */
    $scope.onClickEdit = function (index) {
        $scope.modalTitle = chrome.i18n.getMessage("edit_style");
        $scope.modalSaveButtonTitle = chrome.i18n.getMessage("update");

        // deep copy
        $scope.modalDefinition = angular.copy($scope.definitions[index]);//   _highlightDefinitions.copy($scope.definitions[index]);


        // activate the 'edit' model
        $modal.modal();
    };

    /**
     * Clicked the per-definition 'delete' button
     * @param className
     */
    $scope.onClickDelete = function (className) {
        // delete from storage. model should update automatically
        _highlightDefinitions.remove(className);
    };

    /**
     * A value in the storage changed
     * @param changes
     * @param namespace
     */
    var onStorageChanged = function (changes, namespace) {
        if (namespace === "sync") {
            // changes is an Object mapping each key that changed to its
            // corresponding storage.StorageChange for that item.
            var change;

            // default FIRST
            if (changes.sharedHighlightStyle) {
                change = changes.sharedHighlightStyle;

                if (change.oldValue) {
                    _stylesheet.clearHighlightStyle($scope.highlightClassName);
                }

                if (change.newValue) {
                    _stylesheet.setHighlightStyle({
                        className: $scope.highlightClassName,
                        style: change.newValue
                    });
                }
            }

            // specific last
            if (changes.highlightDefinitions) {
                change = changes.highlightDefinitions;

                if (change.oldValue) {
                    change.oldValue.forEach( function (h) {
                        _stylesheet.clearHighlightStyle(h.className);
                    });
                }

                // if we remove all teh styles (with reset button), newValue will be undefined.
                // so in that case, get the default styles
                var setDefinitions = function (definitions) {
                    // update model
                    $scope.definitions = definitions;
                    $scope.$apply();

                    // update stylesheet
                    definitions.forEach( function (definition) {
                        _stylesheet.setHighlightStyle(definition);
                    });
                };

                if (!change.newValue) {
                    // get defaults
                    _highlightDefinitions.getAll(function (items) {
                        setDefinitions(items.highlightDefinitions);
                    });
                } else {
                    setDefinitions (change.newValue);
                }
            }
        }
    };

    onInit();
}]);


/**
 * Controller for Sites pane
 */
optionsControllers.controller('PagesController', ["$scope", function ($scope) {
    'use strict';
    var backgroundPage;

    /**
     * Init
     * @param {object} _backgroundPage
     */
    function onInit(_backgroundPage){
        backgroundPage = _backgroundPage;

        // get an array of each unique match, and the number of associated documents (which is of no use)
        backgroundPage._database.getMatchSums(function (err, rows) {
            if (rows) {
                $scope.rows = rows.filter (function (row) {
                    return row.value > 0;
                });
                $scope.$apply();
            }
        });
    }

    /**
     * Clicked 'remove all highlights for this site' button (x)
     * @param {number} index
     */
    $scope.onClickRemoveAllHighlights = function (index){
        if (window.confirm(chrome.i18n.getMessage("confirm_remove_all_highlights"))) {
            var match = $scope.rows[index].key;

            backgroundPage._database.removeDocuments(match, function (err, result) {
                if (!err) {
                    $scope.rows.splice(index, 1);
                    $scope.$apply();
                }
            });
        }
    };

    /**
     * Clicked 'remove all pages' button.
     */
    $scope.onClickRemoveAllPages = function () {
        if (window.confirm(chrome.i18n.getMessage("confirm_remove_all_pages"))) {
            // destroy and re-create the database
            backgroundPage._database.resetDatabase(function (err, response) {
                if (!err) {
                    $scope.rows = [];
                    $scope.$apply();
                }
            });
        }
    };

    // starter
    chrome.runtime.getBackgroundPage(function (backgroundPage) {
        onInit(backgroundPage);
    });
}]);

/**
 * Controller for About pane
 */
optionsControllers.controller('AboutController', ["$scope", function ($scope) {
    'use strict';
    $scope.manifest = chrome.runtime.getManifest();

    $scope.libraries = [
        {
            href: "https://angularjs.org/",
            text: "AngularJS"
        },
        {
            href: "http://getbootstrap.com/",
            text: "Bootstrap"
        },
        {
            href: "http://jquery.com/",
            text: "jQuery"
        },
        {
            href: "https://github.com/jeresig/jquery.hotkeys",
            text: "jQuery.Hotkeys (jeresig fork)"
        },
        {
            href: "https://github.com/f0r4y312/jquery-stylesheet",
            text: "jQuery StyleSheet"
        },
        {
            href: "http://pouchdb.com/",
            text: "PouchDB"
        },
        {
            href: "https://github.com/allmarkedup/purl",
            text: "Purl"
        }
    ];

    $scope.cc = [
        {
            work: {
                href: "http://www.iconarchive.com/show/soft-scraps-icons-by-hopstarter/Highlighter-Blue-icon.html",
                text: "Highlighter Blue Icon"
            },
            author: {
                href: "http://hopstarter.deviantart.com",
                text: "Hopstarter"

            },
            license: {
                href: "http://creativecommons.org/licenses/by-nc-nd/3.0/",
                text: "CC BY-NC-ND 3.0"
            }
        },

        {
            work: {
                href: "https://www.iconfinder.com/icons/32453/alert_attention_danger_error_exclamation_hanger_message_problem_warning_icon",
                text: "Exclamation"
            },
            author: {
                href: "http://www.aha-soft.com/",
                text: "Aha-soft"

            },
            license: {
                href: "http://creativecommons.org/licenses/by/3.0/",
                text: "CC BY 3.0"
            }
        },

        {
            work: {
                href: "https://www.flickr.com/photos/colemama/5264395373/",
                text: "Highlighter On Page (Promotional Image)"
            },
            author: {
                href: "https://www.flickr.com/photos/colemama/",
                text: "Marie Coleman"

            },
            license: {
                href: "https://creativecommons.org/licenses/by-nc-sa/2.0/",
                text: "CC BY-NC-SA 2.0"
            }
        }
    ];
}]);
