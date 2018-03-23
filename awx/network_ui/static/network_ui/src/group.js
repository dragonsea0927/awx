/* Copyright (c) 2017 Red Hat, Inc. */
var inherits = require('inherits');
var fsm = require('./fsm.js');
var models = require('./models.js');
var messages = require('./messages.js');
var titlecase = require('titlecase');

function _State () {
}
inherits(_State, fsm._State);


function _Resize () {
    this.name = 'Resize';
}
inherits(_Resize, _State);
var Resize = new _Resize();
exports.Resize = Resize;

function _Start () {
    this.name = 'Start';
}
inherits(_Start, _State);
var Start = new _Start();
exports.Start = Start;

function _CornerSelected () {
    this.name = 'CornerSelected';
}
inherits(_CornerSelected, _State);
var CornerSelected = new _CornerSelected();
exports.CornerSelected = CornerSelected;

function _Selected1 () {
    this.name = 'Selected1';
}
inherits(_Selected1, _State);
var Selected1 = new _Selected1();
exports.Selected1 = Selected1;

function _Selected3 () {
    this.name = 'Selected3';
}
inherits(_Selected3, _State);
var Selected3 = new _Selected3();
exports.Selected3 = Selected3;

function _Move () {
    this.name = 'Move';
}
inherits(_Move, _State);
var Move = new _Move();
exports.Move = Move;

function _Ready () {
    this.name = 'Ready';
}
inherits(_Ready, _State);
var Ready = new _Ready();
exports.Ready = Ready;

function _Disable () {
    this.name = 'Disable';
}
inherits(_Disable, _State);
var Disable = new _Disable();
exports.Disable = Disable;


function _EditLabel () {
    this.name = 'EditLabel';
}
inherits(_EditLabel, _State);
var EditLabel = new _EditLabel();
exports.EditLabel = EditLabel;

function _Selected2 () {
    this.name = 'Selected2';
}
inherits(_Selected2, _State);
var Selected2 = new _Selected2();
exports.Selected2 = Selected2;

function _Placing () {
    this.name = 'Placing';
}
inherits(_Placing, _State);
var Placing = new _Placing();
exports.Placing = Placing;

_State.prototype.onUnselectAll = function (controller, msg_type, $event) {

    controller.changeState(Ready);
    controller.next_controller.handle_message(msg_type, $event);
};

_Resize.prototype.onMouseUp = function (controller, msg_type, $event) {

    controller.changeState(Selected1);
    controller.handle_message(msg_type, $event);

};
_Resize.prototype.onMouseUp.transitions = ['Selected1'];

_Resize.prototype.onMouseMove = function (controller) {

    var groups = controller.scope.selected_groups;

    var diffX = controller.scope.scaledX - controller.scope.pressedScaledX;
    var diffY = controller.scope.scaledY - controller.scope.pressedScaledY;
    var i = 0;
    var j = 0;
    var membership_old_new = [];
    var previous_x1, previous_y1, previous_x2, previous_y2;
    for (i = 0; i < groups.length; i++) {
        previous_x1 = groups[i].x1;
        previous_y1 = groups[i].y1;
        previous_x2 = groups[i].x2;
        previous_y2 = groups[i].y2;
        if (groups[i].selected_corner === models.TOP_LEFT) {
            groups[i].x1 = groups[i].x1 + diffX;
            groups[i].y1 = groups[i].y1 + diffY;
        }
        if (groups[i].selected_corner === models.BOTTOM_RIGHT) {
            groups[i].x2 = groups[i].x2 + diffX;
            groups[i].y2 = groups[i].y2 + diffY;
        }
        if (groups[i].selected_corner === models.TOP_RIGHT) {
            groups[i].x2 = groups[i].x2 + diffX;
            groups[i].y1 = groups[i].y1 + diffY;
        }
        if (groups[i].selected_corner === models.BOTTOM_LEFT) {
            groups[i].x1 = groups[i].x1 + diffX;
            groups[i].y2 = groups[i].y2 + diffY;
        }

        membership_old_new = groups[i].update_membership(controller.scope.devices,
                                                         controller.scope.groups);
        for(j = 0; j < membership_old_new[0].length; j++) {
            membership_old_new[0][j].selected = false;
        }
        for(j = 0; j < membership_old_new[1].length; j++) {
            membership_old_new[1][j].selected = true;
        }

        controller.scope.send_control_message(new messages.GroupMove(controller.scope.client_id,
                                                                      groups[i].id,
                                                                      groups[i].x1,
                                                                      groups[i].y1,
                                                                      groups[i].x2,
                                                                      groups[i].y2,
                                                                      previous_x1,
                                                                      previous_y1,
                                                                      previous_x2,
                                                                      previous_y2));
        controller.scope.send_control_message(new messages.GroupMembership(controller.scope.client_id,
                                                                           groups[i].id,
                                                                           membership_old_new[2]));
    }
    controller.scope.pressedScaledX = controller.scope.scaledX;
    controller.scope.pressedScaledY = controller.scope.scaledY;
};

