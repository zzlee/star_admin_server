
var censorMgr = {};

var async = require('async');
var fb_handler = require('./facebook_mgr.js');
var FMDB = require('./db.js');
var UGC_mgr = require('./UGC.js');
var sheculeMgr = require('./schedule_mgr.js');
var member_mgr = require('./member.js');
var pushMgr = require('./push_mgr.js');

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
        FMDB.listOfdocModels( UGCs,condition,'fb.userID _id title description createdOn rating doohPlayedTimes projectId ownerId no contentGenre mustPlay userRawContent highlight url', {sort :sort ,limit: pageLimit ,skip: pageSkip}, function(err, result){
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

var UGCListInfo = function(userPhotoUrl, ugcCensorNo, userContent, fb_userName, fbPictureUrl, title, description, doohPlayedTimes, rating, contentGenre, mustPlay, timeslotStart, timeslotEnd, timeStamp, programTimeSlotId, highlight, url,arr) {
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
        highlight: highlight,
        url:url
       
    });
};
var mappingUGCList = function(data, set_cb){
    limit = data.length;

    var toDo = function(err, result){
        if(!data[next]) return;
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
            UGCListInfo(userPhotoUrl, data[next].no, description, result[0], null, data[next].title, data[next].description, data[next].doohPlayedTimes, data[next].rating, data[next].contentGenre, data[next].mustPlay, timeslotStart, timeslotEnd, data[next].timeStamp, data[next].programTimeSlotId, data[next].highlight,data[next].url, UGCList);
            set_cb(null, 'ok'); 
            next = 0;
            UGCList = [];
        }
        else{
            UGCListInfo(userPhotoUrl, data[next].no, description, result[0], null, data[next].title, data[next].description, data[next].doohPlayedTimes, data[next].rating, data[next].contentGenre, data[next].mustPlay, timeslotStart, timeslotEnd, data[next].timeStamp, data[next].programTimeSlotId, data[next].highlight, data[next].url,UGCList);
            next += 1;
            mappingUGCList(data, set_cb);
        }

    };//toDo End ******

    //async
    if(!data[next]){
        return;
    }
        async.parallel([
                        //deprecated
//                        function(callback){
//                            memberModel.find({'_id': data[next].ownerId._id}).exec(function(err, member){
//                                if(err){
//                                    logger.error('[mappingUserProfilePicture_getUserContent]', err);
//                                    callback(err, null);
//                                }
//                                if(member[0]){
//                                    console.log(member);
//                                    getUserContent(member[0].fb.userID, member[0].app, function(err, result){
//                                        if(err){
//                                            logger.error('[mappingUserProfilePicture_getUserContent]', err);
//                                            callback(err, null);
//                                        }
//                                        if(result){
//                                            callback(null, result);
//                                        }
//                                    });
//                                }else
//                                     callback(null, 'No User');
//                                
//                            });
//
//                        },
                        function(callback){
                            member_mgr.getUserNameAndID(data[next].ownerId._id, function(err, result){
                                if(err) callback(err, null);
                                else if(result === null) callback(null, 'No User');
                                else callback(null, result.fb.userName);
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

    FMDB.listOfdocModels( UGCs,{'createdOn' : {$gte: condition.start, $lt: condition.end}, 'rating': {$gte: 'A' , $lte: 'E' }},'_id genre contentGenre projectId fileExtension no ownerId mustPlay', {sort :{'mustPlay':-1,'doohPlayedTimes':1,'rating':1,'createdOn':1}}, function(err, result){
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

        var LiveContentListInfo = function(ugcCensorNo, liveContent, start, end, liveState, fbUserId, programTimeSlot_id, arr) {
            arr.push({
                ugcCensorNo: ugcCensorNo,
                liveContent: liveContent,
                start: start,
                end: end,
                liveState: liveState,
                fbUserId: fbUserId,
                programTimeSlot_id: programTimeSlot_id
            });
        };  
        var mappingLiveContentList = function(data, cbOfMappingLiveContentList){
            userLiveContentModel.find({'liveTime': {$gte: data.timeslot.start, $lt: data.timeslot.end}, "sourceId": data.content.projectId}).exec(function(err, result){
                if(!err){
                    LiveContentListInfo(data.content.no, result, data.timeslot.start, data.timeslot.end, data.liveState, data.content.ownerId.fbUserId, data._id, liveContentList);
                    cbOfMappingLiveContentList(null); 
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
            cb(null,'successful');
            logger.info('[updateLiveContents_updateAdoc] successful', liveContent_Id);
          //console.log('updateAdoc_result'+result);
        }
    });
};

censorMgr.postMessageAndPicture = function(fb_id, photoUrl, type, liveTime, ugcCensorNo, liveContent_Id, postPicture_cb){
    
    var access_token;
    var fb_name, playTime, start, link;
    
    var pushPhotosToUser = function(albumId, pushPhotos_cb){
        async.series([
            /*function(simulate){
                message = fb_name + '於' + playTime + '，登上台北天幕LED，上大螢幕APP特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.simulate, albumId, simulate);
                facebookMgr.postMessageAndShare(access_token, message, { link: photoUrl.simulate }, function(err, res){
                    (!err)?simulate(null, true):simulate(null, false);
                });
            },*/
            function(preview){
                var message = fb_name + '於' + playTime + '，登上台北天幕LED，這是原始刊登素材，天幕尺寸：100公尺x16公尺。\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.preview, albumId, preview);
                fb_handler.postMessageAndShare(access_token, message, { link: photoUrl.preview }, function(err, resOfPostMessageAndShare){
                    var fbObj = JSON.parse(resOfPostMessageAndShare);
                    if(!err){
                        putFbPostIdLiveContentsBy_id(liveContent_Id, fbObj.id, function(err, result){
                            if(!err){
                                logger.error("[censorMgr.postMessageAndPicture.putFbPostIdLiveContentsBy_id]res="+result+"liveContent_Id:"+liveContent_Id+"fbPostId"+resOfPostMessageAndShare.id);  
                              }else
                                logger.error("[censorMgr.postMessageAndPicture.putFbPostIdLiveContentsBy_id]err="+err);    
                        });
                        preview(null, true);
                    }else{
                        preview(null, false);
                    }
                });
            },
            function(play){
                var message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝他精采的作品！\n' + 
                          '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
                //facebookMgr.postPhoto(access_token, message, photoUrl.play, albumId, play);
                fb_handler.postMessageAndShare(access_token, message, { link: photoUrl.play }, function(err, resOfPostMessageAndShare){
                    var fbObj = JSON.parse(resOfPostMessageAndShare);
                    if(!err){
                        putFbPostIdLiveContentsBy_id(liveContent_Id, fbObj.id, function(err, result){
                            if(!err){
                                logger.error("[censorMgr.postMessageAndPicture.putFbPostIdLiveContentsBy_id]res="+result+"liveContent_Id:"+liveContent_Id+"fbPostId"+resOfPostMessageAndShare.id);  
                              }else
                                logger.error("[censorMgr.postMessageAndPicture.putFbPostIdLiveContentsBy_id]err="+err);    
                        });
                        play(null, true);
                    }else{
                        play(null, false);
                    }
                });
            }
        ], function(err, res){
            //(err)?console.log(err):console.dir(res);
            /* if(!err){
                logger.info('post message to user on facebook, fb id is ' + fb_id);
                pushPhotos_cb(null, 'done');
            }
            else
                pushPhotos_cb(err, null); */
            
            (err)?logger.info('post message to user on facebook is failed, fb id is ' + fb_id):'';
            (res[0])?logger.info('post preview message to user on facebook is success, fb id is ' + fb_id):logger.info('post preview message to user on facebook is failed, fb id is ' + fb_id);
            (res[1])?logger.info('post play message to user on facebook is success, fb id is ' + fb_id):logger.info('post play message to user on facebook is failed, fb id is ' + fb_id);
            pushPhotos_cb(null, 'done');
        });
    };
    //
    async.waterfall([
       function(callback){
           userLiveContentModel.find({'_id': liveContent_Id}).exec(function (err, userLiveContentObj) {
               if (!err)
                   callback(null, userLiveContentObj);
               else
                   callback("Fail to retrieve userLiveContent Obj from DB: "+err, userLiveContentObj);
           });
           
       },
       function(userLiveContentObj, callback){
           memberModel.find({'_id': userLiveContentObj[0].ownerId._id}).exec(function (err, memberSearch) {
               if (!err)
                   callback(null, memberSearch);
               else
                   callback("Fail to retrieve member Obj from DB: "+err, memberSearch);
           });
       },
    ], function(err, member){
        access_token = member[0].fb.auth.accessToken;
        fb_name = member[0].fb.userName;
        start = new Date(parseInt(liveTime));
        if(start.getHours()>12)
            playTime = start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日下午'+(start.getHours()-12)+':'+start.getMinutes();
        else
            playTime = start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日上午'+start.getHours()+':'+start.getMinutes();
        
        var album_name = '實況記錄：' + start.getFullYear()+'年'+(start.getMonth()+1)+'月'+start.getDate()+'日' + '登上台北天幕LED';
        var album_message = '';
        if(type == 'correct'){
         message = fb_name + '於' + playTime + '，登上台北天幕LED，特此感謝您精采的作品！\n' + 
                      '上大螢幕APP 粉絲團: https://www.facebook.com/OnDaScreen';
        }else{
             message = '很遺憾的，您的試鏡編號'+ ugcCensorNo +'的作品，因故被取消登上大螢幕。\n'+
                '查明若非不當內容，導播將儘快通知您新的播出時間。造成不便請見諒。\n';
        }
        async.waterfall([
            function(push_cb){
                pushMgr.sendMessageToDeviceByMemberId(member[0]._id, message, function(err, res){
                    logger.info('push played notification to user, member id is ' + member[0]._id);
                    push_cb(err, res);
                });
            }
        ], function(err, res){
            /*facebookMgr.createAlbum(access_token, album_name, album_message, function(err, res){
                logger.info('create fb album for user, member id is ' + member[0]._id);
                pushPhotosToUser(JSON.parse(res).id, postPicture_cb);
            });*/
            if(type == 'correct'){
			//stop post to fb!!
            //pushPhotosToUser('', postPicture_cb);
            }else
                postPicture_cb(null, 'done');
            //postPicture_cb(err, res);
        });
        
    });
};

censorMgr.updateProgramTimeSlots = function(programTimeSlot_Id, vjson, cb){
    
    FMDB.updateAdoc(programTimeSlotModel, programTimeSlot_Id, vjson, function(err, result){
        if(err) {
            logger.error('[updateProgramTimeSlots_updateAdoc] error', err);
            cb(err,null);
        }
        if(result){
            cb(null,'successful');
            logger.info('[updateProgramTimeSlots_updateAdoc] successful', programTimeSlot_Id);
//          console.log('updateAdoc_result'+result);
        }
    });
};

var putFbPostIdLiveContentsBy_id = function(liveContent_id, fbPostId, cbOfPutFbPostIdLiveContents){
    var userLiveContentModel = FMDB.getDocModel("userLiveContent");
    
    async.waterfall([
        function(callback){
            userLiveContentModel.find({ "_id": liveContent_id}).sort({"createdOn":-1}).exec(function (err, userLiveContentObj) {
                if (!err)
                    callback(null, userLiveContentObj);
                else
                    callback("Fail to retrieve UGC Obj from DB: "+err, userLiveContentObj);
            });
            
        },
        function(userLiveContentObj, callback){
            var vjson;
            var arr = [];
            
            if(userLiveContentObj[0].fb_postId[0]){
                userLiveContentObj[0].fb_postId.push({'postId': fbPostId});
              vjson = {"fb_postId" :userLiveContentObj[0].fb_postId};
            }else{
                arr = [{'postId': fbPostId}];
                vjson = {"fb_postId" : arr};
            }
            
            FMDB.updateAdoc(userLiveContentModel, liveContent_id, vjson, function(errOfUpdateUserLiveContent, resOfUpdateUserLiveContent){
                if (!errOfUpdateUserLiveContent){
                    callback(null, resOfUpdateUserLiveContent);
                }else
                    callback("Fail to update liveContent Obj from DB: "+errOfUpdateUserLiveContent, resOfUpdateUserLiveContent);
            });
            
        }
    ],
    function(err, result){
        if (cbOfPutFbPostIdLiveContents){
            cbOfPutFbPostIdLiveContents(err, result);
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

//putFbPostIdLiveContentsBy_id("5243681811974bd80d00002e", "100006588456341_1403499093213026", function(err, result){
//console.log('--'+err, result);
//});