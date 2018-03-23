/* Copyright (c) 2017 Red Hat, Inc. */
var inherits = require('inherits');
var fsm = require('./fsm.js');

function _State () {
}
inherits(_State, fsm._State);


function _Dropping () {
    this.name = 'Dropping';
}
inherits(_Dropping, _State);
var Dropping = new _Dropping();
exports.Dropping = Dropping;

function _Selecting () {
    this.name = 'Selecting';
}
inherits(_Selecting, _State);
var Selecting = new _Selecting();
exports.Selecting = Selecting;

function _Selected () {
    this.name = 'Selected';
}
inherits(_Selected, _State);
var Selected = new _Selected();
exports.Selected = Selected;

function _Ready () {
    this.name = 'Ready';
}
inherits(_Ready, _State);
var Ready = new _Ready();
exports.Ready = Ready;

function _Scrolling () {
    this.name = 'Scrolling';
}
inherits(_Scrolling, _State);
var Scrolling = new _Scrolling();
exports.Scrolling = Scrolling;

function _Start () {
    this.name = 'Start';
}
inherits(_Start, _State);
var Start = new _Start();
exports.Start = Start;

function _Move () {
    this.name = 'Move';
}
inherits(_Move, _State);
var Move = new _Move();
exports.Move = Move;




_Dropping.prototype.start = function (controller) {


    var i = 0;
    var toolbox = controller.toolbox;
    console.log(["Dropping", toolbox.selected_item]);
    for(i = 0; i < toolbox.items.length; i++) {
        toolbox.items[i].selected = false;
    }

    controller.dropped_action(toolbox.selected_item);

    if (controller.remove_on_drop) {
        var dindex = toolbox.items.indexOf(toolbox.selected_item);
        if (dindex !== -1) {
            toolbox.items.splice(dindex, 1);
        }
    }

    toolbox.selected_item = null;
    controller.changeState(Ready);
};
_Dropping.prototype.start.transitions = ['Ready'];



_Selected.prototype.onMouseMove = function (controller) {

    controller.changeState(Move);

};
_Selected.prototype.onMouseMove.transitions = ['Move'];

_Selected.prototype.onMouseUp = function (controller) {

    var i = 0;
    var toolbox = controller.toolbox;
    for(i = 0; i < toolbox.items.length; i++) {
        toolbox.items[i].selected = false;
    }
    toolbox.selected_item = null;
    controller.changeState(Ready);
};
_Selected.prototype.onMouseUp.transitions = ['Ready'];


_Selecting.prototype.onMouseDown = function (controller) {

    var i = 0;

    var toolbox = controller.toolbox;
    var scope = controller.scope;
    var selected_item = Math.floor((controller.scope.mouseY - toolbox.y - toolbox.scroll_offset) / toolbox.spacing);

    for(i = 0; i < toolbox.items.length; i++) {
        toolbox.items[i].selected = false;
    }
    if (selected_item >= 0 && selected_item < toolbox.items.length) {
        toolbox.items[selected_item].selected = true;
        toolbox.selected_item = toolbox.items[selected_item];
        scope.pressedX = scope.mouseX;
        scope.pressedY = scope.mouseY;
        scope.pressedScaledX = scope.scaledX;
        scope.pressedScaledY = scope.scaledY;
        toolbox.selected_item.x = toolbox.x + toolbox.width/2;
        toolbox.selected_item.y = selected_item * toolbox.spacing + toolbox.y + toolbox.scroll_offset + toolbox.spacing/2;
        controller.scope.clear_selections();
        controller.scope.first_controller.handle_message("UnselectAll", {});
        controller.changeState(Selected);
    } else {
        toolbox.selected_item = null;
        controller.changeState(Ready);
    }

};
_Selecting.prototype.onMouseDown.transitions = ['Selected', 'Ready'];

_Ready.prototype.onMouseDown = function (controller, msg_type, $event) {

    if(controller.toolbox.enabled &&
       controller.scope.mouseX > controller.toolbox.x &&
       controller.scope.mouseY > controller.toolbox.y &&
       controller.scope.mouseX < controller.toolbox.x + controller.toolbox.width &&
       controller.scope.mouseY < controller.toolbox.y + controller.toolbox.height) {

       controller.changeState(Selecting);
       controller.handle_message(msg_type, $event);

    } else {
        controller.next_controller.handle_message(msg_type, $event);
    }
};
_Ready.prototype.onMouseDown.transitions = ['Selecting'];

_Ready.prototype.onMouseWheel = function (controller, msg_type, $event) {

    if(controller.toolbox.enabled &&
       controller.scope.mouseX > controller.toolbox.x &&
       controller.scope.mouseY > controller.toolbox.y &&
       controller.scope.mouseX < controller.toolbox.x + controller.toolbox.width &&
       controller.scope.mouseY < controller.toolbox.y + controller.toolbox.height) {

       controller.changeState(Scrolling);
       controller.handle_message(msg_type, $event);

    } else {
        controller.next_controller.handle_message(msg_type, $event);
    }
};
_Ready.prototype.onMouseWheel.transitions = ['Scrolling'];



_Scrolling.prototype.onMouseWheel = function (controller, msg_type, $event) {

    var delta = $event[1];
    controller.toolbox.scroll_offset += -1 * delta;
    controller.toolbox.scroll_offset = Math.min(controller.toolbox.scroll_offset, 0);
    controller.toolbox.scroll_offset = Math.max(controller.toolbox.scroll_offset, -1 * controller.toolbox.spacing * controller.toolbox.items.length + controller.toolbox.height);


    controller.changeState(Ready);

};
_Scrolling.prototype.onMouseWheel.transitions = ['Ready'];



_Start.prototype.start = function (controller) {

    controller.changeState(Ready);

};
_Start.prototype.start.transitions = ['Ready'];



_Move.prototype.onMouseUp = function (controller) {

    controller.changeState(Dropping);

};
_Move.prototype.onMouseUp.transitions = ['Dropping'];


_Move.prototype.onMouseMove = function (controller) {

    var diffX = controller.scope.mouseX - controller.scope.pressedX;
    var diffY = controller.scope.mouseY - controller.scope.pressedY;

    controller.toolbox.selected_item.x += diffX;
    controller.toolbox.selected_item.y += diffY;

    controller.scope.pressedX =  controller.scope.mouseX;
    controller.scope.pressedY =  controller.scope.mouseY;
};
