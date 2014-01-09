/**
 * pop_mgr.js
 * 
 */

var fs = require('fs');
var async = require('async');
var xml = require('xml-mapping');

var db = require('./db.js');
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var ftp = require('./ftp.js');

// var ftpMgr = ftp.init({ host: '125.227.140.85', username: 'feltmeng', password: '28469434' });   // taipeiarena
// var ftpMgr = ftp.init({ host: '127.0.0.1', username: 'feltmeng', password: '53768608' });
// var ftpMgr = ftp.init({ host: '192.168.5.122', username: 'feltmeng', password: '53768608' });
var ftpMgr = ftp.init({ host: systemConfig.FTP_SCALA_PLAYER_HOST, 
                        username: systemConfig.FTP_SCALA_PLAYER_USERNAME, 
                        password: systemConfig.FTP_SCALA_PLAYER_PASSWORD });

var day = new Date();
var filename_month = ((day.getMonth() + 1) < 10) ? '0' + (day.getMonth() + 1).toString() : (day.getMonth() + 1).toString();
var filename_date = ((day.getDate() + 1) < 10) ? '0' + day.getDate().toString() : day.getDate().toString();
var file = 'bill' + day.getFullYear().toString() + filename_month + filename_date + '.log';
// console.log(file);
// var today = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

var logsDownloadAndParse = function( file, log_cb ) {
    
    ftpMgr.get('Logs/' + file, function(status) {
        
        if(!fs.existsSync(file)) {
            // console.log('File not found');
            log_cb('File not found', null);
            return;
        }
        
        parseXmlLog(file, function(err, log) {
            if(err) {
                // console.log('Parse XML Log is failed');
                log_cb('Parse XML Log is failed', null);
                return;
            }
            log_cb(null, log);
        });
    });
    
};

var parseXmlLog = function( file, parse_cb ) {
    var billing = { start: '', programs: [] },
        content = '';
    var log = fs.createReadStream(file);

    log.on('data', function(data) { content += data; });

    log.on('close', function() {

        var xml2json = xml.tojson(content);
        
        billing.start = new Date( xml2json['billing-log']['log-start-date']['$t'] ).getTime();
        
        xml2json['billing-log'].entry.forEach(function(program) {
            
            program.in = new Date( program.in['$t'] ).getTime();
            program.out = new Date( program.out['$t'] ).getTime();
            program.duration = parseFloat( program.duration['$t'] );
            program.channel = program.channel['$t'];
            program.frame = program.frame['$t'];
            program['mediaitem-path'] = program['mediaitem-path']['$t'];
            
            billing.programs.push(program);
        });
        parse_cb(null, billing);
    });
};


var checkProgramPlayState = function( playday, check_cb ) {
    
    var playstart = new Date(playday).getTime();
    var query = { 
        "timeslot.start": { $gte: playstart },
        "timeslot.end": { $lte: new Date().getTime() },
        "playState": "not_check",
        "type": "UGC",
        "state": { $ne: "not_confirmed" }
    };

    programTimeSlotModel.find(query).sort({timeStamp:1}).exec(function (err, result) {
        if(err) {
            // console.log(err);
            check_cb(err, null);
            return;
        }
        var programs = [];
        result.forEach(function(program) {
            programs.push({
                _id : program._id,
                timeslot : { 
                    start : program.timeslot.start,
                    end : program.timeslot.end
                },
                media : { match : program.content.projectId }
            });
        });
        // console.dir(programs);
        check_cb(null, programs);
    });

};

var checkPlayProgram = function( programs, logs, check_cb ) {
    
    var status = { count : 0, played : 0 };
    
    programs.forEach(function(program) {
        
        var check_flag = false;
        status.count++;
        logs.forEach(function(log) {
            if((program.timeslot.start <= log.in) &&
               (program.timeslot.end >= log.out) &&
               (log['mediaitem-path'].indexOf(program.media.match) >= 0)) {
                check_flag = true;
            }
        });
        if(!check_flag) {
            programTimeSlotModel.findByIdAndUpdate(program._id, { playState: 'not_play' }).exec();
            logger.info('checkPlayProgram : update program play state is not_play, _id is ' + program._id);
        }
        else {
            programTimeSlotModel.findByIdAndUpdate(program._id, { playState: 'played' }).exec();
            status.played++;
            logger.info('checkPlayProgram : update program play state is played, _id is ' + program._id);
        }
    });
    
    check_cb(null, status);
};


var execute = function() {
    
    day = new Date();
    filename_month = ((day.getMonth() + 1) < 10) ? '0' + (day.getMonth() + 1).toString() : (day.getMonth() + 1).toString();
    filename_date = ((day.getDate() + 1) < 10) ? '0' + day.getDate().toString() : day.getDate().toString();
    file = 'bill' + day.getFullYear().toString() + filename_month + filename_date + '.log';
    var today = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    
    checkProgramPlayState(today, function(err, programs) {
        if(err) {
            console.log(err);
            logger.info('checkProgramPlayState : query error');
            return;
        }
        else if(programs.length == 0) {
            // console.log('not_find_program');
            logger.info('checkProgramPlayState : not_find_program');
            return;
        }
        
        async.series([
            function( step_1 ) {
                logsDownloadAndParse( file, step_1 );
            },
            // function( step_2 ) {},
        ], function( err, res ) {
            if(err) {
                logger.info('checkProgramPlayState : please check execute step process');
                return;
            }
            
            var logs = res[0].programs;
            checkPlayProgram(programs, logs, function(err, status) {
                if(err) {
                    logger.info('checkProgramPlayState : checkPlayProgram() is error');
                    return;
                }
                // console.log(status);
                logger.info('checkProgramPlayState : update count is ' + status.count);
                logger.info('checkProgramPlayState : update played is ' + status.played);
            });
        });
    });
};

var cycle = 1000;

setTimeout(function(){
    if(cycle == 1000) { cycle = 3600 * 1000; };
    
    execute();
    
    setInterval(function(){
        execute();
    }, cycle);
    
}, cycle);