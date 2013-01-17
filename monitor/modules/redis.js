var Redis = require('redis');

function redisClient(host, port) {
    this.r = Redis.createClient(port,host);
    this.r.on("error", function(err) {
        console.error("Error connecting to redis", err);
    });

    var self = this;
    this.info = function() {
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
            self.infos.push(o);

            self.request_count--;
            if (self.request_count == 0) {
                storage.store(self.infos);
                self.check = false;
            }
        });
    };
};

function redis() {}

redis.prototype.create = function(host, port) {
    return r;
}

redis.prototype.info = function() {

}

module.exports = redis;
