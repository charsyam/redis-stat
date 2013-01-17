function MonitorBase() {}

MonitorBase.prototype.create = function(host, port) {
    return "undefined";
};

MonitorBase.prototype.info = function() {
    var obj = {
        'status': 'fail'
    };

    return obj;
};

module.exports = MonitorBase;