_Resize.prototype.start = function (controller) {

    var groups = controller.scope.selected_groups;

    var i = 0;
    for (i = 0; i < groups.length; i++) {
        groups[i].moving = true;
    }
};

_Resize.prototype.end = function (controller) {

    var groups = controller.scope.selected_groups;

    var i = 0;
    var j = 0;
    for (i = 0; i < groups.length; i++) {
        for(j = 0; j < groups[i].devices.length; j++) {
            groups[i].devices[j].selected = false;
        }
    }

    for (i = 0; i < groups.length; i++) {
        groups[i].moving = false;
    }
};


_Start.prototype.start = function (controller) {

    controller.changeState(Ready);

};
_Start.prototype.start.transitions = ['Ready'];

_CornerSelected.prototype.start = function (controller) {

    var groups = controller.scope.selected_groups;
    var i = 0;
    var x = controller.scope.scaledX;
    var y = controller.scope.scaledY;
    for (i = 0; i < groups.length; i++) {
        groups[i].selected_corner = groups[i].select_corner(x, y);
    }
};

_CornerSelected.prototype.onMouseMove = function (controller) {

    controller.changeState(Resize);
};
_CornerSelected.prototype.onMouseMove.transitions = ['Resize'];

_CornerSelected.prototype.onMouseUp = function (controller, msg_type, $event) {

    controller.changeState(Selected1);
    controller.handle_message(msg_type, $event);
};
_CornerSelected.prototype.onMouseUp.transitions = ['Selected1'];



_Selected1.prototype.onMouseMove = function (controller) {

    controller.changeState(Move);

};
_Selected1.prototype.onMouseMove.transitions = ['Move'];

_Selected1.prototype.onMouseUp = function (controller) {

    controller.changeState(Selected2);
};
_Selected1.prototype.onMouseUp.transitions = ['Selected2'];



_Selected3.prototype.onMouseMove = function (controller) {

    controller.changeState(Move);

};
_Selected3.prototype.onMouseMove.transitions = ['Move'];

_Selected3.prototype.onMouseUp = function (controller) {

    controller.changeState(EditLabel);

};
_Selected3.prototype.onMouseUp.transitions = ['EditLabel'];


_Move.prototype.onMouseMove = function (controller) {

    var groups = controller.scope.selected_groups;

    var diffX = controller.scope.scaledX - controller.scope.pressedScaledX;
    var diffY = controller.scope.scaledY - controller.scope.pressedScaledY;
    var i = 0;
    var j = 0;
    var membership_old_new = [];
    var previous_x1, previous_y1, previous_x2, previous_y2;
    for (i = 0; i < groups.length; i++) {
        previous_x1 = groups[i].x1;
        previous_y1 = groups[i].y1;
        previous_x2 = groups[i].x2;
        previous_y2 = groups[i].y2;
        groups[i].x1 = groups[i].x1 + diffX;
        groups[i].y1 = groups[i].y1 + diffY;
        groups[i].x2 = groups[i].x2 + diffX;
        groups[i].y2 = groups[i].y2 + diffY;

        membership_old_new = groups[i].update_membership(controller.scope.devices,
                                                         controller.scope.groups);
        for(j = 0; j < membership_old_new[0].length; j++) {
            membership_old_new[0][j].selected = false;
        }
        for(j = 0; j < membership_old_new[1].length; j++) {
            membership_old_new[1][j].selected = true;
        }

        controller.scope.send_control_message(new messages.GroupMove(controller.scope.client_id,
                                                                      groups[i].id,
                                                                      groups[i].x1,
                                                                      groups[i].y1,
                                                                      groups[i].x2,
                                                                      groups[i].y2,
                                                                      previous_x1,
                                                                      previous_y1,
                                                                      previous_x2,
                                                                      previous_y2));
        controller.scope.send_control_message(new messages.GroupMembership(controller.scope.client_id,
                                                                           groups[i].id,
                                                                           membership_old_new[2]));
    }
    controller.scope.pressedScaledX = controller.scope.scaledX;
    controller.scope.pressedScaledY = controller.scope.scaledY;
};

_Move.prototype.onMouseUp = function (controller) {

    controller.changeState(Selected2);

};
_Move.prototype.onMouseUp.transitions = ['Selected2'];

_Move.prototype.onMouseDown = function (controller) {

    controller.changeState(Selected1);
};
_Move.prototype.onMouseDown.transitions = ['Selected1'];

