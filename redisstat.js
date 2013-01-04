
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , redis = require('redis')
  , config = require('./config.json')
  , path = require('path')
  , Storage = require('./storage');

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

var redislist = new Array();
var self = this;
self.request_count = 0;
self.check = false;

for (var i in config.groups) {
    var group = config.groups[i];
    if (group.plugin == "redis") {
        for(var idx in group.servers) {
            var server = group.servers[idx];
            redislist[idx] = redis.createClient(server.port, server.ip);
            redislist[idx]['name'] = server.name;
        }
        require('./routes/index').add_routes(app, redislist);
    }
}

setInterval(function() {
    if (self.check == false) {
        self.check = true;
        self.request_count = redislist.length;
        self.infos = new Array();
        for (var i in redislist) {
            var client = redislist[i];
            info(client);
        }
    }
},2000);

function info(client) {
    client.info(function(err,res){
        if (err) {
            o = new Object();
            o["status"] = "fail";
        } else {
            o = parseInfo(res);
            o["status"] = "ok";
        }
        o["port"] = client.port;
        o["host"] = client.host;
        o["name"] = client.name;
        self.infos.push(o);

        self.request_count--;
        if (self.request_count == 0) {
            storage.store(self.infos);
            self.check = false;
        }
    });
}

function parseInfo( info ) {
    var lines = info.split( "\r\n" );
    var obj = { };
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

