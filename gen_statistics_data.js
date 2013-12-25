//== env set up ==
var systemConfig = require('./system_configuration.js').getInstance();
if ( (systemConfig.HOST_STAR_COORDINATOR_URL===undefined) || (systemConfig.IS_STAND_ALONE===undefined) ) {
    console.log("ERROR: system_configuration.json is not properly filled!");
    process.exit(1);
}
global.systemConfig = systemConfig;

var Db = require('mongodb').Db;
var dbserver = require('mongodb').Server;

var fs = require('fs');
var path = require('path');
var url = require('url');
var winston = require('winston');
var async = require('async');


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
        new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info'}),
        new winston.transports.File({ filename: './log/gen_live_content_statistics.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info'}),
                    new winston.transports.File({filename: './log/gen_live_content_statistics_exceptions.log'})
    ]
    
});  

global.logger = logger;  



//== main part ==
//statistics data gen
var db = require('./db.js');
var async = require('async');
var ugcModel = db.getDocModel("ugc");
var memberListInfoModel = db.getDocModel("memberListInfo");

memberListInfoModel.find({"hot":true}).exec(function(err, memberList){
    //console.log('memberList=');
    //console.dir(memberList);
    
    var indexList = [];
    for (var i=0; i<memberList.length; i++) {
        //console.dir(memberList[i]);
        indexList.push(i);
        //memberList[i].miixMovieVideo_count = 1;
        
    }
    //console.dir(indexList);
    
    var iteratorUpdateAMemberInfo = function(anIndex, callback){
        memberList[anIndex].miixMovieVideo_count = 1+ Math.round( 3*Math.random()*Math.random() );
        memberList[anIndex].doohPlay_count = Math.floor( memberList[anIndex].miixMovieVideo_count*(1+3.2*Math.random()*Math.random()) );
        memberList[anIndex].fbLike_count = Math.floor( memberList[anIndex].doohPlay_count*62*Math.random()*Math.random() );
        memberList[anIndex].fbComment_count = Math.floor( memberList[anIndex].fbLike_count*1.1*Math.random() );
        memberList[anIndex].fbShare_count = Math.round( memberList[anIndex].fbLike_count*0.25*Math.random()*Math.random() );

        memberList[anIndex].save(callback);
        console.log("updated "+anIndex);
    };
    
    async.eachSeries(indexList, iteratorUpdateAMemberInfo, function(err){
        
        if (!err) {
            console.log('done!');
        }
        else {
            console.log('error! : '+err);
        }
        process.exit(1);
    });
});


