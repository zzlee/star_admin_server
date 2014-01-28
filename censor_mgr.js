
var censorMgr = {};

var async = require('async');
var fb_handler = require('./facebook_mgr.js');
var FMDB = require('./db.js');
var UGC_mgr = require('./UGC.js');
var sheculeMgr = require("./schedule").scheduleMgr;
var member_mgr = require('./member.js');
var pushMgr = require('./push_mgr.js');
var canvasProcessMgr = require('./canvas_process_mgr.js');
var storyContentMgr = require('./story_content_mgr.js');
var fbMgr = require('./facebook_mgr.js');

var UGCs = FMDB.getDocModel("ugc");
var programTimeSlotModel = FMDB.getDocModel("programTimeSlot");
var userLiveContentModel = FMDB.getDocModel("userLiveContent");
var memberModel = FMDB.getDocModel("member");

sheculeMgr.init(censorMgr);



/**
 * @param  request  {json}condition
 *                  (json}sort
 * 
 *         query    {number}createdOn
 *                  {string}rating
 *                  {number}doohPlayedTimes     
 *                  
 * @return response json{userContent(photo url or userContent link in s3),
 *                       FB_ID,
 *                       title,
 *                       description,
 *                       createdOn,
 *                       rating(Range A~E),
 *                       doohPlayedTimes}
 */
censorMgr.getUGCList = function(condition, sort, pageLimit, pageSkip, pageType, cb){
    var start;
    var end;
    var limit;

    if(condition){
        //for UGC page
        if(condition.timeStart && condition.timeEnd){
            start = (new Date(condition.timeStart)).getTime();
            end = (new Date(condition.timeEnd)).getTime();
            condition ={
                    'no':{ $exists: true},
                    'ownerId':{ $exists: true},
                    'projectId':{ $exists: true},
                    'createdOn': {$gte: start, $lt: end}
            };
        }
        else if(condition == 'rating') condition ={
                'no':{ $exists: true},
                'ownerId':{ $exists: true},
                'projectId':{ $exists: true},
                'rating':{ $exists: true}
        };
        else if(condition == 'norating') condition ={
                'no':{ $exists: true},
                'ownerId':{ $exists: true},
                'projectId':{ $exists: true},
                'rating':{ $exists: false}
        };
        //for highlight page
        else if(condition.highlightTimeStart && condition.highlightTimeEnd){
            start = (new Date(condition.highlightTimeStart)).getTime();
            end = (new Date(condition.highlightTimeEnd)).getTime();
            condition ={
                    'no':{ $exists: true},
                    'ownerId':{ $exists: true},
                    'projectId':{ $exists: true},
                    'createdOn': {$gte: start, $lt: end},
                    'doohPlayedTimes':{$gte : 1}
            };
        }
    }

    if ( pageLimit && pageSkip ) {
        FMDB.listOfdocModels( UGCs,condition,'fb.userID _id title description createdOn rating doohPlayedTimes projectId ownerId no contentGenre mustPlay userRawContent highlight url processingState fbProfilePicture forMRTReview contentClass', {sort :sort ,limit: pageLimit ,skip: pageSkip}, function(err, result){
            if(err) {
                logger.error('[censorMgr_db.listOfUGCs]', err);
                cb(err, null);
            }
            if(result){

                if(pageSkip < result.length && pageLimit < result.length)
                    limit = pageLimit;
                else 
                    limit = result.length;

                if(limit > 0){ 
                    mappingUGCList(result, pageType, function(err,docs){
                        if (cb){
                            cb(err, UGCList);
                        }
                    });
                }else
                    cb(err, UGCList);
            }
        });

    }

};//getUGCList end

/**
 * mapping UGC list
 */


var limit = 0;
var next = 0;
var UGCList = [];
var timeslotStart;
var timeslotEnd;