_Move.prototype.start = function (controller) {

    var groups = controller.scope.selected_groups;

    var i = 0;
    for (i = 0; i < groups.length; i++) {
        groups[i].moving = true;
    }
};

_Move.prototype.end = function (controller) {

    var groups = controller.scope.selected_groups;

    var i = 0;
    var j = 0;
    for (i = 0; i < groups.length; i++) {
        for(j = 0; j < groups[i].devices.length; j++) {
            groups[i].devices[j].selected = false;
        }
    }

    for (i = 0; i < groups.length; i++) {
        groups[i].moving = false;
    }
};


_Ready.prototype.onMouseMove = function (controller, msg_type, $event) {

    if (controller.scope.hide_groups) {
        controller.next_controller.handle_message(msg_type, $event);
        return;
    }

    var i = 0;

    for (i = 0; i < controller.scope.groups.length; i++) {
        controller.scope.groups[i].update_hightlighted(controller.scope.scaledX, controller.scope.scaledY);
    }

    controller.next_controller.handle_message(msg_type, $event);
};


_Ready.prototype.onMouseDown = function (controller, msg_type, $event) {

    if (controller.scope.hide_groups) {
        controller.next_controller.handle_message(msg_type, $event);
        return;
    }

    //
    var i = 0;

    for (i = 0; i < controller.scope.groups.length; i++) {
        controller.scope.groups[i].selected = false;
    }
    controller.scope.selected_groups = [];

    for (i = 0; i < controller.scope.groups.length; i++) {
        if (controller.scope.groups[i].has_corner_selected(controller.scope.scaledX, controller.scope.scaledY)) {
            controller.scope.clear_selections();
            if (controller.scope.selected_groups.indexOf(controller.scope.groups[i]) === -1) {
                controller.scope.selected_groups.push(controller.scope.groups[i]);
            }
            controller.scope.groups[i].selected = true;
            controller.changeState(CornerSelected);
            controller.scope.pressedX = controller.scope.mouseX;
            controller.scope.pressedY = controller.scope.mouseY;
            controller.scope.pressedScaledX = controller.scope.scaledX;
            controller.scope.pressedScaledY = controller.scope.scaledY;

            return;
        } else if (controller.scope.groups[i].is_selected(controller.scope.scaledX, controller.scope.scaledY)) {
            controller.scope.clear_selections();
            if (controller.scope.selected_groups.indexOf(controller.scope.groups[i]) === -1) {
                controller.scope.selected_groups.push(controller.scope.groups[i]);
            }
            controller.scope.groups[i].selected = true;
            controller.changeState(Selected1);
            controller.scope.pressedX = controller.scope.mouseX;
            controller.scope.pressedY = controller.scope.mouseY;
            controller.scope.pressedScaledX = controller.scope.scaledX;
            controller.scope.pressedScaledY = controller.scope.scaledY;

            return;
        }
    }

    controller.next_controller.handle_message(msg_type, $event);

};
_Ready.prototype.onMouseDown.transitions = ['Selected1', 'CornerSelected'];


_Ready.prototype.onNewGroup = function (controller, msg_type, message) {
    controller.scope.hide_groups = false;
    controller.scope.new_group_type = message.type;
    controller.changeState(Placing);
};
_Ready.prototype.onNewGroup.transitions = ['Placing'];

_Ready.prototype.onPasteGroup = function (controller, msg_type, message) {

	var scope = controller.scope;
    scope.hide_groups = false;

    scope.pressedX = scope.mouseX;
    scope.pressedY = scope.mouseY;
    scope.pressedScaledX = scope.scaledX;
    scope.pressedScaledY = scope.scaledY;

    var group = new models.Group(controller.scope.group_id_seq(),
                                 message.group.name,
                                 message.group.type,
                                 scope.scaledX,
                                 scope.scaledY,
                                 scope.scaledX + message.group.x2,
                                 scope.scaledY + message.group.y2,
                                 false);

    scope.send_control_message(new messages.GroupCreate(scope.client_id,
                                                        group.id,
                                                        group.x1,
                                                        group.y1,
                                                        group.x2,
                                                        group.y2,
                                                        group.name,
                                                        group.type));

    scope.groups.push(group);
    scope.selected_groups.push(group);
    group.selected = true;
    controller.changeState(Selected2);
};
_Ready.prototype.onPasteGroup.transitions = ['Selected2'];



_EditLabel.prototype.start = function (controller) {
    controller.scope.selected_groups[0].edit_label = true;
};

_EditLabel.prototype.end = function (controller) {
    controller.scope.selected_groups[0].edit_label = false;
};


_EditLabel.prototype.onMouseDown = function (controller) {

    controller.changeState(Ready);

};
_EditLabel.prototype.onMouseDown.transitions = ['Ready'];


