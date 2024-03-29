﻿/**
 * @fileoverview Implementation of scheduleMgr
 */

var async = require('async');
var mongoose = require('mongoose');
var workingPath = process.cwd();
var path = require('path');
var fs = require('fs');
var awsS3 = require('../aws_s3.js');
var db = require('../db.js');

//var scalaMgr = (require('./scala/scalaMgr.js'))( 'http://server-pc:8080', { username: 'administrator', password: '53768608' } );
var scalaMgr = (require('../scala/scalaMgr.js'))( systemConfig.HOST_SCALA_URL , { username: systemConfig.HOST_SCALA_USER_NAME, password: systemConfig.HOST_SCALA_PASSWORD } );
var scalaPlayerName = systemConfig.HOST_SCALA_PLAYER_NAME;

var programTimeSlotModel = db.getDocModel("programTimeSlot");
var programGroupModel = db.getDocModel("programGroup");
var ugcModel = db.getDocModel("ugc");
var candidateUgcCacheModel = db.getDocModel("candidateUgcCache");
var sessionItemModel = db.getDocModel("sessionItem");

var canvasProcessMgr = require('../canvas_process_mgr.js');
var facebookMgr = require('../facebook_mgr.js');
var pushMgr = require('../push_mgr.js');
var memberModel = db.getDocModel("member");
var adminBrowserMgr = require('../admin_browser_mgr.js');
var messageMgr = require('../message_mgr.js');

var ProgramGroup = require("./program_group.js");
var ProgramPlanningPattern = require("./program_planning_pattern.js");
var paddingContent = require("./padding_content.js");
var periodicalHighPriorityEvents = require("./periodical_high_priority_events.js");

/**
 * The manager who handles the scheduling of playing UGC on DOOHs
 *
 * @mixin
 */
var scheduleMgr = {};
var DEFAULT_PROGRAM_PERIOD = 10*60*1000; //10 min
var DEFAULT_PLAY_DURATION_FOR_STATIC_UGC = 7*1000; //7 sec.  
var DEFAULT_PLAY_DURATION_FOR_STATIC_PADDING = 2*1000; //2 sec.   
var TIME_INTERVAL_RANKIGN = [{startHour: 17, endHour: 23},  //start with the time interval with highest ranking
                             {startHour: 8, endHour: 16},
                             {startHour: 0, endHour: 7}];

var censorMgr = null;

     

/**
 * Initialize scheduleMgr
 * 
 * @param {Object} _censorMgr A reference to object instance of censerMgr
 */
scheduleMgr.init = function(_censorMgr){
    censorMgr = _censorMgr;
};

/**
 * Automatically selects applied UGC items (based on a predefined rule) and put them
 * in "to-be-played" list for a specific DOOH.<br>
 * <br>
 * This method will first ask ScalaMgr about the available time intervals in which Miix system
 * can play its UGC content.  It will then generate time slots base on a specific rule, and then 
 * fill them by picking up UGC items from a sorted list generated from censerMgr.
 * 
 * @param {String} dooh The ID of the DOOH upon which the selected UGCs are played
 * 
 * @param {Object} intervalOfSelectingUGC An object specifying the starting and ending of  
 *     of the time interval for scheduleMgr to select the applied UGC items <br>
 *     <ul>
 *     <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 *
 * @param {Object} intervalOfPlanningDoohProgrames An object specifying the starting and ending of  
 *     of the time interval which the generated schedule covers   
 *     <ul>
 *     <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 * 
 * @param {Array} programSequence An array of strings showing the sequence of program content genres to use when 
 *     when the system is planning the program(s) of a "micro time interval" <br>
 *     Note: the string must be "miix_it", "cultural_and_creative", "mood", or "check_in"
 *     For example, ["miix_it", "check_in", "check_in", "mood", "cultural_and_creative" ] <br>
 *     
 * @param {String} planner The hex string of planner's _id
 * 
 * @param {String} filter The filter of generating sorted candidate UGC list.  It must be one of the following values: <br>
 *     <ul>
 *     <li>"not_being_submitted_to_dooh"
 *     <li>"not_being_submitted_to_dooh or live_content_failed_in_last_play"
 *     </ul>
 *     
 * @param {String} schedulingMode The mode of scheduling program list.  It must be one of the following values: <br>
 *     <ul>
 *     <li>"appended_to_each_playlist_cycle"
 *     <li>"continuous"
 *     </ul>
 * 
 * @param {String} playMode The mode of playing programs.  It must be one of the following values: <br>
 *     <ul>
 *     <li>"interrupt"
 *     <li>"periodic"
 *     </ul>
 * 
 * @param {Function} cbOfCreateProgramList The callback function called when the result program list is created.<br>
 *     The function signature is cbOfCreateProgramList(err, result):
 *     <ul>
 *     <li>err: error message if any error happens
 *     <li>result: object containing the following information:
 *         <ul>
 *         <li>numberOfProgramTimeSlots: number of program time slots created 
 *         <li>sessionId: id indicating this session of creating program time slots (This will be used when   
 *         calling scheduleMgr.removeUgcfromProgramAndAutoSetNewOne()
 *         </ul>
 *         For example, <br>
 *         { numberOfProgramTimeSlots: 33, sessionId: '1367596800000-1367683140000-1373332978201' }     
 *     </ul>
 */