var UGCListInfo = function(ugcProjectId, userPhotoUrl, ugcCensorNo, userContent, fb_userName, fbPictureUrl, title, description, doohPlayedTimes, rating, contentGenre, mustPlay, timeslotStart, timeslotEnd, timeStamp, programTimeSlotId, highlight, url, liveContentUrl, processingState, tsLiveStateCount,tsUGCCount, forMRTReview, createdOn, contentClass, arr) {
    arr.push({
        ugcProjectId: ugcProjectId,
        userPhotoUrl: userPhotoUrl,
        ugcCensorNo: ugcCensorNo,
        userContent: userContent,
        fb_userName: fb_userName,
        fbPictureUrl: fbPictureUrl,
        title: title,
        description: description,
        doohPlayedTimes:doohPlayedTimes, 
        rating: rating,
        contentGenre: contentGenre,
        mustPlay: mustPlay,
        timeslotStart: timeslotStart,
        timeslotEnd: timeslotEnd,
        timeStamp: timeStamp,
        programTimeSlotId: programTimeSlotId,
        highlight: highlight,
        url: url,
        liveContentUrl: liveContentUrl,
        processingState: processingState,
		tsLiveStateCount: tsLiveStateCount,
        tsUGCCount:tsUGCCount,
		forMRTReview:forMRTReview,
        createdOn: createdOn,
        contentClass: contentClass
    });
};
var mappingUGCList = function(data, type, set_cb){
    limit = data.length;

    var toDo = function(err, result){
        //err
        if(err){
            if(next == limit - 1) {
                set_cb(null, 'ok'); 
                next = 0;
                UGCList = []; 
            }else{
                next += 1;
                mappingUGCList(data, type, set_cb);
            }
            return;
        }
            
        //data[next] not exist
        if(!data[next]) return;
        
        var userPhotoUrl = 'No Photo';
        var description = null;
        
        //timeslot
        if(data[next].timeslot){
            timeslotDateStart = new Date(data[next].timeslot.start).toString().substring(0,25);
            timeslotDateEnd = new Date(data[next].timeslot.end).toString().substring(0,25);
            //timeslotStart date format
            yyyy = timeslotDateStart.substring(11,15);
            mm = new Date(data[next].timeslot.start).getMonth()+1;
            dd = timeslotDateStart.substring(8,10);
            time = timeslotDateStart.substring(16,25);
            timeslotStart = yyyy+'/'+mm+'/'+dd+' '+time;
            //timeslotEnd date format
            yyyy = timeslotDateEnd.substring(11,15);
            mm = new Date(data[next].timeslot.end).getMonth()+1;
            dd = timeslotDateEnd.substring(8,10);
            time = timeslotDateEnd.substring(16,25);
            timeslotEnd = yyyy+'/'+mm+'/'+dd+' '+time;
        }
        //userRawContent
        if(data[next].userRawContent){
            for(var i=0 ; i <data[next].userRawContent.length ; i++){
                if(data[next].userRawContent[i].type == 'text')
                    description = data[next].userRawContent[i].content;
                if(data[next].userRawContent[i].type == 'image')
                    userPhotoUrl = data[next].userRawContent[i].content;
            }
        }
        //UGCListInfo
        if(next == limit - 1) {
            UGCListInfo(data[next].projectId, userPhotoUrl, data[next].no, description, result[1], data[next].fbProfilePicture, data[next].title, data[next].description, data[next].doohPlayedTimes, data[next].rating, data[next].contentGenre, data[next].mustPlay, timeslotStart, timeslotEnd, data[next].timeStamp, data[next].programTimeSlotId, data[next].highlight, data[next].url, result[2], data[next].processingState, result[3],result[4],data[next].forMRTReview, data[next].createdOn, data[next].contentClass,UGCList);
            set_cb(null, 'ok'); 
            next = 0;
            UGCList = [];
        }
        else{
            UGCListInfo(data[next].projectId, userPhotoUrl, data[next].no, description, result[1], data[next].fbProfilePicture, data[next].title, data[next].description, data[next].doohPlayedTimes, data[next].rating, data[next].contentGenre, data[next].mustPlay, timeslotStart, timeslotEnd, data[next].timeStamp, data[next].programTimeSlotId, data[next].highlight, data[next].url, result[2], data[next].processingState,result[3], result[4],data[next].forMRTReview,data[next].createdOn, data[next].contentClass, UGCList);
            next += 1;
            mappingUGCList(data, type, set_cb);
        }

    };//toDo End ******

    //async
    if(!data[next]){
        return;
    }
        async.parallel([
                        //deprecated
                       function(callback){
						   if(data[next].contentGenre == "miix_it"){
							   memberModel.find({'_id': data[next].ownerId._id}).exec(function(err, member){
								   if(err){
									   logger.error('[mappingUserProfilePicture_getUserContent]', err);
									   callback(err, null);
								   }
								   if(member[0]){
									   // console.log(member);
									   getUserContent(member[0].fb.userID, member[0].app, function(err, result){
										   if(err){
											   logger.error('[mappingUserProfilePicture_getUserContent]', err);
											   callback(err, null);
										   }
										   if(result){
											   callback(null, result);
										   }
									   });
								   }else
										callback(null, 'No User');
								   
							   });
						   }else{
								callback(null, 'No User');
						   }

                       },
                        function(callback){
                            member_mgr.getUserNameAndID(data[next].ownerId._id, function(err, result){
                                if(err) callback(err, null);
                                else if(result === null) callback(null, 'No User');
                                else callback(null, result.fb.userName);
                            });

                        },
                        function(callback){
                            if(type == "highlight"){
                            userLiveContentModel.find({"sourceId": data[next].projectId, "state":"correct"}).sort({'createdOn': -1}).exec(function(err, result){
                                // console.log(err, result);
                                   if(err) callback(err, null);
                                   else if(!result) callback('No Live Content', null);
                                   else if(!result[0]) callback('No Live Content', null);
                                   else if(!result[0].url) callback('No Live Content', null);
                                   else if(!result[0].url.s3) callback('No Live Content', null);
                                   else{
                                       callback(null, result[0].url.s3);
                                   }
                               });
                            }else
                                callback(null, 'not highlight');

                        },
                        function(callback){ // get count of programTimeSlot's liveState is correct for UGCLIST by Joy
                            programTimeSlotModel.count({"content.no":data[next].no,"liveState":"correct"}).exec(function(err,result){
                                callback(null,result);
                            });
                            
                        },
                        function(callback){ // get count of programTimeSlot's (without other conditions) for UGCLIST by Joy
                            programTimeSlotModel.count({"content.no":data[next].no}).exec(function(err,result){
                              callback(null,result);
                          });
                        }
                        ], toDo);
    

};
/**
 * @param  request  {string}dooh_ID
 * 
 *         query    
 *                  
 * @return response json{startDate,
 *                       endDate,
 *                       sequence,
 *                       uratio}
 * 
 */
