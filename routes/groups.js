
/*
 * GET home page.
 */

module.exports.add_routes = function(app, clusters) {
    app.get('/groups', function(req, res) {
        res.render('groups', { title: 'Redis-Stat', 
            clusters: clusters});
    });
};
