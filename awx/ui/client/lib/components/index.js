import layout from './layout/layout.directive';
import topNavItem from './layout/top-nav-item.directive';
import sideNav from './layout/side-nav.directive';
import sideNavItem from './layout/side-nav-item.directive';
import actionGroup from './action/action-group.directive';
import divider from './utility/divider.directive';
import form from './form/form.directive';
import formAction from './form/action.directive';
import inputCheckbox from './input/checkbox.directive';
import inputGroup from './input/group.directive';
import inputLabel from './input/label.directive';
import inputLookup from './input/lookup.directive';
import inputMessage from './input/message.directive';
import inputSecret from './input/secret.directive';
import inputSelect from './input/select.directive';
import inputText from './input/text.directive';
import inputTextarea from './input/textarea.directive';
import inputTextareaSecret from './input/textarea-secret.directive';
import modal from './modal/modal.directive';
import panel from './panel/panel.directive';
import panelHeading from './panel/heading.directive';
import panelBody from './panel/body.directive';
import popover from './popover/popover.directive';
import tab from './tabs/tab.directive';
import tabGroup from './tabs/group.directive';
import truncate from './truncate/truncate.directive';

import BaseInputController from './input/base.controller';
import ComponentsStrings from './components.strings';

angular
    .module('at.lib.components', [])
    .directive('atLayout', layout)
    .directive('atTopNavItem', topNavItem)
    .directive('atSideNav', sideNav)
    .directive('atSideNavItem', sideNavItem)
    .directive('atActionGroup', actionGroup)
    .directive('atDivider', divider)
    .directive('atForm', form)
    .directive('atFormAction', formAction)
    .directive('atInputCheckbox', inputCheckbox)
    .directive('atInputGroup', inputGroup)
    .directive('atInputLabel', inputLabel)
    .directive('atInputLookup', inputLookup)
    .directive('atInputMessage', inputMessage)
    .directive('atInputSecret', inputSecret)
    .directive('atInputSelect', inputSelect)
    .directive('atInputText', inputText)
    .directive('atInputTextarea', inputTextarea)
    .directive('atInputTextareaSecret', inputTextareaSecret)
    .directive('atModal', modal)
    .directive('atPanel', panel)
    .directive('atPanelHeading', panelHeading)
    .directive('atPanelBody', panelBody)
    .directive('atPopover', popover)
    .directive('atTab', tab)
    .directive('atTabGroup', tabGroup)
    .directive('atTruncate', truncate)
    .service('ComponentsStrings', ComponentsStrings)
    .service('BaseInputController', BaseInputController);