var getTimeslots = function(get_cb){

};


/**
 * @param  request  {string}FB_ID
 * 
 *         query    
 *                  
 * @return response json{FBProfilePicture(link)}
 *                       
 */

var getUserContent = function(fb_id, app, get_cb){

    fb_handler.getUserProfilePicture(fb_id, app, function(err, result){
        if(err){
            get_cb(err,null);
        }
        else{
            get_cb(null,result.picture.data.url);
        }
    });

};

/**
 * @param  request  {number}no
 * 
 *         body     {string}UGCLevel(Range A~E)    
 *                  
 * @return response {string}status 
 *                       
 */
censorMgr.setUGCAttribute = function(no, vjson, cb){

    //TODO: find a cleaner way to avoid the code section below
    if(vjson.mustPlay == 'true')
        vjson = {mustPlay : true};
    else if(vjson.mustPlay == 'false')
        vjson = {mustPlay : false};
    if(vjson.highlight == 'true')
        vjson = {highlight : true};
    else if(vjson.highlight == 'false')
        vjson = {highlight : false};

    if(vjson.forMRTReview == 'true')
        vjson = {forMRTReview : true};
    else if(vjson.forMRTReview == 'false')
        vjson = {forMRTReview : false};

    if(vjson.failedToGenliveContentInLastPlay == 'true')
        vjson = {failedToGenliveContentInLastPlay : true};
    else if(vjson.failedToGenliveContentInLastPlay == 'false')
        vjson = {failedToGenliveContentInLastPlay : false};


    UGC_mgr.getOwnerIdByNo(no, function(err, result){
        if(err) logger.error('[setUGCAttribute_getOwnerIdByNo]', err);

        if(result){
            FMDB.updateAdoc(UGCs,result,vjson, function(err, result){
                if(err) {
                    logger.error('[setUGCAttribute_updateAdoc]', err);
                    cb(err,null);
                }
                if(result){
                    cb(null, 'done');
//                  console.log('updateAdoc_result'+result);
                }
            });
        }

    });

};

/**
 * for scheduleMgr
 */
censorMgr.getUGCListLite = function(intervalOfSelectingUGC, filter, cb){
    
    var condition;
    var sort; 
    
    if (filter == "not_being_submitted_to_dooh or live_content_failed_in_last_play")  {     
        condition = {  $or: [ {'createdOn' : {$gte: intervalOfSelectingUGC.start, $lt: intervalOfSelectingUGC.end}, $or: [{'doohSubmitTimes': 0}, {'doohSubmitTimes':{ $exists: false }}], 'rating': {$gte: 'A' , $lte: 'E' }}, {'mustPlay':true}, {'failedToGenliveContentInLastPlay':true}] };
        sort = {'mustPlay':-1, 'failedToGenliveContentInLastPlay':-1, 'doohPlayedTimes':1,'rating':1,'createdOn':1};
    }
    else { // filter == "not_being_submitted_to_dooh" 
        condition = {  $or: [ {'createdOn' : {$gte: intervalOfSelectingUGC.start, $lt: intervalOfSelectingUGC.end}, $or: [{'doohSubmitTimes': 0}, {'doohSubmitTimes':{ $exists: false }}], 'rating': {$gte: 'A' , $lte: 'E' }}, {'mustPlay':true}] };
        //condition = {  $or: [ {'createdOn' : {$gte: intervalOfSelectingUGC.start, $lt: intervalOfSelectingUGC.end}}, {'mustPlay':true}], 'rating': {$gte: 'A' , $lte: 'E' } };
        sort = {'mustPlay':-1,'doohPlayedTimes':1,'rating':1,'createdOn':1};
    }

    //console.log("condition=");
    //console.dir(condition);

    
    FMDB.listOfdocModels( UGCs, condition,'_id genre contentGenre projectId fileExtension no ownerId url mustPlay', {sort: sort}, function(err, result){
        if(err) {
            logger.error('[censorMgr.getUGCListLite]', err);
            cb(err, null);
        }
        if(result){
            cb(err, result);
        }
    });

};


