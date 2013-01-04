
/*
 * GET home page.
 */

module.exports.add_routes = function(app, servers) {
    console.log(servers);
    app.get('/', function(req, res) {
        res.render('index', { title: 'Redis-Stat', 
            servers: servers });
    });
};