scheduleMgr.createProgramList = function(dooh, intervalOfSelectingUGC, intervalOfPlanningDoohProgrames, programSequence, planner, filter, schedulingMode, playMode, cbOfCreateProgramList ){
    
    logger.info('[scheduleMgr.createProgramList()]: intervalOfSelectingUGC={start:'+(new Date(intervalOfSelectingUGC.start))+' end:'+(new Date(intervalOfSelectingUGC.end))+'} ');
    logger.info('intervalOfPlanningDoohProgrames= {start:'+(new Date(intervalOfPlanningDoohProgrames.start))+' end:'+(new Date(intervalOfPlanningDoohProgrames.end))+'} programSequence='+JSON.stringify(programSequence));
    
    var sortedUgcList = null;
    var sessionId = intervalOfSelectingUGC.start.toString() + '-' + intervalOfSelectingUGC.end.toString() + '-' + intervalOfPlanningDoohProgrames.start.toString() + '-' + intervalOfPlanningDoohProgrames.end.toString() + '-' + Number((new Date()).getTime().toString());
    var programPlanningPattern = new ProgramPlanningPattern(programSequence);
    
    
    var putUgcIntoTimeSlots = function(cbOfPutUgcIntoTimeSlots){
        
        var candidateUgcList = sortedUgcList.slice(0); //clone the full array of sortedUgcList
        var counter = 0;
        var isLoopedAround = false;
        
        var saveCandidateUgcList = function(_candidateUgcList, _intervalOfSelectingUGC, cbOfSaveCandidateUgcList){
            var indexArrayCandidateUgcCache = []; for (var i = 0; i < _candidateUgcList.length; i++) { indexArrayCandidateUgcCache.push(i); }
            
            var iteratorCreateCandidateUgcCache = function(indexOfCandidateUgcCache, interationDone_createCandidateUgcCache_cb){
                var CandidateUgcCache = db.getDocModel("candidateUgcCache");
                var aCandidateUgcCache = new CandidateUgcCache();
                aCandidateUgcCache.sessionId = sessionId;
                aCandidateUgcCache.index = indexOfCandidateUgcCache;
                var _candidateUgc = JSON.parse(JSON.stringify( _candidateUgcList[indexOfCandidateUgcCache] )); //clone candidateUgc object to prevent from strange error "RangeError: Maximum call stack size exceeded"
                aCandidateUgcCache.candidateUgc = _candidateUgc;
                aCandidateUgcCache.markModified('candidateUgc');
                aCandidateUgcCache.save(function(err1, aSavedCandidateUgcCache){     
                    interationDone_createCandidateUgcCache_cb(err1, aSavedCandidateUgcCache);
                });                
            };
            async.mapSeries(indexArrayCandidateUgcCache, iteratorCreateCandidateUgcCache, function(err, savedCandidateUgcCacheList){
                if (!err){
                    var result = { sessionId: sessionId, candidateUgcCacheList: savedCandidateUgcCacheList };
                    cbOfSaveCandidateUgcList(null, result);
                }
                else {
                    cbOfSaveCandidateUgcList("Failed to save candidate UGC cached list: "+err, null);
                }
            });
            
        };
        
        //== PutUgcIntoTimeSlots_eachRankedTimeIntervalInADay
        var iteratorPutUgcIntoTimeSlots_eachRankedTimeIntervalInADay = function(aTimeIntervalInADay, interationDone_cb1){
            //query the time slots (in programTimeSlot collection) belonging to this interval and put UGC to them one by one
            //console.log("aTimeIntervalInADay=");
            //console.dir(aTimeIntervalInADay);
            programTimeSlotModel.find({ "timeslot.startHour": {$lte:aTimeIntervalInADay.endHour, $gte:aTimeIntervalInADay.startHour}, "type": "UGC", "session": sessionId }).sort({timeStamp:1}).exec(function (_err_1, _timeSlots) {
                //debugger;
                if (!_err_1){
                    //debugger;
                    //console.log("timeSlots=");
                    //console.dir(timeSlots);   
                    //-- PutUgcIntoTimeSlots_eachTimeSlot
                    var timeSlots = JSON.parse(JSON.stringify(_timeSlots)); 
                    var iteratorPutUgcIntoTimeSlots_eachTimeSlot = function(aTimeSlot, interationDone_cb2){
                        //debugger;
                        
                        var selectedUgc = null;
                        
                        //pick up one UGC from the sorted list 
                        for (var indexOfcandidateToSelect=0; indexOfcandidateToSelect<=candidateUgcList.length; indexOfcandidateToSelect++){
                            
                            if (indexOfcandidateToSelect == candidateUgcList.length){
                                candidateUgcList = candidateUgcList.concat(sortedUgcList);
                                isLoopedAround = true;
                            }
                            
                            if ( candidateUgcList[indexOfcandidateToSelect].contentGenre == aTimeSlot.contentGenre){
                                selectedUgc = candidateUgcList.splice(indexOfcandidateToSelect, 1)[0];
                                break;
                            }
                        }
                        
                        //debugger;
                        var _selectedUgc = JSON.parse(JSON.stringify(selectedUgc)); //clone selectedUgc object to prevent from a strange error "RangeError: Maximum call stack size exceeded"
                        //db.updateAdoc(programTimeSlotModel, aTimeSlot._id, {"content": _selectedUgc, "timeslot.playDuration": playDuration }, function(_err_2, result){
                        db.updateAdoc(programTimeSlotModel, aTimeSlot._id, {"content": _selectedUgc, "isLoopedAround": isLoopedAround }, function(_err_2, result){
                            counter++;
                            //debugger;
                            //console.dir(result);
                            interationDone_cb2(_err_2);
                        });
                        
                        
                    };
                    
                    async.eachSeries(timeSlots, iteratorPutUgcIntoTimeSlots_eachTimeSlot, function(_err_3){
                        //debugger;
                        interationDone_cb1(_err_3);
                    });
                    // -- end of PutUgcIntoTimeSlots_eachTimeSlot
                    
                }
                else{
                    //debugger;
                    interationDone_cb1(_err_1);
                }
                
                //console.log("timeSlots=");
                //console.dir(timeSlots);
            });
            
            
                
        };
        
        async.eachSeries(TIME_INTERVAL_RANKIGN, iteratorPutUgcIntoTimeSlots_eachRankedTimeIntervalInADay, function(_err_4){
            if (!_err_4) {
                
                //debugger;
                var numberOfProgramTimeSlots = counter;
                
                saveCandidateUgcList(candidateUgcList, intervalOfSelectingUGC, function(_err_5, _result_5){
                    //console.log("saveCandidateUgcList() result=");
                    //console.dir(_result_5);                    
                    //console.log("err=%s", _err_5);
                    if (!_err_5){
                        var result = {numberOfProgramTimeSlots: numberOfProgramTimeSlots, sessionId: _result_5.sessionId };
                        if (cbOfPutUgcIntoTimeSlots){
                            cbOfPutUgcIntoTimeSlots(null, result);
                        }
                        
                        
                        //for debugging
                        programTimeSlotModel.find({ "session": sessionId }, "timeStamp timeslot contentGenre type content" ).sort({timeStamp:1}).exec(function (_err, programs) {
                            if (!_err){
                                //console.log("programs generated:");
                                //console.dir(programs);
                                logger.info('[scheduleMgr] programs generated:' );
                                for (var i in programs){
                                    logger.info(JSON.stringify(programs[i]));
                                }
                                //cbOfGenerateTimeSlot(null);
                            }else {
                                //cbOfGenerateTimeSlot("Failed to guery the time slots after their generation: "+_err);
                            }
                        }); 
                        
                    }
                    else {
                        if (cbOfPutUgcIntoTimeSlots){
                            cbOfPutUgcIntoTimeSlots(_err_5, null);
                        }
                    }
                    
                });
                
                
                
            }
            else{
                if (cbOfPutUgcIntoTimeSlots){
                    cbOfPutUgcIntoTimeSlots('Failed to add empty program time slots into ranked intervals in a day: '+_err_4, null);
                }
            }
            
        });
        //== end of PutUgcIntoTimeSlots_eachRankedTimeIntervalInADay
        
        
    };  //end of putUgcIntoTimeSlots()
    
    var generateTimeSlot = function( cbOfGenerateTimeSlot){
        
                 
        /**
         * Get availalbe time intervals by checking the playlists in Scala schedules
         */
        var getAvailableTimeIntervals = function( intervalToPlan, got_cb) {
            
            async.waterfall([
                function(callback){
                    //call scalaMgr.listTimeslot() to get the days that intervalToPlan covers
                    var rawIntervals = [];
                    var aDay = 24*60*60*1000;
                    var endDate = new Date(intervalToPlan.end);
                    var upperBound = (new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()+1, 0, 0, 0, 0 )).getTime();
                    var day = intervalToPlan.start;
                    
                    async.whilst(
                        function () { return day < upperBound; },
                        function (callback) {
                            scalaMgr.listTimeslot(day,function(errScala, intervalsInThisDay){
                                if (!errScala) {
                                    rawIntervals = rawIntervals.concat(intervalsInThisDay);
                                    day += aDay;
                                    callback(null);
                                }
                                else {
                                    callback("Fail to execute scalaMgr.listTimeslot(): "+errScala);
                                }
                            });
                        },
                        function (err1) {
                            callback(err1, rawIntervals);
                        }
                    );
                    
                },
                function(rawIntervals, callback){
                    //Trim the "raw intervals" to meet the coverage of intervalToPlan
                    var resultIntervals = [];
                    for (var i=0; i<rawIntervals.length; i++){
                        var aRawInterval = rawIntervals[i];
                        if ( (aRawInterval.interval.start >= intervalToPlan.start) && (aRawInterval.interval.end <= intervalToPlan.end) ){
                            resultIntervals.push(aRawInterval);
                        }
                        else if ( (aRawInterval.interval.start < intervalToPlan.start) && (aRawInterval.interval.end <= intervalToPlan.end) ){
                            resultIntervals.push({interval:{start: intervalToPlan.start, end: aRawInterval.interval.end}, cycleDuration: aRawInterval.cycleDuration });
                        }
                        else if ( (aRawInterval.interval.start >= intervalToPlan.start) && (aRawInterval.interval.end > intervalToPlan.end) ){
                            resultIntervals.push({interval:{start: aRawInterval.interval.start, end: intervalToPlan.end}, cycleDuration: aRawInterval.cycleDuration });
                        }
                        else if ( (aRawInterval.interval.start < intervalToPlan.start) && (aRawInterval.interval.end > intervalToPlan.end) ){
                            resultIntervals.push({interval:{start: intervalToPlan.start, end: intervalToPlan.end}, cycleDuration: aRawInterval.cycleDuration });
                        }                    }
                    callback(null, resultIntervals);
                }
            ],
            function(err, result){
                if (got_cb){
                    got_cb(err, result);
                } 
            });
            
        };
        
        getAvailableTimeIntervals(intervalOfPlanningDoohProgrames,function(err, result){
            //debugger;
            if (!err){
                //TODO: check if these available time intervals cover existing planned program time slots. If yes, maked the UGCs contained in these program time slots "must-play" and delete these program time slots.
                
                //generate program time slot documents (in programTimeSlot collection) according to available intervals and corresponding cycle durations
                var availableTimeIntervals = result;
                //console.log("availableTimeIntervals=");
                //console.dir(availableTimeIntervals);
                //TODO: debug getAvailableTimeIntervals(). Some availableTimeIntervals are wrong; it was just lucky that these bad intervals are now filtered out  
                logger.info('Executed getAvailableTimeIntervals() availableTimeIntervals='+JSON.stringify(availableTimeIntervals));
                for (var i in availableTimeIntervals) {
                    logger.info('    interval.start='+new Date(Number(availableTimeIntervals[i].interval.start))+'  interval.end='+new Date(Number(availableTimeIntervals[i].interval.end))+'  cycleDuration='+ availableTimeIntervals[i].cycleDuration);
                }
                
                var iteratorGenerateTimeSlot = function(anAvailableTimeInterval, interationDone_cb){
                    //add time slots in this available time interval
                    var timeToAddTimeSlot = anAvailableTimeInterval.interval.start;
                    var programPeriod;
                    
                    //TODO: switch back when the cycleDuration info can be correctly retrieved from Scala 
//                    if (anAvailableTimeInterval.cycleDuration > DEFAULT_PROGRAM_PERIOD){
//                        programPeriod = anAvailableTimeInterval.cycleDuration;
//                    }
//                    else {
//                        programPeriod = DEFAULT_PROGRAM_PERIOD;
//                        
//                    }
                    //before the cycleDuration info can be correctly retrieved from Scala, use DEFAULT_PROGRAM_PERIOD for now
                    programPeriod = DEFAULT_PROGRAM_PERIOD;
                    
                    async.whilst(
                        //function () { return timeToAddTimeSlot+anAvailableTimeInterval.cycleDuration <= anAvailableTimeInterval.interval.end; },
                        function () { return timeToAddTimeSlot+programPeriod <= anAvailableTimeInterval.interval.end; },
                        function (cb_whilst) {
                            // try to avoid the conflicts with high-priority events
                            var intervalChecked = 0;
                            while ( periodicalHighPriorityEvents.isConflictedWith({ start: timeToAddTimeSlot, end:timeToAddTimeSlot+programPeriod  }) && 
                                    //(timeToAddTimeSlot+anAvailableTimeInterval.cycleDuration <= anAvailableTimeInterval.interval.end) &&
                                    (timeToAddTimeSlot+programPeriod <= anAvailableTimeInterval.interval.end) &&
                                    (intervalChecked < 60*60*1000) ) {
                                timeToAddTimeSlot += programPeriod;
                                intervalChecked += programPeriod;
                            }
                            
                            //if (timeToAddTimeSlot+anAvailableTimeInterval.cycleDuration <= anAvailableTimeInterval.interval.end) {
                            if (timeToAddTimeSlot+programPeriod <= anAvailableTimeInterval.interval.end) {
                                // add time slots of a micro timeslot (of the same content genre) to db
                                var inteval = { start: timeToAddTimeSlot, end:timeToAddTimeSlot+programPeriod  };
                                var contentGenre = programPlanningPattern.getProgramGenreToPlan(); //the genre that will be used in this program group  
                                
                                var programGroup = new ProgramGroup(inteval, dooh, planner, sessionId);
                                if (contentGenre !== "miix_it") {
                                    programGroup.generateByTemplate('PG_30SEC_2IMAGEUGC', contentGenre, function(err1){
                                    //generateTimeSlotsOfMicroInterval(inteval, function(err1){
                                        timeToAddTimeSlot += programPeriod;
                                        cb_whilst(err1);
                                    });
                                }
                                else { //contentGenre === "miix_it"
                                    programGroup.generateByTemplate('PG_30SEC_1VIDEOUGC', contentGenre, function(err1){
                                    //generateTimeSlotsOfMicroInterval(inteval, function(err1){
                                        timeToAddTimeSlot += programPeriod;
                                        cb_whilst(err1);
                                    });
                                }
                            }
                            else {
                                //no time slot to add to db
                                cb_whilst(null);
                            }
                            
                        },
                        function (err2) {
                            interationDone_cb(err2);
                        }
                    );
                };
                
                async.eachSeries(availableTimeIntervals, iteratorGenerateTimeSlot, function(err0){
                    if (!err0) {
                        
//                        //for debugging
//                        programTimeSlotModel.find({ "session": sessionId }, "timeStamp timeslot contentGenre type" ).sort({timeStamp:1}).exec(function (_err, timeslots) {
//                            if (!_err){
//                                //console.log("time slot generated:");
//                                //console.dir(timeslots);
//                                logger.info('[scheduleMgr] time slots generated:' );
//                                for (var i in timeslots){
//                                    logger.info(JSON.stringify(timeslots[i]));
//                                }
//                                cbOfGenerateTimeSlot(null);
//                            }else {
//                                cbOfGenerateTimeSlot("Failed to guery the time slots after their generation: "+_err);
//                            }
//                        }); 
                        
                        cbOfGenerateTimeSlot(null);
                        
                    }
                    else{
                        cbOfGenerateTimeSlot('Failed to generate time slots in available time intervals: '+err0);
                    }
                });
                
               
            }
            else{
                cbOfGenerateTimeSlot('Failed to read available time interval list.', null);                    
            }
            
        });
        
    };  //end of generateTimeSlot()
    
    async.waterfall([
        function(callback){
            //get the sorted candidate UGC list
            
            censorMgr.getUGCListLite(intervalOfSelectingUGC, filter, function(err_1, _sortedUgcList ){
                if (!err_1){
                    sortedUgcList = JSON.parse(JSON.stringify(_sortedUgcList));
                    //console.log('sortedUgcList=');
                    //console.dir(sortedUgcList);
                    logger.info('[scheduleMgr] censorMgr.getUGCListLite() returns: sortedUgcList=');
                    for (var i=0;i<sortedUgcList.length; i++){
                        logger.info( '{ no:'+sortedUgcList[i].no+', contentGenre:'+sortedUgcList[i].contentGenre+', genre:'+sortedUgcList[i].genre+', fileExtension:'+sortedUgcList[i].fileExtension+' }' );
                    }
                    if (sortedUgcList.length>0) {
                        callback(null);
                    }
                    else {
                        callback("在此搜尋條件下，没有任何節目可以排！");
                    }
                    
                }
                else {
                    callback("Fail to get UGC list from Censor manager: "+err_1);
                }
            });
        },
        
        function(callback){
            //remove all the "not_confirmed" programs of this specific planner's
            programTimeSlotModel.find({ "state": "not_confirmed", "planner": planner }).remove().exec(function (errOfRomove) {
                
                if (!errOfRomove) {
                    // console.log('"not_confirmed" programs are successfully removed!');
                    callback(null);
                }
                else {
                    callback('Failed to query the programs of a specific session: '+errOfRomove, null);
                }                             
            });
        },
        
        function(callback){
            //remove all the "not_confirmed" program groups of this specific planner's
            programGroupModel.find({ "state": "not_confirmed", "planner": planner }).remove().exec(function (errOfRomove) {
                
                if (!errOfRomove) {
                    // console.log('"not_confirmed" programs are successfully removed!');
                    callback(null);
                }
                else {
                    callback('Failed to query the programs of a specific session: '+errOfRomove, null);
                }                             
            });
        },

        function(callback){
            //check the content genre of all these UGC contents. If any of the genres is missing, remove it from the programSequence of programPlanningPattern  
            var programSequence = programPlanningPattern.getProgramSequence();
            var found = false;
            var genresToRemove = [];
            for (var i=0;i<programSequence.length;i++){
                found = false;
                for (var j=0;j<sortedUgcList.length;j++){
                    if (sortedUgcList[j].contentGenre == programSequence[i]){
                        found = true;
                        break;
                    }
                }
                if (!found){
                    genresToRemove.push(programSequence[i]);
                }
            }
            for (var k=0;k<genresToRemove.length;k++){
                programPlanningPattern.remove(genresToRemove[k]);
            }
            logger.info("programSequence="+ JSON.stringify(programPlanningPattern.getProgramSequence()) );
            
            if ( (programPlanningPattern.getProgramSequence()).length > 0 ) {
                callback(null);
            }
            else {
                callback("在此搜尋條件下，没有任何節目可以排！");
            }
            
            
        },
        function(callback){
            //generate program time slots
            if (schedulingMode == "appended_to_each_playlist_cycle") {
                generateTimeSlot( function(err_2){
                    if (!err_2) {
                        //console.log('generateTimeSlot() done! ');
                        callback(null);
                    }
                    else {
                        callback("Fail to generate time slots: "+err_2);
                    }
                });

            }
            else {
                callback(null);
            }
        }, 
        function(callback){
            //put UGCs into programe time slots
            if (schedulingMode == "appended_to_each_playlist_cycle") {
                putUgcIntoTimeSlots(function(err_3, result){
                    if (!err_3) {
                        //console.log('putUgcIntoTimeSlots() done! ');
                        callback(null, result);
                    }
                    else {
                        callback("Fail to put UGCs into time slots (appended_to_each_playlist_cycle mode): "+err_3, null);
                    }
                    
                });
            }
            else { //schedulingMode == "continuous"
                var programGroup = new ProgramGroup(intervalOfPlanningDoohProgrames, dooh, planner, sessionId);
                programGroup.generateFromSortedUgcList(sortedUgcList, programPlanningPattern, playMode, function(errOfGenerateFromSortedUgcList, resultProgramGroup){
                    if (!errOfGenerateFromSortedUgcList) {
                        var result = {numberOfProgramTimeSlots: resultProgramGroup.programs.length, sessionId: resultProgramGroup.programSession };
                        callback(null, result);
                    }
                    else {
                        callback("Fail to generate programs from sorted UGC list (continuous mode): "+errOfGenerateFromSortedUgcList, null);
                    }

                });
            }
        }  
    ],
    function(err, result){
        if (cbOfCreateProgramList){
            if (!err) {
                cbOfCreateProgramList(null, result);
            }
            else {
                cbOfCreateProgramList(err, null);
            }
        } 
    });

        
};


