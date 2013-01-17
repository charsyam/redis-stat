var Redis = require('redis');

function MonitorFactory() {
    this.monitor_modules = new Array();
}

module.exports = {
    create : function(cluster_name, module_name, host, port) {
                 var r = Redis.createClient(port, host);
                 r['cluster_name'] = cluster_name;
                 r['type'] = module_name;
                 r.on("error", function(err) {
                         console.error("Error connecting to redis", err);
                         });

/*
    var self = this;
    var monitor_module = self.monitor_modules[module_name];
    if (monitor_module == 'undefined') {
        var filePath = './modules/' + module_name;
        monitor_module = require(filePath);
    }

    return module.create(host,port);
*/
                return r;
    }
};
