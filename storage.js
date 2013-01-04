var util = require('util');

function Storage() {
    this.infos = null;
}

Storage.prototype.report_all = function(callback) {
    var self = this;
    callback(null, {services: self.infos});
};

Storage.prototype.store = function(infos) {
    var self = this;
    var old_infos = self.infos;
    self.infos = infos;
    delete old_infos;
};

module.exports = Storage;
