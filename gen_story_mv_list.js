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
        new winston.transports.File({ filename: './log/gen_story_mv_list.log'})   
    ],
    exceptionHandlers: [new winston.transports.MongoDB({host:mongoDbServerUrlObj.hostname, db: 'feltmeng', level: 'info'}),
                    new winston.transports.File({filename: './log/gen_story_mv_list_exceptions.log'})
    ]
    
});  

global.logger = logger;  



//== main part ==
//statistics: program fail rate statistics
var db = require('./db.js');
var async = require('async');
//var programTimeSlotModel = db.getDocModel("programTimeSlot");
var ugcModel = db.getDocModel("ugc");
var userLiveContentModel = db.getDocModel("userLiveContent");
var fs = require('fs');

ugcModel.find({"createdOn":{$gte:(new Date('2013/12/2')).getTime()}, "contentGenre":"miix_it"},"createdOn no projectId", {sort :{'createdOn':1}}).exec(function(errOfFind1, ugcList){
    //console.log("ugcList=");
    //console.dir(ugcList);
    if (!errOfFind1) {
        var indexList = [];
        var outString = "no, submit date, date of playing on DOOH, Youtube link\n";
        for (var i=0; i<ugcList.length; i++) {
            //console.dir(memberList[i]);
            indexList.push(i);
            //memberList[i].miixMovieVideo_count = 1;
            
        }
        //console.dir(indexList);
        
        var iteratorEachUgcItem = function(anIndex, callback){
            //console.log("ugcList[anIndex].projectId="+ugcList[anIndex].projectId);
            userLiveContentModel.findOne({"sourceId": ugcList[anIndex].projectId, "genre" : "miix_story"}, 'url liveTime', function(err, _result){
                if ( (!err)  ) {
                    var result = JSON.parse(JSON.stringify(_result));
                    //console.log("_result=");
                    //console.dir(_result);

                    if (result) {
                        var ytUrl = null;
                        if (result.url) {
                            ytUrl = result.url.youtube;
                        }
                        else {
                            ytUrl = "!!NOT YET GENERATED!!";
                        }
                        outString += ugcList[anIndex].no+", "+ugcList[anIndex].createdOn+", "+new Date(result.liveTime)+", "+ytUrl+"\n";

                    }
                    else {
                        outString += ugcList[anIndex].no+", "+ugcList[anIndex].createdOn+", "+"----"+", "+"!!NOT YET GENERATED!!"+"\n";
                    }
                    callback(null);
                }
                else {
                    outString += ugcList[anIndex].no+", "+ugcList[anIndex].createdOn+", "+"----"+", "+"!!NOT YET GENERATED!!"+"\n";
                    callback("Fail to query user live content: "+err);
                }
                
            });
            //console.log("query "+anIndex);
        };
        
        async.eachSeries(indexList, iteratorEachUgcItem, function(err){
            
            if (!err) {
                //console.log(outString);

                fs.writeFile('story_mv_list.csv', outString, function (err) {
                    if (err) throw err;
                    console.log('story_mv_list.csv is saved!');
                    process.exit(1);
                });

                console.log('done!');
            }
            else {
                console.log('error! : '+err);
                process.exit(1);
            }
            
        });


        
        
        
    }
    else {
        console.log("err of query: "+errOfFind1);
    }
    
});

//programTimeSlotModel.mapReduce(o, function (err, model) {
//    model.find().sort({_id:1}).exec(function (err, result) {
//        if (!err){
//            //console.log('result=');
//            //console.dir(result);
//            
//            var outString = "date, programs played, live content fails, fail rate\n";
//            for (var i=0; i<result.length; i++) {
//                outString += result[i]._id.y+"/"+result[i]._id.m+"/"+result[i]._id.d+", "+result[i].value.count+", "+result[i].value.failCount+", "+result[i].value.failRate+"\n";
//            }
//            //console.log(outString);
//            fs.writeFile('program_play_statistics.csv', outString, function (err) {
//                if (err) throw err;
//                console.log('program_play_statistics.csv is saved!');
//            });
//
//        }
//        else {
//            console.log("err=");
//            console.dir(err);
//        }
//        
//    });
//});