/**
 * 
 * Get(a.k.a query) the programs (of a specific DOOH) of a specific interval.<br>
 * <br>
 * @param {String} dooh The ID of the DOOH where the program is to be updated
 * 
 * @param {Object} interval An object specifying the starting and ending of of the time interval to query 
 *     <ul>
 *     <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 * @param {Number} pageLimit The number of program time slot items to return (in got_cb's result).  If null, it returns all items.
 * @param {Number} pageSkip The number of program time slot items to skip when returning in in got_cb's result. If null, there is no skip.
 * @param {Function} got_cb The callback function called when the query is don.<br>
 *     The function signature is got_cb(err, resultProgramList):
 *     <ul>
 *     <li>err: error message if any error happens
 *     <li>resultProgramList: An array of objects containing program info:
 *         <ul>
 *         <li>_id: A string (i.e. a hex string representation of its ObjectID in MongoDB) specifying the ID of a program time slot item  
 *         <li>timeSlot: An object specifying the starting and ending time of program's time slot
 *             <ul>
 *             <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             </ul>
 *         <li>ugc: A number specifying the ID of the UGC contained in this program. (This is
 *             actually the id of items store in UGC collection.) 
 *         </ul>
 *         For example, <br>
 *         [{_id:43524, timeSlot:{start:1371861000000, end :1371862000000}, ugc:48593},<br>
 *          {_id:43525, timeSlot:{start:1371881000000, end:1371882000000}, ugc:48353},<br>
 *          {_id:43544, timeSlot:{start:1371897000000, end:1371898000000}, ugc:43593}]
 *         
 *     </ul>
 *  
 *     
 */