_EditLabel.prototype.onKeyDown = function (controller, msg_type, $event) {
    //Key codes found here:
    //https://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
	var item = controller.scope.selected_groups[0];
    var previous_name = item.name;
	if ($event.keyCode === 8 || $event.keyCode === 46) { //Delete
		item.name = item.name.slice(0, -1);
	} else if ($event.keyCode >= 48 && $event.keyCode <=90) { //Alphanumeric
        item.name += $event.key;
	} else if ($event.keyCode >= 186 && $event.keyCode <=222) { //Punctuation
        item.name += $event.key;
	} else if ($event.keyCode === 13) { //Enter
        controller.changeState(Selected2);
	} else if ($event.keyCode === 32) { //Space
        item.name += " ";
    } else {
        console.log($event.keyCode);
    }
    controller.scope.send_control_message(new messages.GroupLabelEdit(controller.scope.client_id,
                                                                      item.id,
                                                                      item.name,
                                                                      previous_name));
};
_EditLabel.prototype.onKeyDown.transitions = ['Selected2'];

_Selected2.prototype.onNewGroup = function (controller, msg_type, $event) {

    controller.changeState(Ready);
    controller.handle_message(msg_type, $event);

};
_Selected2.prototype.onNewGroup.transitions = ['Ready'];


_Selected2.prototype.onMouseDown = function (controller, msg_type, $event) {

    controller.scope.pressedX = controller.scope.mouseX;
    controller.scope.pressedY = controller.scope.mouseY;
    controller.scope.pressedScaledX = controller.scope.scaledX;
    controller.scope.pressedScaledY = controller.scope.scaledY;



    var groups = controller.scope.selected_groups;
    controller.scope.selected_groups = [];
    var i = 0;
    for (i = 0; i < groups.length; i++) {
        if (groups[i].has_corner_selected(controller.scope.scaledX, controller.scope.scaledY)) {
            controller.scope.selected_groups = [];
            break;
        }
        else if (groups[i].is_selected(controller.scope.scaledX, controller.scope.scaledY)) {
            if (controller.scope.selected_groups.indexOf(groups[i]) === -1) {
                controller.scope.selected_groups.push(groups[i]);
            }
        }
    }

    if (controller.scope.selected_groups.length > 0) {
        controller.changeState(Selected3);
    } else {
        controller.changeState(Ready);
        controller.handle_message(msg_type, $event);
    }

};
_Selected2.prototype.onMouseDown.transitions = ['Ready', 'Selected3'];


_Selected2.prototype.onKeyDown = function (controller, msg_type, $event) {

    if ($event.keyCode === 8) {
        //Delete
        controller.changeState(Ready);

        var i = 0;
        var index = -1;
        var groups = controller.scope.selected_groups;
        controller.scope.selected_groups = [];
        for (i = 0; i < groups.length; i++) {
            index = controller.scope.groups.indexOf(groups[i]);
            if (index !== -1) {
                groups[i].selected = false;
                groups[i].remote_selected = false;
                controller.scope.groups.splice(index, 1);
            }
            controller.scope.send_control_message(new messages.GroupDestroy(controller.scope.client_id,
                                                                            groups[i].id,
                                                                            groups[i].x1,
                                                                            groups[i].y1,
                                                                            groups[i].x2,
                                                                            groups[i].y2,
                                                                            groups[i].name));
        }
    } else {
        controller.next_controller.handle_message(msg_type, $event);
    }
};
_Selected2.prototype.onKeyDown.transitions = ['Ready'];


_Placing.prototype.onMouseDown = function (controller) {

	var scope = controller.scope;
    var group = null;

    scope.pressedX = scope.mouseX;
    scope.pressedY = scope.mouseY;
    scope.pressedScaledX = scope.scaledX;
    scope.pressedScaledY = scope.scaledY;

    scope.clear_selections();

    var id = scope.group_id_seq();

    group = new models.Group(id,
                             titlecase.toTitleCase("" + scope.new_group_type + id),
                             scope.new_group_type,
                             scope.scaledX,
                             scope.scaledY,
                             scope.scaledX,
                             scope.scaledY,
                             false);
    scope.send_control_message(new messages.GroupCreate(scope.client_id,
                                                        group.id,
                                                        group.x1,
                                                        group.y1,
                                                        group.x2,
                                                        group.y2,
                                                        group.name,
                                                        group.type));

    scope.groups.push(group);
    scope.selected_groups.push(group);
    group.selected = true;
    group.selected_corner = models.BOTTOM_RIGHT;

    controller.scope.new_group_type = null;

    controller.changeState(Resize);
};
_Placing.prototype.onMouseDown.transitions = ['CornerSelected'];

