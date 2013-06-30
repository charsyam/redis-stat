
/*
 * GET home page.
 */

module.exports.add_routes = function(app, storage) {
    app.get('/groups', function(req, res) {
        storage.report_all(function(err, data) {
            res.render('groups', { title: 'Redis-Stat-Groups', 
                clusters: data});
        });
    });
};