/**
 * @deprecated
 */
scheduleMgr.getProgramList = function(dooh, interval, pageLimit, pageSkip , updateUGC, got_cb ){
    var query = programTimeSlotModel.find({ "timeslot.start": {$gte:interval.start}, "timeslot.end":{$lt:interval.end}, "type": "UGC", "dooh": dooh })
                        .sort({timeStamp:1});
    
    if (pageLimit!==null){
        query = query.limit(pageLimit);
    }
    
    if (pageSkip!==null){
        query = query.skip(pageSkip);
    }
        
    query.exec(function (_err, result) {
        if(_err) got_cb(_err, result);
        if(result.length === 0) got_cb('No result', result);
        if (result.length > 0){
            censorMgr.getPlayList(result , updateUGC, function(err, result){
                if(err) got_cb(err, null);
                if(result){
                 got_cb(null, result);
                }
            });
            
        }
        
    });
};

/**
 * Get the programs of a specific planning sessions (a.k.a. calling scheduleMgr.createProgramList() ).<br>
 * <br>
 * @param {String} sessionId The id indicating the session of creating program time slot (This session id is accquired in the callback 
 *     passed to scheduleMgr.createProgramList(). )
 * @param {Number} pageLimit The number of program time slot items to return (in got_cb's result).  If null, it returns all items.
 * @param {Number} pageSkip The number of program time slot items to skip when returning in in got_cb's result. If null, there is no skip.
 * @param {Function} got_cb The callback function called when the query is don.<br>
 *     The function signature is got_cb(err, resultProgramList):
 *     <ul>
 *     <li>err: error message if any error happens
 *     <li>resultProgramList: An array of objects containing program info:
 *         <ul>
 *         <li>_id: A string (i.e. a hex string representation of its ObjectID in MongoDB) specifying the ID of a program time slot item  
 *         <li>timeSlot: An object specifying the starting and ending time of program's time slot
 *             <ul>
 *             <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             </ul>
 *         <li>ugc: A number specifying the ID of the UGC contained in this program. (This is
 *             actually the id of items store in UGC collection.) 
 *         </ul>
 *         For example, <br>
 *         [{_id:43524, timeSlot:{start:1371861000000, end :1371862000000}, ugc:48593},<br>
 *          {_id:43525, timeSlot:{start:1371881000000, end:1371882000000}, ugc:48353},<br>
 *          {_id:43544, timeSlot:{start:1371897000000, end:1371898000000}, ugc:43593}]
 *         
 *     </ul>
 */
scheduleMgr.getProgramListBySession = function(sessionId, pageLimit, pageSkip, cbOfGetProgramListBySession ){
    var query = programTimeSlotModel.find({ "session": sessionId, "type": "UGC"}).sort({timeStamp:1}) ;
    
 if (pageLimit!==null){
        query = query.limit(pageLimit);
    }
    
    if (pageSkip!==null){
        query = query.skip(pageSkip);
    }
    
    query.exec(function (_err, result) {
        if (cbOfGetProgramListBySession) {
            cbOfGetProgramListBySession(_err, result);
        }
    });
};

/**
 * Push programs (of a specific session) to the 3rd-party content manager.<br>
 * <br>
 * @param {String} sessionId The id indicating the session of creating program time slot (This session id is accquired in the callback 
 *     passed to scheduleMgr.createProgramList(). )
 *     
 * @param {String} playMode The mode of playing programs.  It must be one of the following values: <br>
 *     <ul>
 *     <li>"interrupt"
 *     <li>"periodic"
 *     </ul>
 *     
 * @param {Function} pushed_cb The callback function called when the process is done.<br>
 *     The function signature is updated_cb(err), where err is the error message indicating failure: 
 *     if successful, err returns null; if failed, err returns the error message.
 */
