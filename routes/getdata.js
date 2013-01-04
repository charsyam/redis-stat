module.exports.add_routes = function(app, storage){
    app.get('/getdata', function(req, res) {
        storage.report_all(function(err, data) {
            res.json(data);
        });
    });
};
