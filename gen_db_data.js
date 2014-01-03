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
        new winston.transports.File({ filename: './log/gen_db_data.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info'}),
                    new winston.transports.File({filename: './log/gen_db_data_exceptions.log'})
    ]
    
});  

global.logger = logger;  



//== main part ==
//statistics data gen
var db = require('./db.js');
var async = require('async');
var ugcModel = db.getDocModel("ugc");
var programTimeSlotModel = db.getDocModel("programTimeSlot");

ugcModel.find({createdOn: {$gt: new Date("2013/12/1")}}).exec(function(err, ugcList){
    //console.log('ugcList=');
    //console.dir(ugcList);
    
    var indexList = [];
    for (var i=0; i<ugcList.length; i++) {
        //console.dir(ugcList[i]);
        indexList.push(i);
        //ugcList[i].miixMovieVideo_count = 1;
        
    }
    //console.dir(indexList);
    
    var iteratorUpdateUgc = function(anIndex, callback){
        
        console.log( "updating " + ugcList[anIndex].no  );

        programTimeSlotModel.count({"content.no": ugcList[anIndex].no}).exec(function(errOfCount, doohSubmitCount){
            
            
            if (!errOfCount) {
                ugcList[anIndex].doohSubmitTimes = doohSubmitCount;
                ugcList[anIndex].save(callback);
                console.log("updated "+ ugcList[anIndex].no);
            }
            else {
                callback("Failed to get doohSubmitCount of UGC "+anIndex+": "+errOfCount);
            }
            
        });

    };
    
    async.eachSeries(indexList, iteratorUpdateUgc, function(err){
        
        if (!err) {
            console.log('done!');
        }
        else {
            console.log('error! : '+err);
        }
        process.exit(1);
    });
});