scheduleMgr.pushProgramsTo3rdPartyContentMgr = function(sessionId, playMode, pushed_cb) {
    var postPreview = function(aProgram, postPreview_cb){ //post each users to Facbook
        
        var access_token, message, link;
        var fb_name, play_time;
        
        async.waterfall([
            function(ugcSearch){
                ugcModel.find({'no': aProgram.content.no}).exec(function(err, ugc){
                	var _ugc = JSON.parse(JSON.stringify(ugc));
                    if (!err) {
                        ugcSearch(null, _ugc); 
                    }
                    else {
                        ugcSearch("Failed to find corresponding UGC: "+err, null); 
                    }
                });
            },
            function(ugc, memberSearch){
                if (ugc[0]) {
                    memberModel.find({'_id': ugc[0].ownerId._id}).exec(function(err, member){
                    	var _member = JSON.parse(JSON.stringify(member));
                        memberSearch(null, {ugc: ugc, member: _member}); 
                    });
                } 
                else {
                    memberSearch("Failed to have valid ugc[0]", null); 
                }
            },
        ], function(err, res){
            if (!err) {
                var ugc = res.ugc[0],
                member = res.member[0];
                
                access_token = member.fb.auth.accessToken;
                fb_name = member.fb.userName;
                var start = new Date(aProgram.timeslot.start);
                var end = new Date(aProgram.timeslot.end);
                var ugcProjectId = ugc.projectId;
                var showTime = function( time ){
                    var show;
                    if(time < 10)
                        show = '0' + time;
                    else
                        show = time;
                    
                    return show;
                };
                if(start.getHours()>12)
                    play_time = start.getFullYear()+'年'+showTime(start.getMonth()+1)+'月'+showTime(start.getDate())+'日下午'+showTime(start.getHours()-12)+':'+showTime(start.getMinutes())+'~'+showTime(end.getHours()-12)+':'+showTime(end.getMinutes());
                else
                    play_time = start.getFullYear()+'年'+showTime(start.getMonth()+1)+'月'+showTime(start.getDate())+'日上午'+showTime(start.getHours())+':'+showTime(start.getMinutes())+'~'+showTime(end.getHours())+':'+showTime(end.getMinutes());
                
                // message = fb_name + '即將粉墨登場！\n' + fb_name + '的試鏡編號' + ugc.no + '作品，即將於' + play_time + '之間，登上台北天幕LED，敬請期待！';
                
                switch(member.app.toLowerCase())
                {
                    case 'ondascreen':
                        message = fb_name + '即將粉墨登場！\n' + fb_name + '的試鏡編號' + ugc.no + '作品，即將於' + play_time + '之間，登上台北天幕LED，敬請期待！';
                        break;
                    case 'wowtaipeiarena':
                        message = '你的No.' + ugc.no + '作品，即將在' + play_time + '在小巨蛋播出，快到現場瞧瞧!';
                        break;
                    default:
                        break;
                } 
                
                async.parallel([
                    function(push_cb){
	                    	if(message){
	                    		pushMgr.sendMessageToDeviceByMemberId(res.member[0]._id, message, function(err, res){ push_cb(null, res); });
	                    	}else{
	                    		push_cb(null, "no message");
	                    	}
                    	},
                    function(createMessage_cb){
	                    	if(message){
	                    		messageMgr.createMessage(res.member[0]._id, message, function(err, res){ createMessage_cb(null, res); });
	                    	}else{
	                    		createMessage_cb(null, "no message");
	                    	}
                    	},
                    function(postFB_cb){
                        
                        var option = {
                            accessToken: access_token,
                            type: member.app,
                            ugcProjectId: ugcProjectId
                            // text: '哇！fb_name的作品，即將在play_time在小巨蛋播出，快到現場瞧瞧！'
                        };
                        
                        switch(option.type.toLowerCase())
                        {
                            case 'ondascreen':
                                // option.text = '哇！' + fb_name + '的作品，即將在' + play_time + '在小巨蛋播出，快到現場瞧瞧！';
                                option.name = fb_name;
                                option.time = play_time;
                                break;
                            case 'wowtaipeiarena':
								option.text = '哇！' + fb_name + '的作品，即將在' + play_time + '在小巨蛋播出，快到現場瞧瞧！';
                                option.name = fb_name;
                                option.time = play_time;
                                break;
							case 'waterlandsecuries':
                                option.text = '哇！' + fb_name + '的作品，即將在' + play_time + '在小巨蛋播出，快到現場瞧瞧！';
                                option.name = fb_name;
                                option.time = play_time;
                                break;
                            default:
                                break;
                        }                            
                        canvasProcessMgr.markTextToPreview(option, postFB_cb);
                    }
                ], function(err, res){
                    //(err)?console.log(err):console.dir(res);
                    postPreview_cb(err, res);
                });

            }
            else {
                postPreview_cb("Failed to post Preview", null);
            }
            
        
        });

    };

    var timeInfos = sessionId.split('-');
    var intervalStart = new Date( Number(timeInfos[2]) );
    var intervalEnd = new Date( Number(timeInfos[3]) );
    var straceStamp = '[推送'+intervalStart.toDateString()+' '+intervalStart.toLocaleTimeString()+'~'+intervalEnd.toDateString()+' '+intervalEnd.toLocaleTimeString()+'的節目] ';

    var utility = require('../utility.js');
    var arrayOfsessionId = sessionId.split('-');
    var timeslotStartString = utility.getLocalTimeString(new Date( Number(arrayOfsessionId[2]) ));
    var timeslotEndString = utility.getLocalTimeString(new Date( Number(arrayOfsessionId[3]) ));
    var playlistName = 'WTA-' + timeslotStartString + '-' + timeslotEndString;

    adminBrowserMgr.showTrace(null, straceStamp+"節目推送作業開始....");
    
    logger.info('[scheduleMgr] start to push session '+sessionId+' to 3rd-party Content Manager' );

    var programGroups = null;
    async.waterfall([
        function(cb1){
            //query the programs of this specific session
            programTimeSlotModel.find({ "session": sessionId }).sort({"timeStamp":1}).exec(function (err1, _programs) {
                if (!err1) {
                    var programs = JSON.parse(JSON.stringify(_programs));
                    
                    //for debugging
                    logger.info('[scheduleMgr] programs to push (to 3rd-party Content Manager:' );
                    for (var i in programs){
                        logger.info(JSON.stringify(programs[i]));
                    }
                                       
                    cb1(null, programs);
                }
                else {
                    cb1('Failed to query the programs of a specific session: '+err1, null);
                }                             
            });
        },
        function(programs, cb1_0){
            //query the program groups of this specific session
            programGroupModel.find({ "programSession": sessionId }).exec(function (err1, _programGroups) {
                if (!err1) {
                    programGroups = JSON.parse(JSON.stringify(_programGroups));
                    
                    //for debugging
                    logger.info('[scheduleMgr] program groups to push (to 3rd-party Content Manager:' );
                    for (var i in programGroups){
                        logger.info(JSON.stringify(programGroups[i]));
                    }
                                       
                    cb1_0(null, programs);
                }
                else {
                    cb1_0('Failed to query the program groups of a specific session: '+err1, null);
                }                             
            });
        },

        function(programs, cb2){
            
            //push each programs to Scala
            
            var playlistId = null;
            
            var iteratorPushAProgram = function(aProgram, callbackIterator){
                
                if (aProgram.contentType == "file" ) {
                
                    async.waterfall([
                        function(callback){
                            //download contents from S3 or get from local
                            //var fileName;
                            if (aProgram.type == "UGC"){
                               if((aProgram.content.fileExtension == 'png')||(aProgram.content.fileExtension == 'jpg')){
                                    var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.'+aProgram.content.fileExtension; 
                                    //TODO: make sure that target directory exists
                                    var targetLocalPath = path.join(workingPath, 'public/contents/temp', aProgram.content.projectId+'.'+aProgram.content.fileExtension);
                                }
                                else{
                                    var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.'+aProgram.content.fileExtension; 
                                    //TODO: make sure that target directory exists
                                    if(typeof(aProgram.content.fileExtension) === 'undefined') {  //TODO: find out the bug, and remove this check
                                        //aProgram.content.fileExtension = '.mp4';
                                        var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.mp4';
                                        var targetLocalPath = path.join(workingPath, 'public/contents/temp', aProgram.content.projectId+'.mp4');
                                    }
                                    else {
                                        var s3Path = '/user_project/'+aProgram.content.projectId+'/'+aProgram.content.projectId+'.'+aProgram.content.fileExtension;
                                        var targetLocalPath = path.join(workingPath, 'public/contents/temp', aProgram.content.projectId+'.'+aProgram.content.fileExtension);                                        
                                    }
                                }
                                awsS3.downloadFromAwsS3(targetLocalPath, s3Path, function(errS3,resultS3){
                                    if (!errS3){
                                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully download from S3 ' + s3Path );
                                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully download from S3 ' + s3Path );
                                        callback(null, targetLocalPath, aProgram.timeslot, aProgram.content.no);
                                    }
                                    else{
                                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Failed to download from S3 ' + s3Path);
                                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Failed to download from S3 ' + s3Path);
                                        callback('Failed to download from S3 '+s3Path+' :'+errS3, null, null, null);
                                    }
                                    
                                });
                            }
                            else {
                                var paddingFilePath = path.join(workingPath, 'public', aProgram.content.dir, aProgram.content.file);
                                callback(null, paddingFilePath, aProgram.timeslot, aProgram.content.no);
                            }
    
                        }, 
                        function(fileToPlay, timeslot, contentNo, callback){
                            //push content to Scala
                            if ( playMode === "periodic" ) {
                                
                                var option = 
                                {
                                        file: {
                                            name : path.basename(fileToPlay),
                                            path : path.dirname(fileToPlay),
                                            savepath : ''
                                        }
                                };
                                scalaMgr.uploadMediaItem( option, function(errScala, resultScala){
                                    if (!errScala){
                                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + fileToPlay );
                                        adminBrowserMgr.showTrace(null, straceStamp+"成功推送編號"+contentNo+"的UGC至播放系統!");
                                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + fileToPlay );
                                        callback(null, fileToPlay, contentNo);
                                    }
                                    else{
                                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + fileToPlay );
                                        adminBrowserMgr.showTrace(null, straceStamp+"!!!!!無法推送"+contentNo+"的UGC至播放系統!");
                                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + fileToPlay );
                                        callback('Failed to push content to Scala :'+errScala, null, null);
                                    }
                                });

                            }
                            else {  //playMode === "interrupt"
                                
                                var option = 
                                {
                                    playlist: { name: playlistName},
                                    playTime: {
                                        start: timeslot.start,
                                        end: timeslot.end,
                                        duration: timeslot.playDuration/1000  //sec    
                                    },
                                    file: {
                                        name : path.basename(fileToPlay),
                                        path : path.dirname(fileToPlay),
                                        savepath : ''
                                    }
                                };
                                scalaMgr.setItemToPlaylist( option, function(errScala, resultScala){
                                    if (!errScala){
                                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala with "interrupt" mode: ' + fileToPlay );
                                        adminBrowserMgr.showTrace(null, straceStamp+"成功推送編號"+contentNo+"的UGC至播放系統!");
                                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala with "interrupt" mode: ' + fileToPlay );
                                        db.updateAdoc(programTimeSlotModel, aProgram._id, {"upload": true, "playlist.id": resultScala.playlist.id, "playlist.name": resultScala.playlist.name, "playlistItem": resultScala.playlistItem.id}, function(err, res){
                                            callback(null, fileToPlay, contentNo);
                                        });
                                    }
                                    else{
                                        logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala with "interrupt" mode: ' + fileToPlay );
                                        adminBrowserMgr.showTrace(null, straceStamp+"!!!!!無法推送"+contentNo+"的UGC至播放系統!");
                                        //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala with "interrupt" mode: ' + fileToPlay );
                                        callback('Failed to push content to Scala :'+errScala, null, null);
                                    }
                                });

                            }
                        },
                        function(filePlayed, contentNo, callback){
                            //update "doohSubmitTimes" as well as "mustPlay" and "failedToGenliveContentInLastPlay" flag 
                            ugcModel.findOne({"no":contentNo}).exec(function(err, ugcItem){
                                if ( (!err) && ugcItem ) {
                                    ugcItem.mustPlay = false;
                                    ugcItem.failedToGenliveContentInLastPlay = false;
                                    ugcItem.doohSubmitTimes++;
                                    ugcItem.save(function(errOfSave){
                                        if (!errOfSave) {
                                            callback(null, filePlayed);
                                        }
                                        else {
                                            callback("Failed to update mustPlay, failedToGenliveContentInLastPlay flags: "+errOfSave, null);
                                        }
                                    });
                                }
                                else {
                                    callback("Failed to update mustPlay, failedToGenliveContentInLastPlay flags: "+err, null);
                                }
                                
                            });
                        },

                        function(filePlayed, callback){
                            //TODO: delete downloaded contents from local drive
                            callback(null,'done');
                        }, 
                    ], function (errWaterfall, resultWaterfall) {
                        // result now equals 'done' 
                        callbackIterator(errWaterfall);
                    });
                                     
                }
                else if( (playMode === "interrupt") && (aProgram.contentType == "media_item") ) {
                    //contentType is "media_item" under "interrupt" play mode  --> This is mainly for the leading padding content for continuous programs
                    if (aProgram.content.name){
                        var setting = {
                            media: { name: aProgram.content.name },
                            playlist:{ name: playlistName},
                            playTime: { start: aProgram.timeslot.start, end: aProgram.timeslot.end, duration: aProgram.timeslot.playDuration/1000 }
                        };
                        scalaMgr.pushMediaToPlaylist(setting, function(errScala, res){
                            if (!errScala){
                                logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + aProgram.content.name );
                                //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Successfully push to Scala: ' + aProgram.content.name );
                                playlistId = res.playlist.id;
                                adminBrowserMgr.showTrace(null, straceStamp+"成功推送"+aProgram.content.name+"至播放系統!");
                                db.updateAdoc(programTimeSlotModel, aProgram._id, {"upload": true, "playlist.id": res.playlist.id, "playlist.name": res.playlist.name, "playlistItem": res.playlistItem.id}, function(err, res){
                                    callbackIterator(null);
                                });
                            }
                            else{
                                logger.info('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + aProgram.content.name );
                                //console.log('[scheduleMgr.pushProgramsTo3rdPartyContentMgr()] Fail to push to Scala: ' + aProgram.content.name );
                                adminBrowserMgr.showTrace(null, straceStamp+"!!!!!無法推送"+aProgram.content.name+"至播放系統!");
                                callbackIterator('Failed to push content to Scala :'+errScala);
                            }
                        });
                        
                    }
                }
                else {
                    callbackIterator(null);
                }
                    
            };
            async.eachSeries(programs, iteratorPushAProgram, function(errEachSeries){
                if (!errEachSeries) {
                    if (playMode === "interrupt") {
                        //put the playlist in an "always-on-top" timeslot in schedule
                        if (playlistId) {
                            option = {
                                id : playlistId,
                                priority : 'ALWAYS_ON_TOP',
                                playTime: {start: Number(timeInfos[2]), end: Number(timeInfos[3])}
                            };
                            scalaMgr.createTimeslot( option, function(err, status){
                                // if ( status === "done" ) {
                                if ( !err ) {
                                    cb2(null, programs);
                                    adminBrowserMgr.showTrace(null, straceStamp+"成功地將此播放清單以插播型式('always-on-top' timeslot)放上schedule!");
                                }
                                else {  //Something is wrong. 
                                    //TODO: switch back when scalaMgr.createTimeslot() is more stable
                                    cb2(null, programs);
                                    //cb2('Failed to put the playlist in an "always-on-top" timeslot in the schedule: ' + JSON.stringify(err), null);
                                    adminBrowserMgr.showTrace(null, straceStamp+"!!!!!無法把插播的playlist推成'always-on-top'的timeslot,請通知RD手動把playlist放上schedule. 錯誤訊息： "+JSON.stringify(err));
                                }
                                
                            }); 
                        }
                        else {
                            //TODO: switch back when scalaMgr.createTimeslot() is more stable
                            cb2(null, programs);
                            //cb2("Failed to get playlistId after calling scalaMgr.pushMediaToPlaylist()", null);
                            adminBrowserMgr.showTrace(null, straceStamp+"!!!!!因無法取得playlistId以致於無法把插播的playlist推成'always-on-top'的timeslot");
                        }
                        
                        
                    } 
                    else {
                        cb2(null, programs);
                    } 
                }
                else {
                    cb2("push each programs to Scala: "+errEachSeries, null);
                }
            });
            

        },
        function(programs, cb3){
            // update the state of programTimeslot docs
            var iteratorUpdateAProgramState = function(aProgram, callbackOfIteratorUpdateAProgramState){
                //post to fb & send push
            	if (aProgram.type == "UGC"){
	                postPreview(aProgram, function(err, res){
	                    if(err)
	                        logger.info('Post FB message is Error: ' + err);
	                    else
	                        logger.info('Post FB message is Success: ' + res);
	                });
            	}
                //update the state of a programTimeslot doc
                db.updateAdoc(programTimeSlotModel, aProgram._id, {"state": "confirmed" }, function(errOfUpdateAdoc, result){
                    if (!errOfUpdateAdoc){
                        callbackOfIteratorUpdateAProgramState(null);
                    }
                    else {
                        callbackOfIteratorUpdateAProgramState("Failed to update program "+aProgram._id.toHexString()+": "+errOfUpdateAdoc);
                    }
                });
                
            };
            async.eachSeries(programs, iteratorUpdateAProgramState, function(errEachSeries){
                cb3(errEachSeries);
            });
        },
        function( cb4){
            // update the state of programGroup docs
            var iteratorUpdateAProgramGroupState = function(aProgramGroup, callbackOfIteratorUpdateAProgramGroupState){
                db.updateAdoc(programGroupModel, aProgramGroup._id, {"state": "confirmed" }, function(errOfUpdateAdoc, result){
                    if (!errOfUpdateAdoc){
                        callbackOfIteratorUpdateAProgramGroupState(null);
                    }
                    else {
                        callbackOfIteratorUpdateAProgramGroupState("Failed to update program "+aProgramGroup._id.toHexString()+": "+errOfUpdateAdoc);
                    }
                });

            };
            async.eachSeries(programGroups, iteratorUpdateAProgramGroupState, function(errEachSeries){
                cb4(errEachSeries);
            });
        }

    ], function (err, result) {
        if (!err) {
            adminBrowserMgr.showTrace(null, straceStamp+"節目推送完成!");
            logger.info("Successfully push programs to Scala!");
            if (pushed_cb) {
                pushed_cb(null);
            }
        }
        else {
            adminBrowserMgr.showTrace(null, straceStamp+"!!!節目推送失敗: "+err);
            logger.error("Failed to push programs to Scala: "+ err);
            if (pushed_cb) {
                pushed_cb(err);
            }            
        }
    });
                                                
};

