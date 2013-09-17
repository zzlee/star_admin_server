
var FMDB = require('./db.js'),
    UGC_mgr = require('./ugc.js'),
    ObjectID = require('mongodb').ObjectID,
    fbMgr = require('./facebook_mgr.js'),
	member_mgr = require('./member.js'),
    youtubeInfo = require('./youtube_mgr.js');
    
var FM = {};

FM.ADMINCACHE = (function(){
    var uInstance = null;


    /**     Member     **/
    var cacheMember = function(){

        //TODO: need to implement

        var member_mgr_t = require('./member.js');
        var memberListInfos = FMDB.getDocModel("memberListInfo");

        var async = require('async');
        var next = 0,
        limit = 0;

        var cacheMemberList = function(data, set_cb){
            var toDo = function(err, result){
                var mPhone = null;
                if(data[next].mPhone.number)
                    mPhone = data[next].mPhone.number;
                    
                //update mongoDB
                var vjson = {
                        fb: { userID: data[next].fb.userID, userName: data[next].fb.userName},
                        email: data[next].email,
                        mPhone: mPhone,
                        miixMovieVideo_count: result[0],
                        doohPlay_count: result[1],
                        movieViewed_count: result[2],
                        fbLike_count: result[3][0].totalLikes,
                        fbComment_count: result[3][0].totalComments,
                        fbShare_count: result[3][0].totalShares,
                };

                var field = "fb.userID";
                FMDB.getValueOf(memberListInfos, {"fb.userID": data[next].fb.userID}, field, function(err, result){
                    if(!result){ 
                        FMDB.createAdoc(memberListInfos, vjson, function(err, result){
                        });
                    }else if(result){
                        FMDB.updateAdoc(memberListInfos, result, vjson, function(err, result){
                        });
                    }
                });
                next += 1;

                if(next == limit ) {
                    set_cb(null, 'OK'); 
                    next = 0;
                }
                else{
                    cacheMemberList(data, set_cb);
                }
                //update mongoDB End ******

            };//toDo End ******

            //get count  
            if(data[next]){
                if( data[next].fb.userID ){
                    async.parallel([
                                    function(callback){
                                        UGC_mgr.getUGCCount(data[next]._id, 'miix', function(err, result){
                                            if(err) callback(err, null);
                                            else callback(null, result);
                                        });
                                    },
                                    function(callback){
                                        UGC_mgr.getUGCCount(data[next]._id, 'miix_story', function(err, result){
                                            if(err) callback(err, null);
                                            else callback(null, result);
                                        });
                                    },
                                    function(callback){
                                        member_mgr.getTotalView(data[next]._id, function(err, result){
                                            if(err) callback(err, null);
                                            else callback(null, result);
                                        });
                                    },
                                    function(callback){
                                        member_mgr.getTotalCommentsLikesSharesOnFB(data[next].fb.userID, function(err, result){
                                            if(err) callback(err, null);
                                            else callback(null, result);
                                        });
                                    }
                                    ], toDo);
                }
            }
        };//cacheMemberList End ******

        member_mgr_t.listOfMembers( null, 'fb.userName fb.userID _id email mPhone ugc_count doohTimes triedDoohTimes', {sort: 'fb.userName'}, function(err, result){
            if(err) console.log('[member_mgr.listOfMemebers]', err);
            if(result){
                limit = result.length;
                if(limit > 0){
                    cacheMemberList(result, function(err, docs){
                        if(err) console.log(err);
                    });
                }
            }
        });
    };
    /**     Member End     **/


    /**     MiixUGC     **/
    var cacheMiixUGC = function(){

        //TODO: need to implement

        var member_mgr = require('./member.js');
        var UGC_mgr = require('./ugc.js');
        var miix_content_mgr = require('./miix_content_mgr.js');
        
        var miixPlayListInfos = FMDB.getDocModel("miixPlayListInfo");
        var UGCs = FMDB.getDocModel("ugc");

        var async = require('async');
        var next = 0,
        limit = 0;

        var cacheMiixPlayList = function(data, set_cb){
            var toDo = function(err, result){
                var userPhotoUrl = null;
                var userContentType = null;
                if(data[next].userRawContent[0]){
                userPhotoUrl = data[next].userRawContent[0].content;
                userContentType = data[next].userRawContent[0].type;
                }
                //update mongoDB
                var vjson = {
                        projectId:data[next].projectId,
                        userPhotoUrl:userPhotoUrl,
                        movieNo: data[next].no,
                        movieViewed_count:result[0],
                        fbLike_count:result[2][0].totalLikes,
                        fbComment_count:result[2][0].totalComments,
                        fbShare_count:result[2][0].totalShares,
                        movieMaker:result[1],
                        applyDoohPlay_count:data[next].triedDoohTimes,
                        doohPlay_count:data[next].doohPlayedTimes,
                        createdOn: data[next].createdOn,
                        userContentType: userContentType
                };

                var field = "projectId";
                FMDB.getValueOf(miixPlayListInfos, {"projectId": data[next].projectId}, field, function(err, result){
                    if(!result){ 
                        FMDB.createAdoc(miixPlayListInfos, vjson, function(err, result){
                        });
                    }else{
                        FMDB.updateAdoc(miixPlayListInfos, result, vjson, function(err, result){
                        });
                    }
                        
                });
                next += 1;

                if(next == limit) {
                    set_cb(null, 'OK'); 
                    next = 0;
                }
                else{
                    cacheMiixPlayList(data, set_cb);
                }
                //update mongoDB End ******

            };//toDo End ******

            //get count 
            if(data[next]){
                if( data[next].ownerId._id && data[next].projectId){
                    async.parallel([
                                    function(callback){
                                        UGC_mgr.getUGCCount(data[next]._id, 'miix', function(err, result){
                                            if(err) callback(err, null);
                                            else callback(null, result);
                                        });
                                    },
                                    function(callback){
                                        member_mgr.getUserNameAndID(data[next].ownerId._id, function(err, result){
                                            if(err){callback(err, null);}
                                            else if(!result){ callback(null, 'No User');}
                                            else{ callback(null, result.fb.userName);}
                                        });
                                    },
                                    function(callback){
                                        if((typeof(data[next].fb_postId[0]) == null) || (typeof(data[next].fb_postId[0]) === 'undefined'))
                                             callback(null, [{ totalComments: 0, totalLikes: 0, totalShares: 0 }]);
                                        else {
                                            UGC_mgr.getCommentsLikesSharesOnFB(data[next]._id, data[next].ownerId._id, data[next].fb_postId, function(err, result){
                                                if(err) callback(err, null);
                                                else callback(null, result);
                                            });
                                        }
                                    },
                                    ], toDo);
                }
            }
        };
        var query = UGCs.find();
        query.sort({'createdOn': -1}).exec(function(err, result){
 
            limit = result.length;
            if(limit > 0){
                cacheMiixPlayList(result, function(err, result){
                    if(err) console.log(err);
                });
            }
        });

    };
    /**     MiixUGC End     **/        

    /**     StoryUGC     **/
    var cacheStoryUGC = function(){

        //TODO: need to implement

        var member_mgr = require('./member.js');
        var UGC_mgr = require('./ugc.js');

        var UGCs = FMDB.getDocModel("ugc");
        var storyPlayListInfos = FMDB.getDocModel("storyPlayListInfo");

        var async = require('async');
        var next = 0,
        limit = 0;

        var cacheStoryPlayList = function(data, set_cb){
            var toDo = function(err, result){
                //update mongoDB
                var vjson = {
                        projectId: data[next].projectId,
                        movieNo: data[next].no,
                        movieViewed_count: result[1],
                        fbLike_count: result[2][0].likes,
                        fbComment_count: result[2][0].comments,
                        fbShare_count: result[2][1].shares,
                        movieMaker: result[0],
                        createdOn: data[next].createdOn
                };

                var field = "projectId";
                FMDB.getValueOf(storyPlayListInfos, {"projectId": data[next].projectId}, field, function(err, result){
                    if(result == null){ 
                        FMDB.createAdoc(storyPlayListInfos,vjson, function(err, result){
                        });
                    }else{
                        FMDB.updateAdoc(storyPlayListInfos, result, vjson, function(err, result){
                        });
                    }
                });
                next += 1;

                if(next == limit) {
                    set_cb(null, 'OK'); 
                    next = 0;
                }
                else{
                    cacheStoryPlayList(data, set_cb);
                }
                //update mongoDB End ******

            };//toDo End ******

            //get count
            if(data[next]){
                if( data[next].ownerId._id && data[next].projectId && data[next].fb_id ){
                async.parallel([
                                function(callback){
                                    member_mgr.getUserNameAndID(data[next].ownerId._id, function(err, result){
                                        if(err) callback(err, null);
                                        else callback(null, result.fb.userName);
                                    });
                                },
                                function(callback){
                                    UGC_mgr.getUGCCount(data[next]._id, 'miix_story', function(err, result){
                                        if(err) callback(err, null);
                                        else callback(null, result);
                                    });
                                },
                                function(callback){
                                  if((typeof(data[next].fb_postId[0]) == null) || (typeof(data[next].fb_postId[0]) == 'undefined'))
                                       callback(null, [{ totalComments: 0, totalLikes: 0, totalShares: 0 }]);
                                  else {
                                      UGC_mgr.getCommentsLikesSharesOnFB(data[next]._id, data[next].ownerId._id, data[next].fb_postId, function(err, result){
                                          if(err) callback(err, null);
                                          else callback(null, result);
                                      });
                                  }
                                },
                                ], toDo);
                }
            }
        };
        
        var query = UGCs.find({'genre': 'miix_story'});
        query.exec(function(err, result){

            limit = result.length;
            if(limit > 0){
                cacheStoryPlayList(result, function(err, result){
                    if(err) console.log(err);
                });
            }
        });

    };
    /**     StoryUGC End     **/  

    var retrieveDataAndUpdateCacheDB = function(){    
        //TODO: need to implement
       
        cacheMember();

        cacheMiixUGC();

//        cacheStoryUGC();

        /*
         * Timer
         */            
        setTimeout(retrieveDataAndUpdateCacheDB,300000);

    };
    
    var deleteCacheDB = function(){
        var memberListInfos = FMDB.getDocModel("memberListInfo");
        var miixPlayListInfos = FMDB.getDocModel("miixPlayListInfo");
        
        memberListInfos.remove().exec(function(err, res){
        });
        miixPlayListInfos.remove().exec(function(err, res){
        });

//      setTimeout(deleteCacheDB,3000000);

    };
    //TODO use config to control
//    deleteCacheDB();
//
//    retrieveDataAndUpdateCacheDB();


    function constructor(){

        var DEBUG = true,
        FM_LOG = (DEBUG) ? function(str){ logger.info(str); } : function(str){} ;

        var memberListInfos = FMDB.getDocModel("memberListInfo");
        var miixPlayListInfos = FMDB.getDocModel("miixPlayListInfo");
        var storyPlayListInfos = FMDB.getDocModel("storyPlayListInfo");

        return {

            /*
             *  Public Members
             */
            /**     Member     **/
            getMemberListInfo : function(_limit, _skip, cb){

                //TODO: need to implement

                var memberList = [];

                var memberListInfo = function(fb_id, fb_name, email, mp_number, miixMovieVideo_count, doohPlay_count, movieViewed_count, fbLike_count, fbComment_count, fbShare_count, arr) {
                    arr.push({ 
                        fb: { userID: fb_id, userName: fb_name },
                        email: email,                        
                        mobilePhoneNumber: mp_number,        
                        miixMovieVideoCount: miixMovieVideo_count, 
                        doohPlayCount: doohPlay_count,       
                        movieViewedCount: movieViewed_count, 
                        fbLikeCount: fbLike_count,           
                        fbCommentCount: fbComment_count,     
                        fbShareCount: fbShare_count
                    });
                };

                var next = 0,
                    limit = 0;

                var setMemberList = function(data, set_cb){
                    if(next == limit-1) {
                        memberListInfo(data[next].fb.userID, data[next].fb.userName, data[next].email, data[next].mPhone, data[next].miixMovieVideo_count, data[next].doohPlay_count, data[next].movieViewed_count, data[next].fbLike_count, data[next].fbComment_count,data[next].fbShare_count, memberList);               
                        next = 0;
                        set_cb(null, 'OK');
                    }
                    else {
                        memberListInfo(data[next].fb.userID, data[next].fb.userName, data[next].email, data[next].mPhone, data[next].miixMovieVideo_count, data[next].doohPlay_count, data[next].movieViewed_count, data[next].fbLike_count, data[next].fbComment_count,data[next].fbShare_count, memberList);               
                        next += 1;
                        setMemberList(data, set_cb);
                    }

                };

                if ( (!_limit) && (!_skip) ) {
                    //res.send(400, {error: "Parameters are not correct"});
                    if (cb){
                        cb("Parameters are not correct", null);
                    }
                }
                else{
                    FMDB.listOfdocModels( memberListInfos,null,'fb.userName fb.userID _id email mPhone miixMovieVideo_count doohPlay_count movieViewed_count fbLike_count fbComment_count fbShare_count', {sort:'fb.userName',limit: _limit, skip: _skip}, function(err, result){
                        if(err) logger.error('[db.listOfMemebers]', err);
                        if(result){

                            if(_skip < result.length && result.length >= _limit)
                                limit = _limit;
                            else 
                                limit = result.length;
                            if(limit > 0){
                                setMemberList(result, function(err, docs){
                                    if(err) console.log(err);
                                    else {
                                        //res.render( 'table_member', {'memberList': memberList} );
                                        if (cb){
                                            cb(err, memberList);
                                        }
                                    }
                                });
                            }else cb(err, memberList);

                        }
                    });
                }

            },
            /**     Member End     **/

            /**     MiixUGC     **/
            getMiixPlayListInfo : function(_limit, _skip, cb){

                //TODO: need to implement

                var miixPlayList = [];

                var miixPlayListInfo = function(userPhotoUrl, movieNo, movieViewed_count, fbLike_count, fbComment_count, fbShare_count, movieMaker, applyDoohPlay_count, doohPlay_count, timesOfPlaying, userContentType, arr) {
                    arr.push({ 
                        userPhotoUrl: userPhotoUrl,          
                        movieNo: movieNo,                    
                        movieViewedCount: movieViewed_count, 
                        fbLikeCount: fbLike_count,           
                        fbCommentCount: fbComment_count,     
                        fbShareCount: fbShare_count,         
                        movieMaker: movieMaker,              
                        applyDoohPlayCount: applyDoohPlay_count, 
                        doohPlayCount: doohPlay_count,       
                        timesOfPlaying: timesOfPlaying,
                        userContentType: userContentType
                    });
                };

                var next = 0,
                limit = 0;

                var setMiixPlayList = function(data, set_cb){
                    if(next == limit-1) {
                        miixPlayListInfo(data[next].userPhotoUrl, data[next].movieNo, data[next].movieViewed_count, data[next].fbLike_count, data[next].fbComment_count, data[next].fbShare_count,data[next].movieMaker,data[next].applyDoohPlay_count,data[next].doohPlay_count,0, data[next].userContentType, miixPlayList);               
                        next = 0;
                        set_cb(null, 'OK');
                    }
                    else {
                        miixPlayListInfo(data[next].userPhotoUrl, data[next].movieNo, data[next].movieViewed_count, data[next].fbLike_count, data[next].fbComment_count, data[next].fbShare_count,data[next].movieMaker,data[next].applyDoohPlay_count,data[next].doohPlay_count,0, data[next].userContentType, miixPlayList);               
                        next += 1;
                        setMiixPlayList(data, set_cb);
                    }

                };

                if ( (!_limit) && (!_skip) ) {
//                  res.send(400, {error: "Parameters are not correct"});
                    if (cb){
                        cb("Parameters are not correct", null);
                    }
                }
                else{
                    FMDB.listOfdocModels( miixPlayListInfos,null,'projectId userPhotoUrl movieNo movieViewed_count fbLike_count fbComment_count fbShare_count movieMaker applyDoohPlay_count doohPlay_count timesOfPlaying createdOn userContentType', {sort:{'createdOn':-1},limit:_limit, skip: _skip}, function(err, result){
                        if(err) logger.error('[cache-getMiixPlayListInfo]', err);
                        if(result){

                            if(_skip < result.length && result.length >= _limit)
                                limit = _limit;
                            else 
                                limit = result.length;

                            if(limit > 0){
                                setMiixPlayList(result, function(err, docs){
                                    if(err) console.log(err);
                                    else {
                                        if (cb){
                                            cb(err, miixPlayList);
                                        }
//                                        res.render( 'table_miix_movie', {miixMovieList: miixPlayList} );
                                    }
                                });
                            }else cb(err, miixPlayList);

                        }
                    });
                
                }

            },
            /**     MiixUGC End     **/

            /**     StoryUGC     **/
            getStoryPlayListInfo : function(_limit, _skip, cb){

                //TODO: need to implement

                var storyPlayList = [];

                var storyPlayListInfo = function(movieNo, movieViewed_count, fbLike_count, fbComment_count, fbShare_count, movieMaker, arr) {
                    arr.push({ 
                        movieNo: movieNo,                    
                        movieViewedCount: movieViewed_count, 
                        fbLikeCount: fbLike_count,           
                        fbCommentCount: fbComment_count,     
                        fbShareCount: fbShare_count,         
                        movieMaker: movieMaker              
                    });
                };


                var next = 0,
                limit = 0;

                var setStoryPlayList = function(data, set_cb){
                    if(next == limit-1) {
                        storyPlayListInfo(data[next].movieNo, data[next].movieViewed_count, data[next].fbLike_count, data[next].fbComment_count, data[next].fbShare_count, data[next].movieMaker, storyPlayList);
                        next = 0;
                        set_cb(null, 'OK');
                    }
                    else {
                        storyPlayListInfo(data[next].movieNo, data[next].movieViewed_count, data[next].fbLike_count, data[next].fbComment_count, data[next].fbShare_count, data[next].movieMaker, storyPlayList);
                        next += 1;
                        setStoryPlayList(data, set_cb);
                    }

                };
                if ( (!_limit) && (!_skip) ) {
//                  res.send(400, {error: "Parameters are not correct"});
                    if (cb){
                        cb("Parameters are not correct", null);
                    }
                }else{
                    FMDB.listOfdocModels( storyPlayListInfos,null,'projectId movieNo movieViewed_count fbLike_count fbComment_count fbShare_count movieMaker createdOn', {sort:{'createdOn':-1},limit: _limit, skip: _skip}, function(err, result){
                        if(err) logger.error('[db.listOfMemebers]', err);
                        if(result){

                            if(_skip < result.length && result.length >= _limit)
                                limit = _limit;
                            else 
                                limit = result.length;

                            if(limit > 0){
                                setStoryPlayList(result, function(err, docs){
                                    if(err) console.log(err);
                                    else {
                                        if (cb){
                                            cb(err, storyPlayList);
                                        }
//                                        res.render( 'table_story_movie', {storyMovieList: storyPlayList} );
                                    }
                                });
                            }else cb(err, storyPlayList);
                        }
                    });
                }

            },
            /**     StoryUGC End     **/                

            /*    TEST    */


        };//     End of return

    } //    End of Constructor.


    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            return uInstance;
        }
    }; //   End of Return uInstance.
})(); // End of FM.ADMINCACHE

    /*  For TEST. */


    module.exports = FM.ADMINCACHE.getInstance();