//DEPRECATED, replayced by censorMgr.getFullPlayList()
censorMgr.getPlayList = function(programList, updateUGC, cb){

    var limit = 0;
    var next = 0;
    var playList = [];

    var playListInfo = function(no, userRawContent, title, doohPlayedTimes, rating, contentGenre, mustPlay, timeslot, timeStamp, dooh, programTimeSlotId, projectId, ownerId, url, arr) {
        arr.push({
            no: no,
            userRawContent: userRawContent,
            title: title,
            doohPlayedTimes:doohPlayedTimes, 
            rating: rating,
            contentGenre: contentGenre,
            mustPlay: mustPlay,
            timeslot: timeslot,
            timeStamp: timeStamp,
            dooh: dooh,
            programTimeSlotId: programTimeSlotId,
            projectId: projectId,
            ownerId:ownerId,
            url:url
        });
    };    

    var mappingPlayList = function(data, updateUGC, set_cb){

        limit = data.length;
        if(updateUGC){
            if(data[next].content._id == updateUGC.oldUGCId)
                data[next].content._id = updateUGC.newUGCId;
        }

        FMDB.listOfdocModels( UGCs, {_id: data[next].content._id},'fb.userID _id title description createdOn rating doohPlayedTimes projectId ownerId no contentGenre mustPlay userRawContent url', null, function(err, result){
            if(err) {
                logger.error('[censorMgr_db.listOfUGCs]', err);
            }
            if(result !== null){
                if(next == limit - 1) {
                    playListInfo(result[0].no, result[0].userRawContent, result[0].title, result[0].doohPlayedTimes, result[0].rating, result[0].contentGenre, result[0].mustPlay, data[next].timeslot, data[next].timeStamp, data[next].dooh, data[next]._id, result[0].projectId, result[0].ownerId, result[0].url, playList);
                    set_cb(null, 'ok'); 
                    next = 0;
                    // console.log(playList);
                    playList = [];
                }
                else{
                    playListInfo(result[0].no, result[0].userRawContent, result[0].title, result[0].doohPlayedTimes, result[0].rating, result[0].contentGenre, result[0].mustPlay, data[next].timeslot, data[next].timeStamp, data[next].dooh, data[next]._id,result[0].projectId, result[0].ownerId, result[0].url, playList);
                    next += 1;
                    mappingPlayList(data, updateUGC, set_cb);
                }
            }
        });
    };

    if(programList.length > 0){
        mappingPlayList(programList, updateUGC, function(err,docs){
            if (cb){
                mappingUGCList(playList, 'UGC', function(err,docs){
                    if (cb){
                        cb(err, UGCList);
                    }
                });

            }
        });
    }
    else cb(err, null);

};


censorMgr.getFullPlayList = function(programList, updateUGC, cbOfGetFullPlayList){
    
    var playList = [];
    var db = require('./db.js');
    var ugcModel = db.getDocModel("ugc");
    
    var indexList = [];
    for (var i=0; i<programList.length; i++) {
        //console.dir(programList[i]);
        indexList.push(i);
    }
    //console.dir(indexList);
    
    var iteratorQueryUgcInfo = function(anIndex, callback){
        
        if(updateUGC){
            if(programList[anIndex].content._id == updateUGC.oldUGCId) {
                programList[anIndex].content._id = updateUGC.newUGCId;
            }
                
            
        }

        
        var ugcModel = db.getDocModel("ugc");
        ugcModel.findOne({_id: programList[anIndex].content._id}, function(errOfFineOne, _ugc){
            if (!errOfFineOne){
                var ugc = JSON.parse(JSON.stringify( _ugc )); //clone candidateUgc object to prevent from strange error "RangeError: Maximum call stack size exceeded";
                
                //timeslot
                var timeslotStart, timeslotEnd, predictedPlayTime, ugcSequenceNo;
                if(programList[anIndex].timeslot){
                    var timeslotDateStart = new Date(programList[anIndex].timeslot.start).toString().substring(0,25);
                    var timeslotDateEnd = new Date(programList[anIndex].timeslot.end).toString().substring(0,25);
                    
                    var yyyy, mm, dd, time;
                    //timeslotStart date format
                    yyyy = timeslotDateStart.substring(11,15);
                    mm = new Date(programList[anIndex].timeslot.start).getMonth()+1;
                    dd = timeslotDateStart.substring(8,10);
                    time = timeslotDateStart.substring(16,25);
                    timeslotStart = yyyy+'/'+mm+'/'+dd+' '+time;
                    
                    //timeslotEnd date format
                    yyyy = timeslotDateEnd.substring(11,15);
                    mm = new Date(programList[anIndex].timeslot.end).getMonth()+1;
                    dd = timeslotDateEnd.substring(8,10);
                    time = timeslotDateEnd.substring(16,25);
                    timeslotEnd = yyyy+'/'+mm+'/'+dd+' '+time;
                    
                    //predictedPlayTime date format
                    if (programList[anIndex].timeslot.predictedPlayTime) {
                        var timeslotPredictedPlayTime = (new Date(programList[anIndex].timeslot.predictedPlayTime)).toString().substring(0,25);
                        yyyy = timeslotPredictedPlayTime.substring(11,15);
                        mm = new Date(programList[anIndex].timeslot.end).getMonth()+1;
                        dd = timeslotPredictedPlayTime.substring(8,10);
                        time = timeslotPredictedPlayTime.substring(16,25);
                        predictedPlayTime = yyyy+'/'+mm+'/'+dd+' '+time;
                    }
                    else {
                        predictedPlayTime = null;
                    }

                    ugcSequenceNo = programList[anIndex].timeslot.ugcSequenceNo;
                }
                //userRawContent
                var description = null;
                var userPhotoUrl = null;
                if(ugc.userRawContent){
                    for(var i=0 ; i <ugc.userRawContent.length ; i++){
                        if(ugc.userRawContent[i].type == 'text')
                            description = ugc.userRawContent[i].content;
                        if(ugc.userRawContent[i].type == 'image')
                            userPhotoUrl = ugc.userRawContent[i].content;
                    }
                }
                
                async.parallel([
                    function(callback){
                        member_mgr.getUserNameAndID(ugc.ownerId._id, function(err, result){
                            if(err) callback(err, null);
                            else if(result === null) callback(null, 'No User');
                            else callback(null, result.fb.userName);
                        });
    
                    },
                ],
                function(errOfParallel, results){
                    
                    var playListItem = {
                        userPhotoUrl: userPhotoUrl,
                        ugcCensorNo: ugc.no,
                        fb_userName: results[0],
                        fbPictureUrl: ugc.fbProfilePicture,
                        rating: ugc.rating,
                        contentGenre: ugc.contentGenre,
                        mustPlay: ugc.mustPlay,
                        failedToGenliveContentInLastPlay: ugc.failedToGenliveContentInLastPlay,
                        isLoopedAround: programList[anIndex].isLoopedAround,
                        timeslotStart: timeslotStart,
                        timeslotEnd: timeslotEnd,
                        predictedPlayTime: predictedPlayTime,
                        ugcSequenceNo: ugcSequenceNo,
                        programTimeSlotId: programList[anIndex]._id,
                        url: ugc.url,
                        createdOn: ugc.createdOn,
                        contentClass: ugc.contentClass
                    };

                    playList.push(playListItem);
                    callback(null);
                });

                
            }
            else {
                callback("Failed to query the corresponding UGC: "+errOfFineOne);
            }
        });

    };
    
    async.eachSeries(indexList, iteratorQueryUgcInfo, function(err){
        
        if (cbOfGetFullPlayList) {
            cbOfGetFullPlayList(err, playList);
        }

    });

    
    
    
};


