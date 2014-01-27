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
        new winston.transports.File({ filename: './log/modify_db.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info'}),
                    new winston.transports.File({filename: './log/modify_db_exceptions.log'})
    ]
    
});  

global.logger = logger;  



//== main part ==
//modify db data gen
var db = require('./db.js');
var async = require('async');
var ugcModel = db.getDocModel("ugc");
var programTimeSlotModel = db.getDocModel("programTimeSlot");

var programStartTime = '2014/1/25 15:20';
var oldUgcNo = 7699;
var newUgcNo = 7727;


async.waterfall([
    function(callback){
        //Get the program for changing content
        programTimeSlotModel.findOne({type:"UGC", "timeslot.start": (new Date(programStartTime)).getTime(), "content.no":oldUgcNo}).exec(function(err1, program){
            
            if (!err1){
                console.log('program=');
                console.dir(program);

                callback(null, program);
            }
            else {
                callback("Failed to query the program for changing content: "+err1, null);

            }
            
        });


    },
    function(program, callback){
        //Get the new UGC to use
        ugcModel.findOne({no: newUgcNo},'_id genre contentGenre projectId fileExtension no ownerId url mustPlay').exec(function(err2, newUgc){
            
            if (!err2){
                //console.log('newUgc=');
                //console.dir(newUgc);
                
                callback(null, program, newUgc);
            }
            else {
                callback("Failed to query the new UGC to use: "+err2, null, null);
            }
           
        });

    },
    function(program, newUgc, callback){
        //Save the new UGC to the program
        program.content = newUgc;
        program.save(function(errOfSave, result){
            if (!errOfSave){
                console.log('result=');
                console.dir(result);
                
                callback(null);
            }
            else {
                callback("Failed to save the new UGC to the program: "+errOfSave);
            }
        });
        
    }
], function(err){
    if (!err) {
        console.log("Done!");
    }
    else {
        console.log("Error: "+err);
    }
    process.exit(1);
});
    


