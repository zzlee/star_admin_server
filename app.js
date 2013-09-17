var systemConfig = require('./system_configuration.js').getInstance();
if ( (systemConfig.HOST_STAR_COORDINATOR_URL===undefined) || (systemConfig.IS_STAND_ALONE===undefined) ) {
    console.log("ERROR: system_configuration.json is not properly filled!");
    process.exit(1);
}
global.systemConfig = systemConfig;


/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var http = require('http');
var https = require('https');
var path = require('path');
var crypto = require('crypto');
var Db = require('mongodb').Db;
var dbserver = require('mongodb').Server;
var mongoStore = require('connect-mongodb');
var fs = require('fs');
var path = require('path');
var winston = require('winston');
var async = require('async');

/**
 * File dependencies.
 */
var globalConnectionMgr = require('./global_connection_mgr.js');
var youtubeMgr = require('./youtube_mgr.js');
var ugcSerialNoMgr = require('./ugc_serial_no_mgr.js');

var app = express();

var workingPath = process.cwd();
var dbserver_config = new dbserver(systemConfig.MONGO_DB_SERVER_ADDRESS, 27017, {auto_reconnect: true, native_parser: true} );
var fmdb = new Db('feltmeng', dbserver_config, {});


var logDir = path.join(workingPath,'log');
if (!fs.existsSync(logDir) ){
    fs.mkdirSync(logDir);
}

require('winston-mongodb').MongoDB;
var logger = new(winston.Logger)({
    transports: [ 
        new winston.transports.MongoDB({host:systemConfig.MONGO_DB_SERVER_ADDRESS, db: 'feltmeng', level: 'info'}),
        new winston.transports.File({ filename: './log/winston.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:systemConfig.MONGO_DB_SERVER_ADDRESS, db: 'feltmeng', level: 'info'}),
                    new winston.transports.File({filename: './log/exceptions.log'})
    ]
    
});  

global.logger = logger;  
  
var userProjectDir = path.join(workingPath,'public/contents/user_project');
if (!fs.existsSync(userProjectDir) ){
    fs.mkdirSync(userProjectDir);
}

var tempDir = path.join(workingPath,'public/contents/temp');
if (!fs.existsSync(tempDir) ){
    fs.mkdirSync(tempDir);
}



// all environments
app.set('port', process.env.PORT || 80);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());

//-- start of session management ? --
app.use(express.query());
app.use(express.cookieParser('kooBkooCedoN'));
app.use(express.session({
    secret: "thesecretoffeltmeng",
    maxAge: 24 * 60 * 60 * 1000 ,
    store: new mongoStore({ db: fmdb })
}));  // sessionID save as "_id" of session doc in MongoDB.

app.use(express.methodOverride());

/* Must put this before app.router. */
app.use( function (req, res, next) {
    res.locals.user = req.session.user;
    next(); // Please Don't forget next(), otherwise suspending;
});  
//-- end of session management ? --

app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

if ('production' == app.get('env')) {
    app.use(express.errorHandler({ dumpExceptions: true })); 
}


youtubeMgr.refreshToken();

async.waterfall([
    function(callback){
        //Initialize ugcSerialNoMgr
        ugcSerialNoMgr.init(function(err) {
            if (!err){
                callback(null);
            }
            else {
                callback("Failed to initialize ugcSerialNoMgr: "+err);
            }
        });
    },
    function(callback){
        //Defiene the RESTful APIs
        var routes = require('./routes');
        global.routes = routes;
        global.app = app;

        require('./restful_api').init();
        
        http.createServer(app).listen(app.get('port'), function(){
            console.log("Express server listening on port " + app.get('port'));
            callback(null);
        });
    }
], function (err) {
    if (err){
        console.log('app.js initializes with errors: '+err);
    }
});