censorMgr.getLiveContentList = function(condition, sort, pageLimit, pageSkip, cb){

    if (pageLimit) {
        FMDB.listOfdocModels( programTimeSlotModel, condition, null, {sort :sort ,limit: pageLimit ,skip: pageSkip}, function(err, result){
            if(err) {
                logger.error('[censorMgr.getLiveContentList.listOfdocModels] err=', err);
                cb(err, null);
            }
            if(result){
                // console.log(result);
                if(pageSkip < result.length && pageLimit < result.length)
                    limit = pageLimit;
                else 
                    limit = result.length;
                if(limit > 0){
                async.eachSeries(result, mappingLiveContentList, function(err0){
                    if (!err0) {
                        cb(err, liveContentList);
                    }
                    else{
                        logger.error('[censorMgr.getLiveContentList.mappingLiveContentList] err=',err0);
                    }
                });
                }else
                    cb(err, liveContentList);
            }
        });
    }
        var liveContentList = [];

        var LiveContentListInfo = function(ugcCensorNo, liveContent, start, end, liveState, playState, fbUserId, programTimeSlot_id, ownerId_id, canBeFoundInPlayerLog, s3Img, miixSource, contentClass, arr) {
            arr.push({
                ugcCensorNo: ugcCensorNo,
                liveContent: liveContent,
                start: start,
                end: end,
                liveState: liveState,
                playState: playState,
                fbUserId: fbUserId,
                programTimeSlot_id: programTimeSlot_id,
                ownerId_id: ownerId_id,
                canBeFoundInPlayerLog: canBeFoundInPlayerLog,
                s3Img: s3Img,
                miixSource: miixSource,
                contentClass: contentClass
            });
        };  
        var mappingLiveContentList = function(data, cbOfMappingLiveContentList){
            userLiveContentModel.find({'liveTime': {$gte: data.timeslot.start, $lt: data.timeslot.end}, "sourceId": data.content.projectId}).exec(function(err, result){
                if(!err){
					logger.info('[censor_mgr-mappingLiveContentList] no= '+ data.content.no);
                    UGCs.find({"no": data.content.no}).exec(function(err_2, result_2){
                        if(!err_2) {
							if(!result_2){
								cbOfMappingLiveContentList(null); 
							}else if(!result_2[0]){
								cbOfMappingLiveContentList(null); 
							}else if(!result_2[0].userRawContent[0]){
                                var warn = "typeof result_2[0].userRawContent[0] === 'undefined'";
                                LiveContentListInfo(data.content.no, result, data.timeslot.start, data.timeslot.end, data.liveState, data.playState, data.content.ownerId.fbUserId, data._id, data.content.ownerId._id, data.canBeFoundInPlayerLog, result_2[0].url.s3, warn, result_2[0].contentClass, liveContentList);
                                cbOfMappingLiveContentList(null); 
                            }else{
                                LiveContentListInfo(data.content.no, result, data.timeslot.start, data.timeslot.end, data.liveState, data.playState, data.content.ownerId.fbUserId, data._id, data.content.ownerId._id, data.canBeFoundInPlayerLog, result_2[0].url.s3, result_2[0].userRawContent[0].content, result_2[0].contentClass, liveContentList);
                                cbOfMappingLiveContentList(null); 
                            }
                             
                        }else {
                            cbOfMappingLiveContentList(err_2);
                        }
                    });
                }else{
                    cbOfMappingLiveContentList(err); 
                }
            });
        };
};//getLiveContentList end

censorMgr.updateLiveContents = function(liveContent_Id, vjson, cb){
    
    FMDB.updateAdoc(userLiveContentModel, liveContent_Id, vjson, function(err, result){
        if(err) {
            logger.error('[updateLiveContents_updateAdoc]', err);
            cb(err,null);
        }
        if(result){
            cb(null, 'done');
            logger.info('[updateLiveContents_updateAdoc] successful', liveContent_Id);
          //console.log('updateAdoc_result'+result);
        }
    });
};