/**
 * Push programs (of a specific session) to the 3rd-party content manager.<br>
 * <br>
 * @param {String} sessionId The id indicating the session of creating program time slot (This session id is accquired in the callback 
 *     passed to scheduleMgr.createProgramList(). )
 * @param {Function} pushed_cb The callback function called when the process is done.<br>
 *     The function signature is updated_cb(err), where err is the error message indicating failure: 
 *     if successful, err returns null; if failed, err returns the error message.
 */

scheduleMgr.pullProgramsFrom3rdPartyContentMgr = function(sessionId) {
    
};

/**
 * Update the programs (of a specific DOOH) of a specific interval.<br>
 * <br>
 * This method will ask ScalaMgr about the latest available time intervals (in which Miix system
 * can play its UGC content) and then re-schedule the programs accordingly. 
 * 
 * @param {String} dooh The ID of the DOOH whose programs are to be updated
 * 
 * @param {Object} intervalToUpdate An object specifying the starting and ending of  
 *     of the time interval in which the scheduled programs will be updated   
 *     <ul>
 *     <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 * @param {Function} updated_cb The callback function called when the program list is updated.<br>
 *     The function signature is updated_cb(err, listOfProgramsOutOfSchedule) :
 *     <ul>
 *     <li>err: error message if any error happens
 *     <li>listOfProgramsOutOfSchedule: An array of objects containing program info:
 *         <ul>
 *         <li>programTimeSlot: A string specifying the ID (the hex string representation of its ObjectID in MongoDB) of the program item which is removed from the schedule 
 *             after updating 
 *         <li>ugc: A string specifying the ID (the hex string representation of its ObjectID in MongoDB) of the UGC contained in this removed program. (This is
 *             actually the id of items store in ugc collection.) 
 *         </ul>
 *         For example, <br>
 *         [{programTimeSlot:43524, ugc:48593},<br>
 *          {programTimeSlot:43525, ugc:48353},<br>
 *          {programTimeSlot:43544, ugc:43593}]
 *         
 *     </ul>
 */
scheduleMgr.updateProgramList = function(dooh, intervalToUpdate, updated_cb ){
    
};



