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

self.clusters = new Object();
self.clusters['nodes'] = new Array();
self.clusters['clusters'] = new Array();
self.clusters['max_request_count'] = 0;

for (var i in config.clusters) {
    var cluster_conf = config.clusters[i];
    var register = false;

    if (cluster_conf.nodes.length > 0) {
        for(var idx in cluster_conf.nodes) {
            var node = cluster_conf.nodes[idx];
            var conn = monitorFactory.create(cluster_conf.name, 
                                             cluster_conf.type, 
                                             node.host, node.port);
            conn['name'] = node.name;
            conn['cluster_name'] = cluster_conf.name;
            conn['cluster_length'] = cluster_conf.nodes.length;
            conn['type'] = cluster_conf.type;
            self.clusters.nodes.push(conn);
            self.clusters.max_request_count++;
        }

        var cluster_info = {
            "name": cluster_conf.name,
            "length": cluster_conf.nodes.length,
            "type": cluster_conf.type,
        };

        self.clusters.clusters.push(cluster_info);
    }
}

require('./routes/index').add_routes(app, self.clusters);
require('./routes/groups').add_routes(app, self.clusters);

setInterval(function() {
    if (self.check == false) {
        self.check = true;
        self.request_count = self.clusters.max_request_count;
        self.infos = new Object();
        for (var i in self.clusters.nodes) {
            var node = self.clusters.nodes[i];
            var cluster = self.infos[node.cluster_name];
            if (typeof cluster == "undefined") {
                self.infos[node.cluster_name] = new Object();
                self.infos[node.cluster_name]['commands'] = 0;
                self.infos[node.cluster_name]['length'] = node.cluster_length;
                self.infos[node.cluster_name]['success_count'] = 0;
                self.infos[node.cluster_name]['error_count'] = 0;
                self.infos[node.cluster_name]['nodes'] = new Array();
            }

            info(node);
        }
    }
},config.interval);

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
            self.infos[client.cluster_name]['error_count']++;
        } else {
            o = parseInfo(res);
            o["status"] = "ok";
            self.infos[client.cluster_name]['success_count']++;
        }
        o["port"] = client.port;
        o["host"] = client.host;
        o["name"] = client.name;
        o["cluster_name"] = client.cluster_name;
        o["type"] = client.type;

        self.infos[client.cluster_name]['commands'] += parseInt(o.total_commands_processed);
        self.infos[client.cluster_name]['nodes'].push(o);

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

