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
var programGroupTemplate = require("./program_group_template.js");
var programTimeSlotModel = db.getDocModel("programTimeSlot");
var programGroupModel = db.getDocModel("programGroup");
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
//    console.log("sessionId");
//    console.dir(sessionId);
};

ProgramGroup.prototype.generateByTemplate = function(templateId, cbOfgenerate) {
    var _this = this;
    
    
    var contentGenre = programPlanningPattern.getProgramGenreToPlan(); //TODO:make this query only for a specific session  //the genre that will be used in this program group  
    var paddingContents;
    var programGroupVjson;
    var programs;
    
    var vjsonDefault = {
        contentType: "file",
        dooh: _this.dooh,
        timeslot: {
            start: _this.interval.start, 
            end: _this.interval.end,
            startHour: (new Date(_this.interval.start)).getHours()},
        contentGenre: contentGenre,
        planner: _this.planner,
        state: 'not_confirmed',
        session: _this.sessionId
    };
    
    
    var pad = function(n, width, z) { //function for padding the number ns with character z 
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    };

    var aProgramGroup = null;

    async.waterfall([
        function(callback){
            //get the program group from template
            programGroupTemplate.get(templateId, function(errOfGet, _pgTemplate){
                if (!errOfGet){
                    programGroupVjson = _pgTemplate;
                    programs = programGroupVjson.programs;
                    
                    callback(null);
                }
                else {
                    callback("Failed to get the program group template: "+ errOfGet);
                }
            });
        },
        function(callback){
            // generate programs: padding 0, UGC 0, padding 1, UGC 1, padding 2, .....
            var indexArrayPrograms = []; for (var i = 0; i < programs.length; i++) { indexArrayPrograms.push(i); }
            
            var iteratorPutUgcAndPaddingProgrames = function(indexOfPrograms, cbOfIteratorPutUgcAndPaddingProgrames){
                
                var aProgramTimeSlot = new programTimeSlotModel(vjsonDefault);
                if (programs[indexOfPrograms].type == "padding" ) {
                    aProgramTimeSlot.type = 'padding';
                    aProgramTimeSlot.contentType = 'media_item';
                    if (indexOfPrograms === 0 ){
                        aProgramTimeSlot.content = {name: paddingContent.get(contentGenre, 'start') };
                    }
                    else if (indexOfPrograms == (programs.length-1) ){
                        aProgramTimeSlot.content = {name: paddingContent.get(contentGenre, 'end') };
                    }
                    else {
                        aProgramTimeSlot.content = {name: paddingContent.get(contentGenre, 'middle') };
                    }
                    aProgramTimeSlot.markModified('content');
                    
                }
                else { //programs[indexOfPrograms].type == "UGC"
                    aProgramTimeSlot.type = 'UGC';
                }
                
                aProgramTimeSlot.timeslot.playDuration = programs[indexOfPrograms].preSetDuration;
                aProgramTimeSlot.timeStamp = _this.interval.start + '-' + pad(programs[indexOfPrograms].sequenceNo, 3);
                aProgramTimeSlot.save(function(errOfSave, _result){     
                    if (!errOfSave) {
                        programs[indexOfPrograms]._id = _result._id;
                        cbOfIteratorPutUgcAndPaddingProgrames(null);
                    }
                    else {
                        cbOfIteratorPutUgcAndPaddingProgrames("Failed to add a new programTimeslot to DB: "+errOfSave);
                    }
                    
                });

                
            };
            async.eachSeries(indexArrayPrograms, iteratorPutUgcAndPaddingProgrames, function(err){
                callback(err);
            });
            
        },
        function(callback){
            //save to programGroupVjson to DB
            programGroupVjson.interval = _this.interval;
            programGroupVjson.planner = _this.planner;
            programGroupVjson.programSession = _this.sessionId;
            
            aProgramGroup = new programGroupModel(programGroupVjson);
//            aProgramGroup.interval = _this.interval;
//            aProgramGroup.planner = _this.planner;
            

            aProgramGroup.save(function(errOfSave, _result){     
                if (!errOfSave) {
                    callback(null);
                }
                else {
                    callback("Failed to add a new programGroup to DB: "+errOfSave);
                }
                
            });
            
        }
    ],
    function(err, results){
        cbOfgenerate(err);
    });
       
};


ProgramGroup.prototype.generateFromSortedUgcList = function(sortedUgcList, cbOfGenerateFromSortedUgcList) {
    var _this = this;
    var DURATION_FOR_NORMAL = 15; //sec
    var DURATION_FOR_VIP = 120; //sec
    
    var programGroupVjson = {
        programs : []    
    };
    var programs = programGroupVjson.programs;
    
    var vjsonDefault = {
        contentType: "file",
        dooh: _this.dooh,
        timeslot: {
            start: _this.interval.start, 
            end: _this.interval.end,
            startHour: (new Date(_this.interval.start)).getHours()},
        contentGenre: contentGenre,
        planner: _this.planner,
        state: 'not_confirmed',
        type: 'UGC',
        session: _this.sessionId
    };
    
    var candidateUgcList = sortedUgcList.slice(0); //clone the full array of sortedUgcList
    var isLoopedAround = false;

    
    async.waterfall([
        function(callback){
            //put the programs into the program group from the candidate list
            var maxAllowableDuration = _this.interval.end - _this.interval.start ;  //millisecond
            var totalDuration = 0; //millisecond
            var sequenceNo = 0;
            
            async.whilst(
                function () { return totalDuration <= maxAllowableDuration; },
                function (cbOfWhilst) {
                    
                    var aProgramTimeSlot = new programTimeSlotModel(vjsonDefault);
                    
                    
                    
                    aProgramTimeSlot.timeStamp = _this.interval.start + '-' + pad(sequenceNo, 3);
                    
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
                    
                    var playDuration; //sec
                    if (selectedUgc.contentClass == "VIP") {
                        playDuration = 120;  //2 mins
                    }
                    else {
                        playDuration = 15; //15 sec
                    }
                    aProgramTimeSlot.timeslot.playDuration = playDuration;
                    programs[sequenceNo].preSetDuration = playDuration;  


                    aProgramTimeSlot.isLoopedAround = isLoopedAround;
                    aProgramTimeSlot.content = JSON.parse(JSON.stringify(selectedUgc)); //clone selectedUgc object to prevent from a strange error "RangeError: Maximum call stack size exceeded"
                    
                    totalDuration += playDuration*1000;
                    sequenceNo++;
                    aProgramTimeSlot.save(function(errOfSave, _result){     
                        if (!errOfSave) {
                            programs[sequenceNo]._id = _result._id;
                            cbOfWhilst(null);
                        }
                        else {
                            cbOfWhilst("Failed to add a new programTimeslot to DB: "+errOfSave);
                        }
                        
                    });
                    
                },
                function (errOfWhilst) {
                    callback(errOfWhilst);
                }
            );

            
        },
        function(callback){
            //save to programGroupVjson to DB
            programGroupVjson.interval = _this.interval;
            programGroupVjson.planner = _this.planner;
            programGroupVjson.programSession = _this.sessionId;
            
            aProgramGroup = new programGroupModel(programGroupVjson);
            
            aProgramGroup.save(function(errOfSave, _result){     
                if (!errOfSave) {
                    callback(null, _result);
                }
                else {
                    callback("Failed to add a new programGroup to DB: "+errOfSave, null);
                }
                
            });
            
        }
    ],
    function(err, resultProgramGroup){
        cbOfGenerateFromSortedUgcList(err, resultProgramGroup);
    });
};

module.exports = ProgramGroup;