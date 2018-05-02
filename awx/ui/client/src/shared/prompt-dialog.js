/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

  /**
 *  @ngdoc function
 *  @name shared.function:prompt-dialog
 *  @description
 * PromptDialog
 * Prompt the user with a Yes/No dialog to confirm an action such
 * as Delete.  Assumes a hidden dialog already exists in $scope.
 * See example at bottom. If user responds with Yes, execute action
 * parameter.
 *
 * params: { hdr: 'header msg',
 *           body: 'body text/html',
 *           class: 'btn-class for Yes button',  --defaults to btn-danger
 *           action: function() {}  --action to take, if use clicks Yes
 *           }
 */


/**
* @ngdoc method
* @name shared.function:prompt-dialog#PromptDialog
* @methodOf shared.function:prompt-dialog
* @description discuss difference b/t this and other modals
*/

export default
angular.module('PromptDialog', ['Utilities'])
    .factory('Prompt', [ 'AppStrings',
        function (strings) {
            return function (params) {

                var dialog = angular.element(document.getElementById('prompt-modal')),
                    scope = dialog.scope(), cls, local_backdrop;

                scope.promptHeader = params.hdr;
                scope.promptResourceName = params.resourceName;
                scope.promptBody = params.body;
                scope.promptAction = params.action;
                scope.promptActionText = (params.actionText === null || params.actionText === undefined || params.actionText === '') ? strings.get('YES') : params.actionText;
                scope.cancelActionText = (params.cancelText === null || params.cancelText === undefined || params.cancelText === '') ? strings.get('CANCEL') : params.cancelText;
                scope.hideActionButton = params.hideActionButton ? true : false;

                local_backdrop = (params.backdrop === undefined) ? "static" : params.backdrop;

                cls = (params['class'] === null || params['class'] === undefined) ? 'Modal-errorButton' : params['class'];

                $('#prompt_action_btn').removeClass('Modal-errorButton Modal-primaryButton').addClass(cls);

                // bootstrap modal's have an open defect with disallowing tab index's of the background of the modal
                // This will keep the tab indexing on the modal's focus. This is to fix an issue with tabbing working when
                // the user is attempting to delete something. Might need to be checked for other occurances of the bootstrap
                // modal other than deleting
                function disableTabModalShown() {

                    $('.modal').on('shown.bs.modal', function() {

                        var modal = $(this),
                        focusableChildren = modal.find('a[href], a[data-dismiss], area[href], input, select, textarea, button, iframe, object, embed, *[tabindex], *[contenteditable]'),
                        numElements = focusableChildren.length,
                        currentIndex = 0,
                        focus,
                        focusPrevious,
                        focusNext;

                        $(document.activeElement).blur();

                        focus = function() {
                            var focusableElement = focusableChildren[currentIndex];
                            if (focusableElement) {
                                focusableElement.focus();
                            }
                        };

                        focusPrevious = function () {
                            currentIndex--;
                            if (currentIndex < 0) {
                                currentIndex = numElements - 1;
                            }

                            focus();

                            return false;
                        };

                        focusNext = function () {
                            currentIndex++;
                            if (currentIndex >= numElements) {
                                currentIndex = 0;
                            }

                            focus();

                            return false;
                        };

                        $(document).on('keydown', function (e) {

                            if (e.keyCode === 9 && e.shiftKey) {
                                e.preventDefault();
                                focusPrevious();
                            }
                            else if (e.keyCode === 9) {
                                e.preventDefault();
                                focusNext();
                            }
                        });

                        $(this).focus();
                    });

                    $('.modal').on('hidden.bs.modal', function() {
                        $(document).unbind('keydown');
                    });
                }


                $('#prompt-modal').off('hidden.bs.modal');
                $('#prompt-modal').modal({
                    backdrop: 'static',
                    keyboard: true,
                    show: true
                });
                disableTabModalShown();

            };
        }
    ]);
