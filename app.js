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
var url = require('url');
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

var mongoDbServerUrlObj = url.parse(systemConfig.HOST_MONGO_DB_SERVER_URL);
var mongoDbServerPort;
if ( mongoDbServerUrlObj.port  ){
    mongoDbServerPort = Number(mongoDbServerUrlObj.port);
}
else {
    mongoDbServerPort = 27017;
}
var dbserver_config = new dbserver(mongoDbServerUrlObj.hostname, mongoDbServerPort, {auto_reconnect: true, native_parser: true} );
var fmdb = new Db('feltmeng', dbserver_config, {});


var logDir = path.join(workingPath,'log');
if (!fs.existsSync(logDir) ){
    fs.mkdirSync(logDir);
}

require('winston-mongodb').MongoDB;
var logger = new(winston.Logger)({
    transports: [ 
        new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info', username: systemConfig.HOST_MONGO_DB_USER_NAME, password: systemConfig.HOST_MONGO_DB_PASSWORD}),
        new winston.transports.File({ filename: './log/winston.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info', username: systemConfig.HOST_MONGO_DB_USER_NAME, password: systemConfig.HOST_MONGO_DB_PASSWORD}),
                    new winston.transports.File({filename: './log/exceptions.log'})
    ]
    
});  

//var logger = {
//        info: function(){},
//        error: function(){}
//}

global.logger = logger;  
  
var tempDir = path.join(workingPath,'public/contents/temp');
if (!fs.existsSync(tempDir) ){
    fs.mkdirSync(tempDir);
}



// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
//app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());

//-- start of session management ? --
var DefaultDB = 'feltmeng';
var mongoUrlHead = systemConfig.HOST_MONGO_DB_SERVER_URL.substring(0,10);
var mongoUrlRoot = systemConfig.HOST_MONGO_DB_SERVER_URL.substring(10, systemConfig.HOST_MONGO_DB_SERVER_URL.length);
var mongoUrl = mongoUrlHead + systemConfig.HOST_MONGO_DB_USER_NAME +':'+ systemConfig.HOST_MONGO_DB_PASSWORD +'@'+ mongoUrlRoot + '/'+DefaultDB;

app.use(express.query());
app.use(express.cookieParser('kooBkooCedoN'));
app.use(express.session({
    secret: "thesecretoffeltmeng",
    maxAge: 24 * 60 * 60 * 1000 ,
    store: new mongoStore({ url: mongoUrl })
}));  // sessionID save as "_id" of session doc in MongoDB.

app.use(express.methodOverride());

/* Must put this before app.router. */
app.use( function (req, res, next) {
    if (res.locals) {
        res.locals.user = req.session.user;
    }    
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
    },
    function(callback){
        //tests
        
//        //adminBrowserMgr.showTrace() test
//        var adminBrowserMgr = require('./admin_browser_mgr.js');
//        setInterval(function(){
//            var trace = (new Date()).toString();
//            adminBrowserMgr.showTrace(null, trace);
//            //console.log('show trace: '+trace);
//        }, 2000);

//        //aggregate test
//        var db = require('./db.js');
//        var memberListInfoModel = db.getDocModel("memberListInfo");
//        memberListInfoModel.aggregate(
//                {$group:{ _id:"", totalFbLike:{$sum: "$fbLike_count"}, totalFbComment:{$sum: "$fbComment_count"}, totalFbShare:{$sum: "$fbShare_count"}} }, 
//                {$project:{ _id:0, totalFbLike: "$totalFbLike", totalFbComment: "$totalFbComment", totalFbShare: "$totalFbShare"}}, 
//                function(err, result){
//            console.log("result=");
//            console.dir(result);
//        });
        
//        //count test
//        var db = require('./db.js');
//        var ugcModel = db.getDocModel("ugc");
//        ugcModel.count(function(err, result){
//            console.log("result=");
//            console.dir(result);
//        });
        
//        //data gen
//        var db = require('./db.js');
//        var async = require('async');
//        var ugcModel = db.getDocModel("ugc");
//        var memberListInfoModel = db.getDocModel("memberListInfo");
//
//        memberListInfoModel.find({"hot":true}).exec(function(err, memberList){
//            //console.log('memberList=');
//            //console.dir(memberList);
//            
//            var indexList = [];
//            for (var i=0; i<memberList.length; i++) {
//                //console.dir(memberList[i]);
//                indexList.push(i);
//                //memberList[i].miixMovieVideo_count = 1;
//                
//            }
//            //console.dir(indexList);
//            
//            var iteratorUpdateAMemberInfo = function(anIndex, callback){
//                memberList[anIndex].miixMovieVideo_count = 1+ Math.floor( 3*Math.random()*Math.random()*Math.random() );
//                memberList[anIndex].doohPlay_count = Math.floor( memberList[anIndex].miixMovieVideo_count*(1+3.3*Math.random()*Math.random()) );
//                memberList[anIndex].fbLike_count = Math.floor( memberList[anIndex].doohPlay_count*66*Math.random()*Math.random() );
//                memberList[anIndex].fbComment_count = Math.floor( memberList[anIndex].fbLike_count*0.7*Math.random() );
//                memberList[anIndex].fbShare_count = Math.floor( memberList[anIndex].doohPlay_count*2.5*Math.random()*Math.random() );
//
//                memberList[anIndex].save(callback);
//                console.log("updated "+anIndex);
//            };
//            
//            async.eachSeries(indexList, iteratorUpdateAMemberInfo, function(err){
//                
//                if (!err) {
//                    console.log('done!');
//                }
//                else {
//                    console.log('error! : '+err);
//                }
//            });
//        });
        
//        //set shine
//        var db = require('./db.js');
//        var async = require('async');
//        var ugcModel = db.getDocModel("ugc");
//        var memberListInfoModel = db.getDocModel("memberListInfo");
//
//        memberListInfoModel.find({"hot":true}).exec(function(err, memberList){
//            //console.log('memberList=');
//            //console.dir(memberList);
//            
//            var shineList = [];
//            for (var i=0; i<memberList.length; i++) {
//                //console.dir(memberList[i]);
//                if ( ((i%3) == 0) && (i>900) ) {
//                    shineList.push({index:i, shine:false});
//                }
//                else {
//                    shineList.push({index:i, shine:true});
//
//                }
//                
//                    
//                
//            }
//            //console.dir(shineList);
//            
//            var iteratorUpdateAMemberInfo = function(aShineItem, callback){
//                memberList[aShineItem.index].shine = aShineItem.shine;
//
//                memberList[aShineItem.index].save(callback);
//                console.log("updated "+aShineItem.index);
//            };
//            
//            async.eachSeries(shineList, iteratorUpdateAMemberInfo, function(err){
//                
//                if (!err) {
//                    console.log('done!');
//                }
//                else {
//                    console.log('error! : '+err);
//                }
//            });
//        });




        
        
//        //test reading Scala Player logs 
//        var logFile = path.join(workingPath, 'scala_player_log/20131126.log');
//        fs.readFile(logFile, {"encoding":"utf8"}, function (err, data) {
//            if (err) throw err;
//            //console.log("err="+err);
//            //console.log(data.toString());
//            var logString = data.toString();
//            var hasIt = logString.indexOf("wow_pic-52902b8b59ec3438070000aa-20131123T041454840Z_");
//            console.log("hasIt="+hasIt);
//        });
        
        

      
        
        callback(null);
    }
], function (err) {
    if (err){
        console.log('app.js initializes with errors: '+err);
    }
});