censorMgr.postMessageAndPicture = function(memberId, photoUrl, type, liveTime, ugcCensorNo, liveContent_Id, postPicture_cb){
    
    var access_token;
    var fb_name, playTime, start, link;
    var sourceId;
    var liveContentGenre;
    var owner_id = null;
    var liveContentUrl = null;
    
    //
    async.waterfall([
       function(callback){
           
           if(type == 'correct'){
               userLiveContentModel.find({'_id': liveContent_Id}).exec(function (err, userLiveContentObj) {
                   if (!err)
                       callback(null, userLiveContentObj);
                   else
                       callback("Fail to retrieve userLiveContent Obj from DB: "+err, userLiveContentObj);
               });
           }else{
               callback(null, null);
           }
       },
       function(userLiveContentObj, callback){
           
           if(type == 'correct'){
               if(userLiveContentObj[0]){
                   sourceId = userLiveContentObj[0].sourceId;
                   liveContentGenre = userLiveContentObj[0].genre;
                   owner_id = userLiveContentObj[0].ownerId._id;
                   liveContentUrl = userLiveContentObj[0].url;
               }
               memberModel.find({'_id': userLiveContentObj[0].ownerId._id}).exec(function (err, memberSearch) {
                   if (!err)
                       callback(null, memberSearch);
                   else
                       callback("Fail to retrieve member Obj from DB: "+err, memberSearch);
               });
           }else{
               memberModel.find({'_id': memberId}).exec(function (err, memberSearch) {
                   if (!err)
                       callback(null, memberSearch);
                   else
                       callback("Fail to retrieve member Obj from DB: "+err, memberSearch);
               });
           }
       },
    ], function(err, res){
        
        var member = res[0];
        if (member) {
            access_token = member.fb.auth.accessToken;
            fb_name = member.fb.userName;
            start = new Date(parseInt(liveTime));
            
            var showTime = function( time ){
                var show;
                if(time < 10)
                    show = '0' + time;
                else
                    show = time;
                
                return show;
            };
            
            if(start.getHours()>12)
                playTime = start.getFullYear()+'年'+showTime(start.getMonth()+1)+'月'+showTime(start.getDate())+'日下午'+showTime(start.getHours()-12)+':'+showTime(start.getMinutes());
            else
                playTime = start.getFullYear()+'年'+showTime(start.getMonth()+1)+'月'+showTime(start.getDate())+'日上午'+showTime(start.getHours())+':'+showTime(start.getMinutes());
                
            var textContent = fb_name + ' 於' + playTime + '，登上台北小巨蛋天幕！';

            // if(type == 'correct') {
                // message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝您精采的作品！\n' + 
                          // '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
            // }
            // else {
                // message = '很遺憾的，您的試鏡編號'+ ugcCensorNo +'的作品，因故被取消登上大螢幕。\n'+
                          // '查明若非不當內容，導播將儘快通知您新的播出時間。造成不便請見諒。\n';
            // }
            
            var message = null;
            
            switch(member.app.toLowerCase())
            {
                case 'ondascreen':
                    if(type == 'correct') {
                        message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝您精采的作品！\n' + 
                                  '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                    }
                    else if (type == 'source_not_played') {
                        message = '很遺憾的，您的試鏡編號' + ugcCensorNo + '作品，因故被取消登上小巨蛋。' + 
                        '查明若非不當內容，將儘快通知您新的播出時間。造成不便請見諒。';
                    }
                    else if ( (type != 'other_fail') && (type != 'not_checked') ) {
                        // message = '很遺憾的，您的試鏡編號'+ ugcCensorNo +'的作品，因故被取消登上大螢幕。\n'+
                                  // '查明若非不當內容，導播將儘快通知您新的播出時間。造成不便請見諒。\n';
                        message = '您的試鏡編號' + ugcCensorNo + '作品已順利播出，但很遺憾的，實拍照片未能順利拍攝。' + 
                                  '我們將儘快安排再次播出，希望能為您留下精彩的影像。';
                    }
                    break;
                case 'wowtaipeiarena':
                    if(type == 'correct') {
                        message = '你的No.' + ugcCensorNo + '作品，在' + playTime + 
                                  '，登上小巨蛋天幕，感謝你的精采作品，快到 我的投稿/哇!紀錄 裡瞧瞧實拍照!';
                    }
                    else if (type == 'source_not_played') {
                        message = '很遺憾的，您的No.' + ugcCensorNo + '作品，因故被取消登上小巨蛋。' + 
                        '查明若非不當內容，將儘快通知您新的播出時間。造成不便請見諒。';
                    }
                    else if ( (type != 'other_fail') && (type != 'not_checked') ) {
                        // message = '很遺憾的，您的試鏡編號'+ ugcCensorNo +'的作品，因故被取消登上大螢幕。\n'+
                                  // '查明若非不當內容，導播將儘快通知您新的播出時間。造成不便請見諒。\n';
                        message = '您的No.' + ugcCensorNo + '作品已順利播出，但很遺憾的，實拍照片未能順利拍攝。' + 
                                  '我們將儘快安排再次播出，希望能為您留下精彩的影像。';
                    }
                    break;
                case 'waterlandsecuries':
                    if(type == 'correct') {
                        message = '你的No.' + ugcCensorNo + '作品，在' + playTime + 
                                  '，登上小巨蛋天幕，感謝你的精采作品，快到 我的投稿/哇!紀錄 裡瞧瞧實拍照!';
                    }
                    else if (type == 'source_not_played') {
                        message = '很遺憾的，您的No.' + ugcCensorNo + '作品，因故被取消登上小巨蛋。' + 
                        '查明若非不當內容，將儘快通知您新的播出時間。造成不便請見諒。';
                    }
                    else if ( (type != 'other_fail') && (type != 'not_checked') ) {
                        // message = '很遺憾的，您的試鏡編號'+ ugcCensorNo +'的作品，因故被取消登上大螢幕。\n'+
                                  // '查明若非不當內容，導播將儘快通知您新的播出時間。造成不便請見諒。\n';
                        message = '您的No.' + ugcCensorNo + '作品已順利播出，但很遺憾的，實拍照片未能順利拍攝。' + 
                                  '我們將儘快安排再次播出，希望能為您留下精彩的影像。';
                    }
                    break;
                default:
                    break;
            } 
            
            async.waterfall([
                function(push_cb){
                    if (message) {
                        pushMgr.sendMessageToDeviceByMemberId(member._id, message, function(err, res){
                            logger.info('push played notification to user, member id is ' + member._id);
                            push_cb(err, res);
                        });
                    }
                }
            ], function(err, res){
                if(type == 'correct'){
                    if ( liveContentGenre == "miix_image_live_photo" ) {
                        var option = {
                                accessToken: access_token,
                                type: member.app,
                                source: photoUrl.play,
                                photo: photoUrl.preview,
                                text: textContent,
                                ugcProjectId: sourceId
                            };
                            canvasProcessMgr.markTextAndIcon(option, postPicture_cb);
                    } 
                    else if ( liveContentGenre == "miix_story" ) {
                        //post the link on FB
                    	member_mgr.getFBAccessTokenById(owner_id, function(errOfGetFBAccessTokenById, result){
                            //debugger;
                            if (!errOfGetFBAccessTokenById){
                                //var userID = result.fb.userID;
                                //var userName = result.fb.userName;
                                var can_msg =  fb_name+"的素人拉洋片出現在小巨蛋! 快點瞧瞧吧!\n上大螢幕，讓您免費登上小巨蛋天幕!";
                                var accessToken = result.fb.auth.accessToken;
                                fbMgr.postMessage(accessToken, can_msg, liveContentUrl.youtube, function(errOfPostMessage, result){
                                    //console.log("result=%s", result);
                                    if (!errOfPostMessage) {
                                        postPicture_cb(null, 'done');
                                    }
                                    else {
                                        postPicture_cb("Failed to post FB: "+errOfPostMessage);
                                    }
                                });
                            }
                            else {
                                postPicture_cb("Failed to get FB access token from member DB: "+errOfGetFBAccessTokenById);
                            }
                             
                         });

                        
                    }
                }
                else {
                    postPicture_cb(null, 'done');
                    //postPicture_cb(err, res);
                }
            });

        }
        else {
            postPicture_cb("Failed to query the member data", null);
        }
        
    });
};


censorMgr.updateProgramTimeSlots = function(programTimeSlot_Id, vjson, cb){
    
    FMDB.updateAdoc(programTimeSlotModel, programTimeSlot_Id, vjson, function(err, result){
        if(err) {
            logger.error('[updateProgramTimeSlots_updateAdoc] error', err);
            cb(err,null);
        }
        if(result){
            cb(null, 'done');
            logger.info('[updateProgramTimeSlots_updateAdoc] successful', programTimeSlot_Id);
//          console.log('updateAdoc_result'+result);
        }
    });
};

censorMgr.getProgramTimeSlotList = function(condition, sort, pageLimit, pageSkip, cb){
    var limit;

    if ( pageLimit ) {
        FMDB.listOfdocModels(programTimeSlotModel, condition ,null, {sort :sort ,limit: pageLimit ,skip: pageSkip}, function(err, programTimeSlotList){
            if(!err) {
                if(programTimeSlotList){
                    if(pageSkip < programTimeSlotList.length && pageLimit < programTimeSlotList.length)
                        limit = pageLimit;
                    else 
                        limit = programTimeSlotList.length;
    
                    if(limit > 0){ 
                        cb(null, programTimeSlotList);
                    }else
                        cb(err, null);
                }else
                    cb(err, null);
            }
            else {
                logger.error('[censorMgr_db.listOfUGCs]', err);
                cb(err, null);
            }
        });

    }else
        cb(null, null);
};

censorMgr.checkProgramTimeSlotList = function(condition, cb){
    
    var iteratorCheckProgramTimeSlot = function(data, cbOfIteratorCheckProgramTimeSlot){
//        console.log(data.timeslot.start + ',' +condition.intervalOfPlanningDoohProgramesStart+ ','+ data.timeslot.end);
//        console.log(data.timeslot.start + ',' +condition.intervalOfPlanningDoohProgramesEnd+ ','+ data.timeslot.end);
        //播放時間在其他排程節目內
        if( (data.timeslot.start < condition.intervalOfPlanningDoohProgramesStart) &&
                (condition.intervalOfPlanningDoohProgramesStart < data.timeslot.end) ){
            cbOfIteratorCheckProgramTimeSlot("not ok");
        }else if( (data.timeslot.start < condition.intervalOfPlanningDoohProgramesEnd) &&
               (condition.intervalOfPlanningDoohProgramesEnd < data.timeslot.end) ){
            cbOfIteratorCheckProgramTimeSlot("not ok");
        //播放時間內有已排程節目
        }else if( (condition.intervalOfPlanningDoohProgramesStart < data.timeslot.end) &&
                (data.timeslot.start < condition.intervalOfPlanningDoohProgramesEnd) ){
             cbOfIteratorCheckProgramTimeSlot("not ok");
        }else if( (condition.intervalOfPlanningDoohProgramesStart < data.timeslot.end) &&
                (data.timeslot.start < condition.intervalOfPlanningDoohProgramesEnd) ){
             cbOfIteratorCheckProgramTimeSlot("not ok");
        //正確沒有重複排程
        }else
            cbOfIteratorCheckProgramTimeSlot(null);  
    };
    
    async.waterfall([
                     function(cb1){
//                         var checkTime = new Date().getTime();
                         var checkTime = condition.intervalOfPlanningDoohProgramesStart - 3*60*60*1000;
                         logger.info('[censorMgr.checkProgramTimeSlotList] checkTime = '+checkTime);
                         FMDB.listOfdocModels(programTimeSlotModel, {"timeslot.start": {$gte:checkTime}, state: 'confirmed'} ,null, null, function(err, programTimeSlotList){
                             if(!err) {
                                 logger.info('[censorMgr.checkProgramTimeSlotList] programTimeSlotList = '+programTimeSlotList);
                                 cb1(null, programTimeSlotList);
                             }
                             else {
                                 logger.error('[censorMgr.checkProgramTimeSlotList.listOfdocModels]', err);
                                 cb1(err, null);
                             }
                         });
                     },
                     function(programTimeSlotList, cb2){
//                         console.log(programTimeSlotList);
                         if(!programTimeSlotList){
                             cb2(null, "ok");
                             
                         }else if(!programTimeSlotList[0]){
                             cb2(null, "ok");
                         }else{
                             async.eachSeries(programTimeSlotList, iteratorCheckProgramTimeSlot, function(errEachSeries, resEachSeries){
                                 cb2(errEachSeries, resEachSeries);
                             });
                         }
                         
                         
                     }
                         
                 ], function(err, res){
                        if(!err)
                            cb(null, "ok");
                        else
                            cb(err, null);
                 });
    
};

/**
 *  Render story MV.
 * 
 */
censorMgr.renderLiveVideoMV = function( live_video_project_id, record_time ){
    storyContentMgr.generateStoryMV( live_video_project_id, record_time );
};


censorMgr.getItemOfSlotByNo = function(ugcNo, limit, skip, cb_getItemOfSlotByNo){
    noInt = parseInt(ugcNo);
   
    UGCs.find({"no":noInt}).exec(function(ugc_err, ugc_result){
        if(!ugc_err){
            
            memberModel.find({"fb.userID": ugc_result[0].ownerId.userID}).exec(function(member_err, member_result){
               if(!member_err){
                   ugc_result.push({fbName: member_result[0].fb.userName});
                   cb_getItemOfSlotByNo(null,ugc_result);
               }else{
                   cb_getItemOfSlotByNo(member_err,member_result);
               }
              
            });
            
//            cb_getItemOfSlotByNo(null,result);
        }else{
            cb_getItemOfSlotByNo(ugc_err,ugc_result);
        }
    });
    
};


module.exports = censorMgr;


//test
//var condition;
//var sort;
//var limit=10;
//var skip=0;
////default
//condition = {
//        "type": "UGC",
//        "timeslot.start": {$gte: 1379952000000, $lt: 1380124800000},
//        "state": "confirmed"
//};
//sort = {
//        "content.no":-1,
//        "timeslot.start":-1
//};
//
//censorMgr.getLiveContentList(condition, sort, limit, skip, function(err, LiveContentList){
//    console.log('--'+err, LiveContentList);
//    if (!err){
//        
////        res.render( 'table_censorHighlight', {ugcCensorMovieList: UGCList} );
//    }
//    else{
////        res.send(400, {error: err});
//    }
//});
//var vjson = {state :"correct"}
//censorMgr.updateLiveContents("5240b669ffb7f85c03000016", vjson, function(err, result){
//console.log('--'+err, result);
//});
//var photoUrl ={preview:"https://s3.amazonaws.com/miix_content/user_project/cultural_and_creative-5226ff08ff6e3af835000009-20130918T090124154Z/cultural_and_creative-5226ff08ff6e3af835000009-20130918T090124154Z.png",
//        play:"https://s3.amazonaws.com/miix_content/user_project/cultural_and_creative-5226ff08ff6e3af835000009-1379972400000-005/cultural_and_creative-5226ff08ff6e3af835000009-1379972400000-005.jpg"
//        }
//censorMgr.postMessageAndPicture("100006588456341", photoUrl, "not_checked", 1379972574135, function(err, result){
//console.log('--'+err, result);
//});

//var condition={"timeslot.start":{$gte:1385110800000,$lte:1385112600000}};
//var sort;
//var limit=1;
//var skip=0;
//censorMgr.getProgramTimeSlotList(condition, sort, limit, skip, function(err, programTimeSlotList){
//    if(programTimeSlotList){
//        console.log('--'+err, programTimeSlotList.length);
//    }
//});
