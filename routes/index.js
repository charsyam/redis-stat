
/*
 * GET home page.
 */

module.exports.add_routes = function(app, storage) {
    app.get('/', function(req, res) {
        storage.report_all(function(err, data) {
            res.render('index', { title: 'Redis-Stat', 
                                group: req.query['group'],
                                clusters: data});
        });
    });
};
