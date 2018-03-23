var fsm = require('./fsm.js');
var button = require('./button.js');
var util = require('./util.js');

function Device(id, name, x, y, type) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.height = type === "host" ? 15 : 50;
    this.width = 50;
    this.size = 50;
    this.type = type;
    this.selected = false;
    this.remote_selected = false;
    this.edit_label = false;
    this.status = null;
    this.working = false;
    this.tasks = [];
    this.shape = type === "router" ? "circular" : "rectangular";
    this.interface_seq = util.natural_numbers(0);
    this.interfaces = [];
}
exports.Device = Device;

Device.prototype.is_selected = function (x, y) {

    return (x > this.x - this.width &&
            x < this.x + this.width &&
            y > this.y - this.height &&
            y < this.y + this.height);

};

Device.prototype.describeArc = util.describeArc;


function Interface(id, name) {
    this.id = id;
    this.name = name;
    this.link = null;
    this.device = null;
    this.edit_label = false;
    this.dot_x = null;
    this.dot_y = null;
}
exports.Interface = Interface;

Interface.prototype.is_selected = function (x, y) {

    if (this.link === null || this.device === null) {
        return false;
    }

    var d = Math.sqrt(Math.pow(x - this.device.x, 2) + Math.pow(y - this.device.y, 2));
    return this.link.is_selected(x, y) && (d < this.dot_d + 30);
};

Interface.prototype.dot_distance = function () {
    this.dot_d = Math.sqrt(Math.pow(this.device.x - this.dot_x, 2) + Math.pow(this.device.y - this.dot_y, 2));
};

Interface.prototype.dot = function () {
    if (this.link === null || this.device === null) {
        return;
    }
    var p;
    if (this.device.shape === "circular") {

        var theta = this.link.slope_rads();
        if (this.link.from_interface === this) {
            theta = theta + Math.PI;
        }
        p = {x: this.device.x - this.device.size * Math.cos(theta),
                y: this.device.y - this.device.size * Math.sin(theta)};
        this.dot_x = p.x;
        this.dot_y = p.y;
        this.dot_distance();
        return;
    }

    var x1;
    var y1;
    var x2;
    var y2;
    var x3;
    var y3;
    var x4;
    var y4;
    var param1;
    var param2;

    x3 = this.link.to_device.x;
    y3 = this.link.to_device.y;
    x4 = this.link.from_device.x;
    y4 = this.link.from_device.y;

    x1 = this.device.x - this.device.width;
    y1 = this.device.y - this.device.height;
    x2 = this.device.x + this.device.width;
    y2 = this.device.y - this.device.height;

    p = util.intersection(x3, y3, x4, y4, x1, y1, x2, y2);
    param1 = util.pCase(p.x, p.y, x1, y1, x2, y2);
    param2 = util.pCase(p.x, p.y, x3, y3, x4, y4);
    if (param1 >= 0 && param1 <= 1 && param2 >= 0 && param2 <= 1) {
        this.dot_x = p.x;
        this.dot_y = p.y;
        this.dot_distance();
        return;
    }


    x1 = this.device.x - this.device.width;
    y1 = this.device.y + this.device.height;
    x2 = this.device.x + this.device.width;
    y2 = this.device.y + this.device.height;

    p = util.intersection(x3, y3, x4, y4, x1, y1, x2, y2);
    param1 = util.pCase(p.x, p.y, x1, y1, x2, y2);
    param2 = util.pCase(p.x, p.y, x3, y3, x4, y4);
    if (param1 >= 0 && param1 <= 1 && param2 >= 0 && param2 <= 1) {
        this.dot_x = p.x;
        this.dot_y = p.y;
        this.dot_distance();
        return;
    }

    x1 = this.device.x + this.device.width;
    y1 = this.device.y - this.device.height;
    x2 = this.device.x + this.device.width;
    y2 = this.device.y + this.device.height;

    p = util.intersection(x3, y3, x4, y4, x1, y1, x2, y2);
    param1 = util.pCase(p.x, p.y, x1, y1, x2, y2);
    param2 = util.pCase(p.x, p.y, x3, y3, x4, y4);
    if (param1 >= 0 && param1 <= 1 && param2 >= 0 && param2 <= 1) {
        this.dot_x = p.x;
        this.dot_y = p.y;
        this.dot_distance();
        return;
    }

    x1 = this.device.x - this.device.width;
    y1 = this.device.y - this.device.height;
    x2 = this.device.x - this.device.width;
    y2 = this.device.y + this.device.height;

    p = util.intersection(x3, y3, x4, y4, x1, y1, x2, y2);
    param1 = util.pCase(p.x, p.y, x1, y1, x2, y2);
    param2 = util.pCase(p.x, p.y, x3, y3, x4, y4);
    if (param1 >= 0 && param1 <= 1 && param2 >= 0 && param2 <= 1) {
        this.dot_x = p.x;
        this.dot_y = p.y;
        this.dot_distance();
        return;
    }

};

