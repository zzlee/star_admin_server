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
        new winston.transports.File({ filename: './log/sp_log_analyse.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info'}),
                    new winston.transports.File({filename: './log/sp_log_analyse_exceptions.log'})
    ]
    
});  

global.logger = logger;  



//== main part ==
var logDateString = null;
var logString = null;
var db = require('./db.js');

async.waterfall([
     function(callback){
         //check the command line arguments
         if (!process.argv[2]) {
             console.log("Need to specify the date of log.  For example,\n  node log_analyse 2013/11/23");
             process.exit(1);
         }
         
         logDateString = process.argv[2];
         callback(null);
     },
     function(callback){
         //read the log file 
         var logFile = path.join(workingPath, 'scala_player_log', logDateString.replace(new RegExp('/', 'g'), '')+'.log');
         fs.readFile(logFile, {"encoding":"utf8"}, function (errOfReadFile, data) {
             //console.log("err="+err);
             //console.log(data.toString());
             if (!errOfReadFile) {
                 logString = data.toString();
                 callback(null);
             }
             else {
                 callback("Faile to read the log file "+logFile+": "+errOfReadFile);
             }
             
//             var hasIt = logString.indexOf("wow_pic-52902b8b59ec3438070000aa-20131123T041454840Z");
         });

     },
     function(callback){
         //update all the play into into program time slots
         var dayStart = (new Date(logDateString+' 0:00:00')).getTime();
         var dayEnd = (new Date(logDateString+' 23:59:59')).getTime()
         var programTimeSlotModel = db.getDocModel("programTimeSlot");
         
         //console.log('dayStart=%s dayEnd=%s', new Date(dayStart), new Date(dayEnd));
         
         programTimeSlotModel.find({ "timeslot.start": {$lte:dayEnd, $gte:dayStart}, "type": "UGC" }).sort({timeStamp:1}).exec(function (errOfFind, _programsOfThisDay) {
             if (!errOfFind) {
                 var programsOfThisDay = _programsOfThisDay;
                 
                 var indexList = [];
                 for (var i=0; i<programsOfThisDay.length; i++) {
                     indexList.push(i);
                 }
                 //console.dir(indexList);
                 
                 var iteratorUpdateProgramPlayingInfo = function(anIndex, cbOfIterator){
                     
                     var ugcProjectIdToSearch = programsOfThisDay[anIndex].content.projectId;
                     if (logString.indexOf(ugcProjectIdToSearch)>=0) {
                         //This program was concretely played on DOOH
                         programsOfThisDay[anIndex].canBeFoundInPlayerLog = "YES";
                         console.log("No %s is shown in Player's log.", programsOfThisDay[anIndex].content.no);
                     }
                     else {
                         //This program was NOT played on DOOH
                         programsOfThisDay[anIndex].canBeFoundInPlayerLog = "NO";
                         console.log("!! Cannot find  No %s in Player's log.", programsOfThisDay[anIndex].content.no);
                     }

                     programsOfThisDay[anIndex].save(cbOfIterator);
                 };
                 
                 async.eachSeries(indexList, iteratorUpdateProgramPlayingInfo, callback);
                              }
             else {
                 callback("Failed to query the programs of "+logDateString+": "+errOfFind);
             }
         });
         
     }
     
     
     
     
], function (errOfWaterfall, result) {
    if (!errOfWaterfall) {
        console.log('Scala Player log analysis done!');
    }
    else {
        console.log('Fail to perform log analyse:\n'+errOfWaterfall);
    }
    process.exit(1);
        
// result now equals 'done'    
});
     



  


