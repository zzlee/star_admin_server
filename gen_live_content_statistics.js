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
//statistics: program fail rate statistics
var db = require('./db.js');
var async = require('async');
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var fs = require('fs');

var o = {};
 
o.map = function(){ 
    var programTime = new Date(this.timeslot.start);
    var programDateString = programTime.getFullYear()+'/'+String(programTime.getMonth()+1)+'/'+programTime.getDate();
    var programDateObj = {y:programTime.getFullYear(), m:programTime.getMonth()+1, d:programTime.getDate() };
    var notCheckedCount = 0;
    var correctCount = 0;
    var incorrectCount = 0;
    var sourceNotPlayedCount = 0;

    if ( (this.liveState == 'not_checked') ) {
        //console.log('this.liveState='+this.liveState);
        notCheckedCount = 1;
    }
    else if ( (this.liveState == 'correct') ) {
        //console.log('this.liveState='+this.liveState);
        correctCount = 1;
    }
    else if ( (this.liveState == 'source_not_played') ) {
        //console.log('this.liveState='+this.liveState);
        sourceNotPlayedCount = 1;
    }
    else if ( (this.liveState == 'incorrect') ) {
        //console.log('this.liveState='+this.liveState);
        incorrectCount = 1;
    }
     
    emit(programDateObj, {
            count:1, 
            notCheckedCount:notCheckedCount, 
            correctCount:correctCount, 
            sourceNotPlayedCount:sourceNotPlayedCount, 
            incorrectCount:incorrectCount }); 
};

o.reduce = function(key, countObjVals){ 
    reducedVal = { 
            count:0, 
            notCheckedCount:0, 
            correctCount:0, 
            sourceNotPlayedCount:0,
            incorrectCount:0 };

    for (var idx = 0; idx < countObjVals.length; idx++) {
        reducedVal.count += countObjVals[idx].count;
        reducedVal.notCheckedCount += countObjVals[idx].notCheckedCount;
        reducedVal.correctCount += countObjVals[idx].correctCount;
        reducedVal.sourceNotPlayedCount += countObjVals[idx].sourceNotPlayedCount;
        reducedVal.incorrectCount += countObjVals[idx].incorrectCount;
    }
    
    return reducedVal;
};

//o.query = { "type":'UGC', "timeslot.start":{$gte: 1383235200000 } };
o.query = { "type":'UGC',  "timeslot.start":{$gte:(new Date('2013/11/18')).getTime(), $lt:(new Date()).getTime()} }; 

//o.finalize = function (key, reducedVal) {
//    reducedVal.failRate = Math.round(reducedVal.incorrectCount/reducedVal.count*100)+"%";
//    return reducedVal;
//};

o.out = { replace: 'tempOutput' };

programTimeSlotModel.mapReduce(o, function (err, model) {
    model.find().sort({_id:1}).exec(function (err, result) {
        if (!err){
            //console.log('result=');
            //console.dir(result);
            
            //var outString = "date, programs played, live content fails, fail rate\n";
            var outString = "date, programs played, not_checked, correct, source_not_played, incorrect\n";
            for (var i=0; i<result.length; i++) {
                //outString += result[i]._id.y+"/"+result[i]._id.m+"/"+result[i]._id.d+", "+result[i].value.count+", "+result[i].value.incorrectCount+", "+result[i].value.failRate+"\n";
                outString += result[i]._id.y+"/"+result[i]._id.m+"/"+result[i]._id.d+", "+
                            result[i].value.count+", "+
                            result[i].value.notCheckedCount+", "+
                            result[i].value.correctCount+", "+
                            result[i].value.sourceNotPlayedCount+", "+
                            result[i].value.incorrectCount+"\n";

            }
            console.log(outString);
            fs.writeFile('program_play_statistics.csv', outString, function (err) {
                if (err) throw err;
                console.log('program_play_statistics.csv is saved!');
                process.exit(1);
            });
            //process.exit(1);

        }
        else {
            console.log("err=");
            console.dir(err);
            process.exit(1);
        }
        
    });
});