function Link(id, from_device, to_device, from_interface, to_interface) {
    this.id = id;
    this.from_device = from_device;
    this.to_device = to_device;
    this.from_interface = from_interface;
    this.to_interface = to_interface;
    this.selected = false;
    this.remote_selected = false;
    this.status = null;
    this.edit_label = false;
    this.name = "";
}
exports.Link = Link;

Link.prototype.is_selected = function (x, y) {
    // Is the distance to the mouse location less than 25 if on the label side
    // or 5 on the other from the shortest line to the link?

    if (this.to_device === null) {
        return false;
    }
    var d = util.pDistance(x,
                           y,
                           this.from_device.x,
                           this.from_device.y,
                           this.to_device.x,
                           this.to_device.y);
    if (util.cross_z_pos(x,
                         y,
                         this.from_device.x,
                         this.from_device.y,
                         this.to_device.x,
                         this.to_device.y)) {
        return d < 10;
    } else {
        return d < 10;
    }
};

Link.prototype.slope_rads = function () {
    //Return the slope in degrees for this link.
    var x1 = this.from_device.x;
    var y1 = this.from_device.y;
    var x2 = this.to_device.x;
    var y2 = this.to_device.y;
    return Math.atan2(y2 - y1, x2 - x1);
};

Link.prototype.slope = function () {
    //Return the slope in degrees for this link.
    var x1 = this.from_device.x;
    var y1 = this.from_device.y;
    var x2 = this.to_device.x;
    var y2 = this.to_device.y;
    return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 180;
};

Link.prototype.pDistanceLine = function (x, y) {

    var x1 = this.from_device.x;
    var y1 = this.from_device.y;
    var x2 = this.to_device.x;
    var y2 = this.to_device.y;
    return util.pDistanceLine(x, y, x1, y1, x2, y2);
};


Link.prototype.length = function () {
    //Return the length of this link.
    var x1 = this.from_device.x;
    var y1 = this.from_device.y;
    var x2 = this.to_device.x;
    var y2 = this.to_device.y;
    return Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2));
};

Link.prototype.plength = function (x, y) {
    //Return the length of this link.
    var x1 = this.from_device.x;
    var y1 = this.from_device.y;
    var x2 = this.to_device.x;
    var y2 = this.to_device.y;
    return util.pDistance(x, y, x1, y1, x2, y2);
};


function Button(name, x, y, width, height, callback) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.callback = callback;
    this.is_pressed = false;
    this.mouse_over = false;
    this.fsm = new fsm.FSMController(this, button.Start, null);
}
exports.Button = Button;


Button.prototype.is_selected = function (x, y) {

    return (x > this.x &&
            x < this.x + this.width &&
            y > this.y &&
            y < this.y + this.height);

};

function Task(id, name) {
    this.id = id;
    this.name = name;
    this.status = null;
    this.working = null;
}
exports.Task = Task;

Task.prototype.describeArc = util.describeArc;
