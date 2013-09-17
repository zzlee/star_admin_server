
var censorMgr = {};

var async = require('async');
var fb_handler = require('./facebook_mgr.js');
var FMDB = require('./db.js');
var UGC_mgr = require('./UGC.js');
var sheculeMgr = require('./schedule_mgr.js');
var member_mgr = require('./member.js');

var UGCs = FMDB.getDocModel("ugc");

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
censorMgr.getUGCList = function(condition, sort, pageLimit, pageSkip, cb){
    var start;
    var end;

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
        FMDB.listOfdocModels( UGCs,condition,'fb.userID _id title description createdOn rating doohPlayedTimes projectId ownerId no contentGenre mustPlay userRawContent highlight', {sort :sort ,limit: pageLimit ,skip: pageSkip}, function(err, result){
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
                    mappingUGCList(result, function(err,docs){
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

var UGCListInfo = function(userPhotoUrl, ugcCensorNo, userContent, fb_userName, fbPictureUrl, title, description, doohPlayedTimes, rating, contentGenre, mustPlay, timeslotStart, timeslotEnd, timeStamp, programTimeSlotId, highlight, arr) {
    arr.push({
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
        highlight: highlight
    });
};
var mappingUGCList = function(data, set_cb){
    limit = data.length;

    var toDo = function(err, result){
        var userPhotoUrl = 'No Photo';
        var description = null;

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
        //TODO  getUserUploadedImageUrls 
        if(result[2]){
            userPhotoUrl = result[2];
        }

        if(data[next].userRawContent){

            for(var i=0 ; i <data[next].userRawContent.length ; i++){
                if(data[next].userRawContent[i].type == 'text')
                    description = data[next].userRawContent[i].content;
                if(data[next].userRawContent[i].type == 'image')
                    userPhotoUrl = data[next].userRawContent[i].content;
            }
        }
        

        if(next == limit - 1) {
            UGCListInfo(userPhotoUrl, data[next].no, description, result[1], result[0], data[next].title, data[next].description, data[next].doohPlayedTimes, data[next].rating, data[next].contentGenre, data[next].mustPlay, timeslotStart, timeslotEnd, data[next].timeStamp, data[next].programTimeSlotId, data[next].highlight, UGCList);
            set_cb(null, 'ok'); 
            next = 0;
            UGCList = [];
        }
        else{
            UGCListInfo(userPhotoUrl, data[next].no, description, result[1], result[0], data[next].title, data[next].description, data[next].doohPlayedTimes, data[next].rating, data[next].contentGenre, data[next].mustPlay, timeslotStart, timeslotEnd, data[next].timeStamp, data[next].programTimeSlotId, data[next].highlight, UGCList);
            next += 1;
            mappingUGCList(data, set_cb);
        }

    };//toDo End ******

    //async
    if(data[next] !== null){
        async.parallel([
                        function(callback){
                            getUserContent(data[next].ownerId.userID,function(err, result){
                                if(err){
                                    logger.error('[mappingUserProfilePicture_getUserContent]', err);
                                    callback(err, null);
                                }
                                if(result){
                                    callback(null, result);
                                }
                            });

                        },
                        function(callback){
                            member_mgr.getUserNameAndID(data[next].ownerId._id, function(err, result){
                                if(err) callback(err, null);
                                else if(result === null) callback(null, 'No User');
                                else callback(null, result.fb.userName);
                            });

                        }
                        ], toDo);
    }

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

var getUserContent = function(fb_id,get_cb){

    fb_handler.getUserProfilePicture(fb_id,function(err, result){
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

    if(vjson.mustPlay == 'true')
        vjson = {mustPlay : true};
    else if(vjson.mustPlay == 'false')
        vjson = {mustPlay : false};
    if(vjson.highlight == 'true')
        vjson = {highlight : true};
    else if(vjson.highlight == 'false')
        vjson = {highlight : false};


    UGC_mgr.getOwnerIdByNo(no, function(err, result){
        if(err) logger.error('[setUGCAttribute_getOwnerIdByNo]', err);

        if(result){
            FMDB.updateAdoc(UGCs,result,vjson, function(err, result){
                if(err) {
                    logger.error('[setUGCAttribute_updateAdoc]', err);
                    cb(err,null);
                }
                if(result){
                    cb(null,'success');
//                  console.log('updateAdoc_result'+result);
                }
            });
        }

    });

};

/**
 * for scheduleMgr
 */
censorMgr.getUGCListLite = function(condition, cb){

    FMDB.listOfdocModels( UGCs,{'createdOn' : {$gte: condition.start, $lt: condition.end}},'_id genre contentGenre projectId fileExtension no ownerId mustPlay', {sort :{'mustPlay':-1,'doohPlayedTimes':1,'rating':1,'createdOn':1}}, function(err, result){
        if(err) {
            logger.error('[censorMgr.getUGCListLite]', err);
            cb(err, null);
        }
        if(result){
            cb(err, result);
        }
    });

};



censorMgr.getPlayList = function(programList, updateUGC, cb){

    var limit = 0;
    var next = 0;
    var playList = [];

    var playListInfo = function(no, userRawContent, title, doohPlayedTimes, rating, contentGenre, mustPlay, timeslot, timeStamp, dooh, programTimeSlotId, projectId, ownerId, arr) {
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
            ownerId:ownerId
        });
    };    

    var mappingPlayList = function(data, updateUGC, set_cb){

        limit = data.length;
        if(updateUGC){
            if(data[next].content._id == updateUGC.oldUGCId)
                data[next].content._id = updateUGC.newUGCId;
        }

        FMDB.listOfdocModels( UGCs, {_id: data[next].content._id},'fb.userID _id title description createdOn rating doohPlayedTimes projectId ownerId no contentGenre mustPlay userRawContent', null, function(err, result){
            if(err) {
                logger.error('[censorMgr_db.listOfUGCs]', err);
            }
            if(result !== null){
                if(next == limit - 1) {
                    playListInfo(result[0].no, result[0].userRawContent, result[0].title, result[0].doohPlayedTimes, result[0].rating, result[0].contentGenre, result[0].mustPlay, data[next].timeslot, data[next].timeStamp, data[next].dooh, data[next]._id, result[0].projectId, result[0].ownerId, playList);
                    set_cb(null, 'ok'); 
                    next = 0;
                    playList = [];
                }
                else{
                    playListInfo(result[0].no, result[0].userRawContent, result[0].title, result[0].doohPlayedTimes, result[0].rating, result[0].contentGenre, result[0].mustPlay, data[next].timeslot, data[next].timeStamp, data[next].dooh, data[next]._id, result[0].projectId, result[0].ownerId, playList);
                    next += 1;
                    mappingPlayList(data, updateUGC, set_cb);
                }
            }
        });
    };

    if(programList.length > 0){
        mappingPlayList(programList, updateUGC, function(err,docs){
            if (cb){
                mappingUGCList(playList, function(err,docs){
                    if (cb){
                        cb(err, UGCList);
                    }
                });

            }
        });
    }
    else cb(err, null);

};


module.exports = censorMgr;