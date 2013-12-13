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
//statistics: UGC counts per day & users generating UGC per day
var db = require('./db.js');
var async = require('async');
var ugcModel = db.getDocModel("ugc");
var fs = require('fs');
ugcModel.aggregate(  
        { $match : { no:{$gte: 3000} } },
        { $project: { creatYear:{$year: "$createdOn"}, creatMonth:{$month: "$createdOn"},creatDay:{$dayOfMonth: "$createdOn"}, owner: "$ownerId.fbUserId" } },
        { $group: { _id: {y:"$creatYear",m:"$creatMonth",d:"$creatDay"}, ugcsPerDay : { $sum : 1 } , usersPerDay : { $addToSet : "$owner" } } }, 
        { $sort : { _id: 1 } }, function(err, ugcStatisticsList){
    if (!err) {
        //console.log("ugcStatisticsList=");
        //console.dir(ugcStatisticsList);
        var outString = "date, ugc submitter count, ugc count\n";
        for (var i=0; i<ugcStatisticsList.length; i++) {
            outString += ugcStatisticsList[i]._id.y+"/"+ugcStatisticsList[i]._id.m+"/"+ugcStatisticsList[i]._id.d+", "+ugcStatisticsList[i].usersPerDay.length+", "+ugcStatisticsList[i].ugcsPerDay+"\n";
        }
        //console.log(outString);
        fs.writeFile('ugc_and_users_statistics.csv', outString, function (err) {
            if (err) throw err;
            console.log('ugc_and_users_statistics.csv is saved!');
        });
    }
    else {
        console.log("err=");
        console.dir(err);
    }
});