/**
 * Set an UGC of specific No to be played in a specific program time slot (of a specific DOOH <br>
 * <br>
 * @param {String} programTimeSlot The ID of the program time slot item
 * 
 * @param {Number} ugcReferenceNo The reference No the UGC item to put in the specified program time slot
 * 
 * @param {Function} set_cb The callback function called when the process is done.<br>
 *     The function signature is updated_cb(err) where err is the error message indicating failure: 
 *     if successful, err returns null; if failed, err returns the error message.
 *     
 */
scheduleMgr.setUgcToProgram = function( programTimeSlotId, ugcReferenceNo, originalContentClass, set_cb ){
    ugcModel.findOne({ 'no': ugcReferenceNo }, '_id genre contentGenre projectId fileExtension no ownerId mustPlay contentClass', function (err1, ugc) {
        if (!err1){
            if(originalContentClass != ugc.contentClass){
                set_cb(err1, "errContentClass");
            }else{
                var oidOfprogramTimeSlot = mongoose.Types.ObjectId(programTimeSlotId);
                var _ugc = JSON.parse(JSON.stringify(ugc)); //clone ugc object due to strange error "RangeError: Maximum call stack size exceeded"
                if(ugc !== null){
                    //TODO: Shall we have some protection here in case the user choose an UGC with different genra (This will normally introduce different paly duration
                    db.updateAdoc(programTimeSlotModel, oidOfprogramTimeSlot, {"content": _ugc }, function(err2, result){
                        if (set_cb){
                            set_cb(err2, ugc._id);
                        }
                    });
                }else{
                    set_cb(err1, "Cannot find the UGC with this referece number: "+ugcReferenceNo);
                }
                //set_cb(err1, ugc);
            }
//            console.log(ugc)
           
        }
        else {
            if (set_cb){
                set_cb("Cannot find the UGC with this referece number: "+err1, null);
            }
        }
    });
};


/**
 * Remove the UGC from a specific progrm (of a specific DOOH) and automatically set a new UGC back to this program time slot <br>
 * <br>
 * @param {String} sessionId The id indicating the session of creating program time slot (This session id is accquired in the callback 
 *     passed to scheduleMgr.createProgramList(). )
 * 
 * @param {String} programTimeSlot The ID of the program time slot item
 * 
 * @param {Function} removed_cb The callback function called when this process is done.<br>
 *     The function signature is removed_cb(err, newlySelectedUgc): 
 *     <ul>
 *     <li>err: error message if any error happens
 *     <li>newlySelectedUgc: the id of newly selected UGC (i.e. a hex string representation of its ObjectID in MongoDB)
 *     </ul>
 *     
 */
scheduleMgr.removeUgcfromProgramAndAutoSetNewOne = function(sessionId, programTimeSlot, removed_cb ){
    
    var oidOfprogramTimeSlot = mongoose.Types.ObjectId(programTimeSlot);
    var originalUgc = null;
    var sortedUgcList = null;
    var candidateUgcList = [];
    var selectedUgc = null;
    var indexOfLatCandidatUgcCache = 0;
    var intervalOfSelectingUGC = null;
    
    
    async.series([
                  function(cb00){
                      //get the interval of selecting UGC
                      
                      
                      cb00(null);
                  },
                  function(cb0){
                      //get the sorted UGC list
                      //TODO: better using sessionId to query to get the interval of selecting UGC of this session 
                      var sessionIdInfoArray = sessionId.split('-');
                      var intervalOfSelectingUGC = {start: Number(sessionIdInfoArray[0]), end: Number(sessionIdInfoArray[1]) };
                      
                          censorMgr.getUGCListLite(intervalOfSelectingUGC, "not_being_submitted_to_dooh", function(err0, _sortedUgcList ){
                          if (!err0) {
                              sortedUgcList = _sortedUgcList;
                              //console.log('sortedUgcList=');
                              //console.dir(sortedUgcList);
                              cb0(null);
                          }
                          else {
                              cb0('Failed to get UGC list: '+err0);
                          }
                      });
                  },
                  function(cb1){
                      //find the corresponding program time slot with id ("programTimeSlot" parameter)
                      programTimeSlotModel.findOne({ '_id': oidOfprogramTimeSlot }, 'content', function (err1, doc) {
                          if (!err1){
                              originalUgc = doc.content;
                              //console.log('originalUgc=');
                              //console.dir(originalUgc);   
                              //debugger; 
                              cb1(null);
                          }
                          else {
                              cb1('Cannot find the corresponding program time slot with id: '+err1);
                          }
                          
                      });
                  },
                  function(cb2){
                      //mark this UGC as "mustPlay" 
                      if ( originalUgc._id ){
                          var oidOfOriginalUgc = mongoose.Types.ObjectId(originalUgc._id); 
                          db.updateAdoc(ugcModel, oidOfOriginalUgc, {"mustPlay": true }, function(err2, ugc){
                              if (!err2){
                                  cb2(null);
                                  //debugger; 
                                  //console.log("The removed UGC=");
                                  //console.dir(ugc);
                              }
                              else {
                                  cb2('Cannot mark this UGC as "mustPlay": '+err2);
                              }
                          });
                      }
                      else{
                          cb2("This program time slot does not contain valid UGC");
                      }
                      
                  },
                  function(cb3){
                      //get candidate UGCs from DB 
                      candidateUgcCacheModel.find({ "sessionId": sessionId }).sort({"index":1}).exec(function (err3, doc) {
                          if (!err3){
                              if(!doc[0]){
                                  cb3('Failed to get candidate UGCs from DB: '+err3);
                              }else{
                                  for (var i=0; i<doc.length; i++) {
                                      candidateUgcList.push(doc[i].candidateUgc);
                                  }
                                  indexOfLatCandidatUgcCache = doc[doc.length-1].index;
                                  //console.log('indexOfLatCandidatUgcCache=%s', indexOfLatCandidatUgcCache);
                                  //debugger;
                                  //console.log("candidateUgcList=");
                                  //console.dir(candidateUgcList);               
                                  cb3(null);
                              }
                          }
                          else {
                              cb3('Failed to get candidate UGCs from DB: '+err3);
                          }
                      });
                  },
                  function(cb4){
                      //find next matching UGC candidate (with the same gendre)  
                      for (var indexOfcandidateToSelect=0; indexOfcandidateToSelect<=candidateUgcList.length; indexOfcandidateToSelect++){
                          
                          if (indexOfcandidateToSelect == candidateUgcList.length){
                              candidateUgcList = candidateUgcList.concat(sortedUgcList);
                          }
                          
                          if ( candidateUgcList[indexOfcandidateToSelect].contentGenre == originalUgc.contentGenre){
                              selectedUgc = candidateUgcList.splice(indexOfcandidateToSelect, 1)[0];
                              break;
                          }
                      } 
                      //console.log("selectedUgc=");
                      //console.dir(selectedUgc);    
                      
                      candidateUgcCacheModel.remove({"candidateUgc._id" : selectedUgc._id}, function(err4, result){
                          if (!err4){
                              //console.log("result=");
                              //console.dir(result);
                              cb4(null);
                          }
                          else {
                              cb4('Failed to remove the selected candidate UGC from DB (candidateUgcCache): '+err4);
                          }
                      });
                  }, 
                  function(cb5){
                      //update the content of the program time slot with the found UGC candidate  
                      var _selectedUgc = JSON.parse(JSON.stringify(selectedUgc)); //clone selectedUgc object to prevent from a strange error "RangeError: Maximum call stack size exceeded"
                      db.updateAdoc(programTimeSlotModel, oidOfprogramTimeSlot, {"content": _selectedUgc }, function(err5, result){
                          if (!err5){
                              cb5(null);
                          }
                          else {
                              cb5('Failed to update the content of the program time slot with the found UGC candidate: '+err5);
                          }
                      });
                  },
                  function(cb6){  //TODO: possibly need further verify the implementation of this function
                      //update candidate UGC to DB
                      
                      //for test only
                      //candidateUgcList = candidateUgcList.concat(sortedUgcList); 
                      
                      var iteratorUpdateCandidateUgcListToDB = function(aCandidateUgc, interationDone_cb){
                          
                          candidateUgcCacheModel.find({ "candidateUgc._id": aCandidateUgc._id }).exec(function (err6_1, _result) {
                              if (!err6_1) {
                                  //console.log("_result=");
                                  //console.dir(_result);
                                  if (_result.length === 0){
                                      //create candidate UGC cache in DB
                                      var CandidateUgcCache = db.getDocModel("candidateUgcCache");
                                      var aCandidateUgcCache = new CandidateUgcCache();
                                      aCandidateUgcCache.sessionId = sessionId;
                                      indexOfLatCandidatUgcCache++;
                                      aCandidateUgcCache.index = indexOfLatCandidatUgcCache;
                                      var _candidateUgc = JSON.parse(JSON.stringify( aCandidateUgc )); //clone candidateUgc object to prevent from strange error "RangeError: Maximum call stack size exceeded"
                                      aCandidateUgcCache.candidateUgc = _candidateUgc;
                                      aCandidateUgcCache.markModified('candidateUgc');
                                      aCandidateUgcCache.save(function(err6, aSavedCandidateUgcCache){     
                                          if (!err6){
                                              interationDone_cb(null);
                                              //console.log("aSavedCandidateUgcCache=");
                                              //console.dir(aSavedCandidateUgcCache);
                                          }
                                          else {
                                              interationDone_cb('Failed to update candidate UGC to DB: '+err6);
                                          }
                                      });   
                                  }
                                  else {
                                      interationDone_cb(null);
                                  }
                              }
                              else {
                                  interationDone_cb("Failed to query candidateUgcCache by candidateUgc._id: "+err6_1);
                              }
                          });
                      };
                      
                      async.eachSeries(candidateUgcList, iteratorUpdateCandidateUgcListToDB, function(err6){
                          if (!err6) {
                              cb6(null);
                          }
                          else {
                              cb6('Failed to update candidate UGC to DB: '+err6);
                          }
                      });
                  }
    ],
    function(err){
        if (!err) {
            if (removed_cb){
                removed_cb(null, selectedUgc._id);
            }
        }
        else {
            if (removed_cb){
                removed_cb(err, null);
            }
        }
        
    });
    
};

