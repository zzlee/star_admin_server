//var ProgramGroup = function(v1) {
//    this.v1 = v1;
//};
//
//ProgramGroup.prototype.method1 = function() {
//    console.log("this.v1 = %s", this.v1);
//};

var db = require('../db.js');
var async = require('async');
var programPlanningPattern = require("./program_planning_pattern.js");
var paddingContent = require("./padding_content.js");
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var DEFAULT_PLAY_DURATION_FOR_STATIC_PADDING = 2*1000; //2 sec.

/**
 * constructor
 * 
 * @param {Object} interval An object specifying the starting and ending of  
 *     of the time interval which this program group covers   
 *     <ul>
 *     <li>start: the start of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     <li>end: the end of the interval (with the number of milliseconds since midnight Jan 1, 1970)
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 *     
 * @param {Object} options specifying the some options:
 *     <ul>
 *     <li>programGroupTemplate: the id of Program Group Template which it use.  Set it null if we don't use any Program Group Template
 *     </ul>
 *     For example, {start: 1371861000000, end: 1371862000000} 
 */
var ProgramGroup = function(interval, dooh, planner, sessionId, options) {
    this.interval = interval;
    this.dooh = dooh;
    this.planner = planner;
    this.sessionId = sessionId;
    this.options = options;
};

ProgramGroup.prototype.generateByTemplate = function(cbOfgenerate) {
    var _this = this;
    
    
    var contentGenre = programPlanningPattern.getProgramGenreToPlan(); //the genra that will be uesed in this micro interval
    var numberOfUGC;
    if (contentGenre=="miix_it"){
        numberOfUGC = 1;
    }
    else{
        numberOfUGC = 3;
    }
    var paddingContents;
    
    var ProgramTimeSlot = programTimeSlotModel;
    var vjsonDefault = {
            contentType: "file",
            dooh: _this.dooh,
            timeslot: {
                start: _this.interval.start, 
                end: _this.interval.end,
                startHour: (new Date(_this.interval.start)).getHours()},
            //content: {ugcId:"12345676", ugcProjcetId:"3142462123"}
            contentGenre: contentGenre,
            planner: _this.planner,
            state: 'not_confirmed',
            session: _this.sessionId
            };
    
    var timeStampIndex = 0;
    
    var pad = function(n, width, z) { //function for padding the number ns with character z 
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    };
    
    async.series([
        function(callback1){
            // get all the padding contents
            var indexArrayPaddingContents = []; for (var i = 0; i < numberOfUGC+1; i++) { indexArrayPaddingContents.push(i); }
            
            var iteratorGetPaddingContents = function(indexOfPaddingContents, interationDone_getPaddingContents_cb){
                paddingContent.get(contentGenre+'-'+indexOfPaddingContents , function(err_get, paddingContent){
                    interationDone_getPaddingContents_cb(err_get, paddingContent);
                });
            };
            async.mapSeries(indexArrayPaddingContents, iteratorGetPaddingContents, function(err, results){
                paddingContents = results;
                //console.log('paddingContents=');
                //console.dir(paddingContents);
                callback1(null);
            });
            
        },
        function(callback2){
            // put padding program 0
            var aProgramTimeSlot = new ProgramTimeSlot(vjsonDefault);
            aProgramTimeSlot.type = 'padding';
            aProgramTimeSlot.contentType = 'media_item';
            aProgramTimeSlot.content = paddingContents[0];
            aProgramTimeSlot.timeslot.playDuration = DEFAULT_PLAY_DURATION_FOR_STATIC_PADDING;
            aProgramTimeSlot.timeStamp = _this.interval.start + '-' + pad(timeStampIndex, 3);
            timeStampIndex++;
            aProgramTimeSlot.markModified('content');
            aProgramTimeSlot.save(function(err1, _result){     
                //if (err1) console.log("err1="+err1);
                callback2(err1);
            });
        },
        function(callback3){
            // put following programs: UGC 0, padding 1, UGC 1, padding 2, .....
            var indexArrayUgcPrograms = []; for (var i = 0; i < numberOfUGC; i++) { indexArrayUgcPrograms.push(i); }
            
            var iteratorPutUgcAndPaddingProgrames = function(indexOfUgcContents, interationDone_putUgcAndPaddingPrograms_cb){
                
                async.series([
                              function(cb1){
                                  //put UGC program
                                  var aProgramTimeSlot = new ProgramTimeSlot(vjsonDefault);
                                  aProgramTimeSlot.type = 'UGC';
                                  aProgramTimeSlot.timeStamp = _this.interval.start + '-' + pad(timeStampIndex, 3);
                                  timeStampIndex++;
                                  aProgramTimeSlot.save(function(err2, _result){     
                                      cb1(err2);
                                  });
                              },
                              function(cb2){
                                  //put padding program
                                  var aProgramTimeSlot = new ProgramTimeSlot(vjsonDefault);
                                  aProgramTimeSlot.type = 'padding';
                                  aProgramTimeSlot.contentType = 'media_item';
                                  aProgramTimeSlot.content = paddingContents[indexOfUgcContents+1];
                                  aProgramTimeSlot.markModified('content');
                                  aProgramTimeSlot.timeslot.playDuration = DEFAULT_PLAY_DURATION_FOR_STATIC_PADDING;
                                  aProgramTimeSlot.timeStamp = _this.interval.start + '-' + pad(timeStampIndex, 3);
                                  timeStampIndex++;
                                  aProgramTimeSlot.save(function(err3, _result){     
                                      cb2(err3);
                                  });
                              }
                ],
                function(err, results){
                    interationDone_putUgcAndPaddingPrograms_cb(err);
                });
                
            };
            async.eachSeries(indexArrayUgcPrograms, iteratorPutUgcAndPaddingProgrames, function(err){
                callback3(null);
            });
            
    }
    ],
    function(err, results){
        cbOfgenerate(err);
    });

    

    
};


module.exports = ProgramGroup;