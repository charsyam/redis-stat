/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , redis = require('redis')
  , config = require('./config.json')
  , path = require('path')
  , Storage = require('./storage')
  , monitorFactory = require('./monitor/factory');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

var storage = new Storage();
require('./routes/getdata').add_routes(app, storage);

var self = this;
self.request_count = 0;
self.check = false;

self.clusters = new Array();
self.max_request_count = 0;

for (var i in config.clusters) {
    var cluster = config.clusters[i];
    var nodes = new Array();
    var register = false;
    for(var idx in cluster.nodes) {
        var node = cluster.nodes[idx];
        nodes[idx] = monitorFactory.create(cluster.name, cluster.type, node.host, node.port);
        nodes[idx]['name'] = node.name;
        self.max_request_count++;
        register = true;
    }

    if (register == true) {
        var cluster_info = {
            'name': cluster.name,
            'type': cluster.type,
            'nodes': nodes
        };
        self.clusters.push(cluster_info);
    }
}

require('./routes/index').add_routes(app, self.clusters);

function report() {
    self.request_count--;
}

self.infos = new Object();
setInterval(function() {
    if (self.check == false) {
        self.check = true;
        self.request_count = self.max_request_count;
        self.infos['nodes'] = new Array();
        for (var i in self.clusters) {
            var cluster = self.clusters[i];
            self.infos[cluster.name] = 0;
            for (var idx in cluster.nodes) {
                var node = cluster.nodes[idx];
                info(node);
            }
        }
    }
},2000);

function info(client) {
    client.info(function(err,res){
        if (err) {
            o = {
                "redis_version": "0.0.0",
                "uptime_in_seconds": 0,
                "connected_clients" : 0,
                "connected_slaves": 0, 
                "used_memory_human": 0, 
                "used_memory_peak_human": 0,
                "used_memory_rss": 0, 
                "aof_enabled": 0, 
                "total_commands_processed": 0,
                "expired_keys": 0, 
                "evicted_keys": 0,
                "keyspace_hits": 0, 
                "keyspace_misses": 0, 
                "role": "error", 
                "used_cpu_sys": 0,
                "used_cpu_user": 0,
                "status": "fail"
            };
        } else {
            o = parseInfo(res);
            o["status"] = "ok";
        }
        o["port"] = client.port;
        o["host"] = client.host;
        o["name"] = client.name;
        o["cluster_name"] = client.cluster_name;
        o["type"] = client.type;

        self.infos[client.cluster_name] += parseInt(o.total_commands_processed);
        self.infos.nodes.push(o);


        self.request_count--;
        if (self.request_count == 0) {
            storage.store(self.infos);
            self.check = false;
        }
    });
}

function parseInfo( info ) {
    var lines = info.split( "\r\n" );
    var obj = {
        "redis_version": "0.0.0",
        "uptime_in_seconds": 0,
        "connected_clients" : 0,
        "connected_slaves": 0, 
        "used_memory_human": 0, 
        "used_memory_peak_human": 0,
        "used_memory_rss": 0, 
        "aof_enabled": 0, 
        "total_commands_processed": 0,
        "expired_keys": 0, 
        "evicted_keys": 0,
        "keyspace_hits": 0, 
        "keyspace_misses": 0, 
        "role": "error", 
        "used_cpu_sys": 0,
        "used_cpu_user": 0 
    };
    for ( var i = 0, l = info.length; i < l; i++ ) {
        var line = lines[ i ];
        if ( line && line.split ) {
            line = line.split( ":" );
            if ( line.length > 1 ) {
                var key = line.shift( );
                if( key == "redis_version" ||
                        key == "uptime_in_seconds" ||
                        key == "connected_clients" ||
                        key == "connected_slaves" ||
                        key == "used_memory_human" ||
                        key == "used_memory_peak_human" ||
                        key == "used_memory_rss" ||
                        key == "aof_enabled" ||
                        key == "total_commands_processed" ||
                        key == "expired_keys" ||
                        key == "evicted_keys" ||
                        key == "keyspace_hits" ||
                        key == "keyspace_misses" ||
                        key == "role" ||
                        key == "used_cpu_sys" ||
                        key == "used_cpu_user" )
                    obj[ key ] = line.join( ":" );
            }
        }
    }
    return obj;
}