/**
 * Get a list showing all the planning sessions (a.k.a. calling scheduleMgr.createProgramList()) done in the past.<br>
 * <br>
 * @param {Number} pageLimit The number of program time slot items to return (in got_cb's result).  If null, it returns all items.
 * @param {Number} pageSkip The number of program time slot items to skip when returning in in got_cb's result. If null, there is no skip.
 * @param {Function} got_cb The callback function called when the query is don.<br>
 *     The function signature is got_cb(err, resultSessionList):
 *     <ul>
 *     <li>err: error message if any error happens
 *     <li>resultSessionList: An array of objects containing program info:
 *         <ul>
 *         <li>_id: A string (i.e. a hex string representation of its ObjectID in MongoDB) specifying the ID of a session item  
 *         
 *         <li>dooh: The ID of the DOOH upon which the selected UGCs are played
 *         
 *         <li>intervalOfSelectingUGC: An object specifying the starting and ending of  
 *             of the time interval for scheduleMgr to select the applied UGC items <br>
 *             <ul>
 *             <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             </ul>
 *             For example, {start: 1371861000000, end: 1371862000000} 
 *
 *         <li>intervalOfPlanningDoohProgrames: An object specifying the starting and ending of  
 *             of the time interval which the generated schedule covers   
 *             <ul>
 *             <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *             </ul>
 *             For example, {start: 1371861000000, end: 1371862000000} 
 * 
 *         <li>programSequence An array of strings showing the sequence of program content genres to use when 
 *             when the system is planning the program(s) of a "micro time interval" <br>
 *             Note: the string must be "miix_it", "cultural_and_creative", "mood", or "check_in"
 *             For example, ["miix_it", "check_in", "check_in", "mood", "cultural_and_creative" ] <br>
            
 *         </ul>
 *         For example, <br>
 *         [{_id:"3g684j435g5226h5648jrk24", dooh:"TP_dom", intervalOfSelectingUGC:{start:1371861000000, end :1371862000000}, intervalOfPlanningDoohProgrames:{start:1371861000000, end :1371862000000}, programSequence:["miix_it", "check_in", "check_in", "mood", "cultural_and_creative" ]},<br>
 *          {_id:"3g684j435g5632h5648jrk24", dooh:"TP_dom", intervalOfSelectingUGC:{start:1371881000000, end:1371882000000}, intervalOfPlanningDoohProgrames:{start:1371861000000, end :1371862000000}, programSequence:["miix_it", "check_in", "check_in", "mood", "cultural_and_creative" ]},<br>
 *          {_id:"3g684j43e64hf6h5648jrk24", dooh:"TP_dom", intervalOfSelectingUGC:{start:1371897000000, end:1371898000000}, intervalOfPlanningDoohProgrames:{start:1371861000000, end :1371862000000}, programSequence:["miix_it", "check_in", "check_in", "mood", "cultural_and_creative" ]}]
 *         
 *     </ul>
 */
scheduleMgr.getSessionList = function(interval, pageLimit, pageSkip, got_cb ){
    
    var sessionList = [];

    var sessionListInfo = function(dooh, sessionId, intervalOfSelectingUGCStart, intervalOfSelectingUGCEnd, ntervalOfPlanningDoohProgramesStart, intervalOfPlanningDoohProgramesEnd, programSequence, pushProgramsTime, arr) {
        arr.push({
            dooh: dooh,
            sessionId: sessionId,
            intervalOfSelectingUGCStart: intervalOfSelectingUGCStart,
            intervalOfSelectingUGCEnd: intervalOfSelectingUGCEnd,
            intervalOfPlanningDoohProgramesStart: ntervalOfPlanningDoohProgramesStart, 
            intervalOfPlanningDoohProgramesEnd: intervalOfPlanningDoohProgramesEnd, 
            programSequence: programSequence,
            pushProgramsTime: pushProgramsTime
        });
    };
    
    var query = sessionItemModel.find({ "intervalOfSelectingUGC.start": {$gte:interval.start}, "intervalOfSelectingUGC.end":{$lt:interval.end}})
                        .sort({pushProgramsTime:-1});
    
    if (pageLimit!==null){
        query = query.limit(pageLimit);
    }
    
    if (pageSkip!==null){
        query = query.skip(pageSkip);
    }
        
    query.exec(function (_err, result) {
        
        if(_err) got_cb(_err, result);
        if(result === null) got_cb('No result', result);
        else if (result){
            async.eachSeries(result, mappingSessionList, function(err0){
                if (!err0) {
                    got_cb(null, sessionList);
                }
                else{
                    got_cb('Failed to get session list : '+err0, null);
                }
            });
            
        }
        
    });    

    
    var mappingSessionList = function(data ,cbOfmappingSessionList){

        var _intervalOfSelectingUGCStart = null;
        var _intervalOfSelectingUGCEnd = null;
        var _intervalOfPlanningDoohProgramesStart = null;
        var _intervalOfPlanningDoohProgramesEnd = null;
        var _pushProgramsTime = null;

        if(data.intervalOfSelectingUGC){
            _intervalOfSelectingUGCStart = data.intervalOfSelectingUGC.start;
            dateTransfer(_intervalOfSelectingUGCStart, function(result){
                _intervalOfSelectingUGCStart = result;
            });
        }
        if(data.intervalOfSelectingUGC){
            _intervalOfSelectingUGCEnd = data.intervalOfSelectingUGC.end;
            dateTransfer(_intervalOfSelectingUGCEnd, function(result){
                _intervalOfSelectingUGCEnd = result;
            });
        }
        if(data.intervalOfPlanningDoohProgrames){
            _intervalOfPlanningDoohProgramesStart = data.intervalOfPlanningDoohProgrames.start;
            dateTransfer(_intervalOfPlanningDoohProgramesStart, function(result){
                _intervalOfPlanningDoohProgramesStart = result;
            });
        }
        if(data.intervalOfPlanningDoohProgrames){
            _intervalOfPlanningDoohProgramesEnd = data.intervalOfPlanningDoohProgrames.end;
            dateTransfer(_intervalOfPlanningDoohProgramesEnd, function(result){
                _intervalOfPlanningDoohProgramesEnd = result;
            });
        }
        if(data.pushProgramsTime){
            _pushProgramsTime = new Date(data.pushProgramsTime).getTime();
            dateTransfer(_pushProgramsTime, function(result){
                _pushProgramsTime = result;
            });
        }
        
        sessionListInfo(data.dooh, data.sessionId, _intervalOfSelectingUGCStart, _intervalOfSelectingUGCEnd, _intervalOfPlanningDoohProgramesStart, _intervalOfPlanningDoohProgramesEnd, data.programSequence, _pushProgramsTime, sessionList);
        cbOfmappingSessionList(null);
    };

};

var dateTransfer = function(date, cbOfDateTransfer){
    tempDate = new Date(date).toString().substring(0,25);
    yyyy = tempDate.substring(11,15);
    mm = new Date(date).getMonth()+1;
    dd = tempDate.substring(8,10);
    time = tempDate.substring(16,25);
    tempDate = yyyy+'/'+mm+'/'+dd+' '+time;
//  console.log(yyyy+'/'+mm+'/'+dd+' '+time);
    cbOfDateTransfer(tempDate);
};


//test
//dateTransfer(1377144000000, function(result){
//    console.log(result);
// });

//scheduleMgr.getSessionList({start:(new Date("2013/5/5 7:30:20")).getTime(), end:(new Date("2013/8/30 8:30:20")).getTime()}, null, null, function(err, result){
//    console.log(err, result);
//});

module.exports = scheduleMgr;