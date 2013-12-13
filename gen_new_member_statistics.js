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
//statistics: new members 
var db = require('./db.js');
var async = require('async');
var memberModel = db.getDocModel("member");
var fs = require('fs');
                
var o = {};

o.map = function(){ 
    var memberCreatedOn = this._id.getTimestamp();
    var memberCreatedDateObj = {y:memberCreatedOn.getFullYear(), m:memberCreatedOn.getMonth()+1, d:memberCreatedOn.getDate() };
    emit(memberCreatedDateObj, {count:1}); 
};

o.reduce = function(key, countObjVals){ 
    reducedVal = { count: 0 };

    for (var idx = 0; idx < countObjVals.length; idx++) {
        reducedVal.count += countObjVals[idx].count;
    }
    
    return reducedVal;
};

//o.query = { "type":'UGC',  "timeslot.start":{$gte:(new Date('2013/11/18')).getTime(), $lt:(new Date()).getTime()} }; 
        
o.out = { replace: 'tempOutput' };

memberModel.mapReduce(o, function (err, model) {
    model.find().sort({_id:1}).exec(function (err, result) {
        if (!err){
            //console.log('result=');
            //console.dir(result);
            
            var outString = "date, new member count\n";
            for (var i=0; i<result.length; i++) {
                outString += result[i]._id.y+"/"+result[i]._id.m+"/"+result[i]._id.d+", "+result[i].value.count+"\n";
            }
            //console.log(outString);
            fs.writeFile('new_member_statistics.csv', outString, function (err) {
                if (err) throw err;
                console.log('new_member_statistics.csv is saved!');
            });

        }
        else {
            console.log("err=");
            console.dir(err);
        }
        
    });
});

