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
    
    var notChecked = 0, 
        correct = 0, 
        sourceNotPlayed = 0, 
        notGenerated = 0, 
        incorrect = 0, 
        badExposure = 0;
    
    switch(this.liveState) {
    case 'not_checked': 
        notChecked = 1;
        break;
    case 'correct':
        correct = 1;
        break;
    case 'source_not_played':
        sourceNotPlayed = 1;
        break;
    case 'not_generated':
        notGenerated = 1;
        break;
    case 'incorrect':
        incorrect = 1;
        break;
    case 'bad_exposure':
        badExposure = 1;
        break;
    }
    emit(programDateObj, {count:1, notChecked:notChecked, correct:correct, sourceNotPlayed:sourceNotPlayed, notGenerated:notGenerated, incorrect:incorrect, badExposure:badExposure });
//    emit(programDateObj, {count:1, notChecked:1}); 
//    emit(programDateObj, {count:1, notChecked:1, correct:1, sourceNotPlayed:1, notGenerated:1, incorrect:1, badExposure:1 }); 


    
    
//    var subCounts = {
//            notChecked:0, 
//            correct:0, 
//            sourceNotPlayed:0, 
//            notGenerated:0, 
//            incorrect:0, 
//            badExposure:0
//    };
//    
//    switch(this.liveState) {
//    case 'not_checked': 
//        subCounts.notChecked = 1;
//        break;
//    case 'correct':
//        subCounts.correct = 1;
//        break;
//    case 'source_not_played':
//        subCounts.sourceNotPlayed = 1;
//        break;
//    case 'not_generated':
//        subCounts.notGenerated = 1;
//        break;
//    case 'incorrect':
//        subCounts.incorrect = 1;
//        break;
//    case 'bad_exposure':
//        subCounts.badExposure = 1;
//        break;
//    }
    
//    var fail = 0;
//    if ( (this.liveState == 'incorrect') ) {
//        //console.log('this.liveState='+this.liveState);
//        fail = 1;
//    }
//    emit(programDateObj, {count:1, subCounts:subCounts}); 
};

o.reduce = function(key, countObjVals){ 
    reducedVal = { 
        count: 0, 
        notCheckedCount: 0, 
        correctCount: 0, 
        sourceNotPlayedCount: 0, 
        notGeneratedCount: 0, 
        incorrectCount: 0, 
        badExposureCount: 0 
    };

    for (var idx = 0; idx < countObjVals.length; idx++) {
        reducedVal.count += countObjVals[idx].count;
        reducedVal.notCheckedCount += countObjVals[idx].notChecked;
        reducedVal.correctCount += countObjVals[idx].correct;
        reducedVal.sourceNotPlayedCount += countObjVals[idx].sourceNotPlayed;
        reducedVal.notGeneratedCount += countObjVals[idx].notGenerated;
        reducedVal.incorrectCount += countObjVals[idx].incorrect;
        reducedVal.badExposureCount += countObjVals[idx].badExposure;

//        reducedVal.count += countObjVals[idx].count;
//        reducedVal.notCheckedCount += countObjVals[idx].subCounts.notChecked;
//        reducedVal.correctCount += countObjVals[idx].subCounts.correct;
//        reducedVal.sourceNotPlayedCount += countObjVals[idx].subCounts.sourceNotPlayed;
//        reducedVal.notGeneratedCount += countObjVals[idx].subCounts.notGenerated;
//        reducedVal.incorrectCount += countObjVals[idx].subCounts.incorrect;
//        reducedVal.badExposureCount += countObjVals[idx].subCounts.badExposure;

        
//        reducedVal.failCount += countObjVals[idx].failCount;
    }
    
    return reducedVal;
};


o.query = { "type":'UGC',  "timeslot.start":{$gte:(new Date('2013/11/18')).getTime(), $lt:(new Date()).getTime()} }; 

//o.finalize = function (key, reducedVal) {
////    reducedVal.failRate = 0;
//    return reducedVal;
//};

o.out = { replace: 'tempOutput' };

programTimeSlotModel.mapReduce(o, function (errOfMapReduce, model) {
    if (!errOfMapReduce) {
        model.find().sort({_id:1}).exec(function (err, result) {
            if (!err){
                console.log('result=');
                console.dir(result);
                
//                var outString = "date, programs played, not_checked, correct, source_not_played, not_generated, incorrect, bad_exposure\n";
//                for (var i=0; i<result.length; i++) {
//                    outString += result[i]._id.y+"/"+result[i]._id.m+"/"+result[i]._id.d+", "+result[i].value.count+", "+result[i].value.failCount+", "+result[i].value.failRate+"\n";
//                }
//                //console.log(outString);
//                fs.writeFile('program_play_statistics.csv', outString, function (err) {
//                    if (err) throw err;
//                    console.log('program_play_statistics.csv is saved!');
//                });
                
                process.exit(1);

            }
            else {
                console.log("err=");
                console.dir(err);
            }
            
        });

    }
    else {
        console.log("Failed to perferm mapReduce: "+errOfMapReduce);
    }
});

