var util = require('util');

function Storage() {
    this.infos = null;
}

Storage.prototype.report_all = function(callback) {
    callback(null, { clusters: this.infos});
};

Storage.prototype.store = function(infos) {
    this.infos = infos;
};

module.exports = Storage;
