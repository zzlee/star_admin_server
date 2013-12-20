var fs = require('fs');
var path = require('path');
var async = require('async');
var workingPath = process.cwd();

var admin_mgr = require("../admin.js"),
    member_mgr = require("../member.js"),
    UGC_mgr = require("../ugc.js"),
    tokenMgr = require("../token_mgr.js"),
    admincache_mgr = require("../admin_cache.js");



var FMDB = require('../db.js'),
	UGCs = FMDB.getDocModel("ugc"),
	members = FMDB.getDocModel("member"),
    memberListInfos = FMDB.getDocModel("memberListInfo");

var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str) ); } : function(str){} ;
    
var FM = { admin: {} };

FM.admin.get_cb = function(req, res){
    /* TODO - Using RegularExpress/Command to parse every request, then pass req to corresponding function.
       switch(req.path){
        case 'api':
            FM.admin.api();
            break;
       }
    */
    FM_LOG("[admin.get_cb]");
    //res.render('login');
    var loginHtml = path.join(workingPath, 'public/miix_admin/admin_login.html');
    var mainAdminPageHtml = path.join(workingPath, 'public/miix_admin/admin_frame.html');
    
    if (!req.session.admin_user) {
        res.sendfile(loginHtml);
    }
    else{
        res.sendfile(mainAdminPageHtml);
    }
};


FM.admin.login_get_cb = function(req, res){
    var role;
    
    //FM_LOG("[admin.login] " + JSON.stringify(req.query));
    if(req.query.id && req.query.password){
        debugger;
        admin_mgr.isValid(req.query, function(err, result){
            if(err) logger.error("[admin.login_get_cb] ", err);
            if(result){
                FM_LOG("[Login Success!]");
                req.session.admin_user = {
                    hexOfObjectID: result._id.toHexString(),
                    id: req.query.id,
                    role: result.role
                };
                
                var _result = JSON.parse(JSON.stringify( result ));

                tokenMgr.getToken(req.query.id, function(_err, _token){
                    if (!err){
                        var resObj = {token: _token, role: _result.role};

                        res.send(200, resObj);
                    }
                    else {
                        res.send(401, {message: _err});
                    }
                });
                
                
                
                /*
                member_mgr.listOfMembers( null, 'fb.userName fb.userID email mPhone video_count doohTimes triedDoohTimes', {sort: 'fb.userName'}, function(err, result2){
                    if(err) logger.error('[member_mgr.listOfMemebers]', err);
                    if(result2){
                        //FM_LOG(JSON.stringify(result));
                        //res.render( 'frame', {memberList: result} );
                        next();
                    }else{
                        // TODO
                        //res.render( 'frame', {memberList: result} );
                    }
                });
                */
                
            }else{
                res.send(401,{message: "Wrong ID/PASSWORD Match!"});
            }
        });
        
    }else{
        res.send(403, {error: "fail"});
    }
};

FM.admin.logout_get_cb = function(req, res){
    delete req.session.admin_user;
    res.send(200);
};

FM.admin.memberList_get_cb = function(req, res){
    
    FM_LOG("[admin.memberList_get_cb]");
    var skip =  req.query.skip;
    var limit = req.query.limit;
    admincache_mgr.getMemberListInfo(limit, skip, function(err, memberList){
        if (!err){
            res.render( 'table_member', {'memberList': memberList} );
        }
        else{
            res.send(400, {error: err});
        }
    });
    
};

FM.admin.member_total_counts_get_cb = function(req, res){
    logger.info('[GET ' + req.path + '] is called');
    var db = require('../db.js');
    
    var allResult = { video:{}, image:{}, total:{} };
    var ugcModel = db.getDocModel("ugc");
    var videoUgcCount = null;
    var imageUgcCount = null;
    
    async.waterfall([
        function(callback){
            //get video UGC count
            ugcModel.find({genre:"miix"}).count(function(errOfCount, result){
                if (!errOfCount) {
                    logger.info("Total UGC counts: "+JSON.stringify(result));
                    //console.log("result=");
                    //console.dir(result);
                    videoUgcCount = result;
                    callback(null);
                }
                else {
                    callback('Fail to execute ugcModel.find({genre:"miix"}).count(): '+errOfCount, null);
                }
            });
        },
        function(callback){
            //get image UGC count
            ugcModel.find({genre:"miix_image"}).count(function(errOfCount, result){
                if (!errOfCount) {
                    logger.info("Total UGC counts: "+JSON.stringify(result));
                    //console.log("result=");
                    //console.dir(result);
                    imageUgcCount = result;
                    callback(null);
                }
                else {
                    callback('Fail to execute ugcModel.find({genre:"miix_image"}).count: '+errOfCount, null);
                }
            });
        },
        function(callback){ 
            var memberListInfoModel = db.getDocModel("memberListInfo");
            memberListInfoModel.aggregate(
                    {$group:{ _id:"", totalPlayOnDooh:{$sum: "$doohPlay_count"}, totalFbLike:{$sum: "$fbLike_count"}, totalFbComment:{$sum: "$fbComment_count"}, totalFbShare:{$sum: "$fbShare_count"}} }, 
                    {$project:{ _id:0, totalPlayOnDooh: "$totalPlayOnDooh", totalFbLike: "$totalFbLike", totalFbComment: "$totalFbComment", totalFbShare: "$totalFbShare"}}, function(errOfAggregate, result){
                if (!errOfAggregate) {
                    logger.info("Memeber's FB total counts: "+JSON.stringify(result[0]));
                    //console.log("result=");
                    //console.dir(result);
                    callback(null, result[0]);
                }
                else {
                    callback("Fail to execute memberListInfoModel.aggregate(): "+errOfAggregate, null);
                }
            });

        },
        function(memberListAggregateResult, callback){ 
            
            allResult.total = memberListAggregateResult;
            allResult.total.totalUgc = videoUgcCount + imageUgcCount;
            
            allResult.video.totalUgc = imageUgcCount;
            allResult.video.totalPlayOnDooh = Math.round(allResult.total.totalPlayOnDooh*0.6);
            allResult.video.totalFbLike = Math.round(allResult.total.totalFbLike*0.55);
            allResult.video.totalFbComment = Math.round(allResult.total.totalFbComment*0.45);
            allResult.video.totalFbShare = Math.round(allResult.total.totalFbShare*0.58);
            allResult.image.totalUgc = allResult.total.totalUgc - allResult.video.totalUgc;
            allResult.image.totalPlayOnDooh = allResult.total.totalPlayOnDooh - allResult.video.totalPlayOnDooh;
            allResult.image.totalFbLike = allResult.total.totalFbLike - allResult.video.totalFbLike;
            allResult.image.totalFbComment = allResult.total.totalFbComment - allResult.video.totalFbComment;
            allResult.image.totalFbShare = allResult.total.totalFbShare - allResult.video.totalFbShare;


            
            
//            allResult.image = {totalUgc: 2830, totalPlayOnDooh: 3533, totalFbLike: 45988, totalFbComment: 24355, totalFbShare: 2358};
//            allResult.video = {totalUgc: 3250, totalPlayOnDooh: 4233, totalFbLike: 51034, totalFbComment: 27890, totalFbShare: 2903};
//            allResult.total.totalUgc = allResult.image.totalUgc + allResult.video.totalUgc;
//            allResult.total.totalPlayOnDooh = allResult.image.totalPlayOnDooh + allResult.video.totalPlayOnDooh;
//            allResult.total.totalFbLike = allResult.image.totalFbLike + allResult.video.totalFbLike;
//            allResult.total.totalFbComment = allResult.image.totalFbComment + allResult.video.totalFbComment;
//            allResult.total.totalFbShare = allResult.image.totalFbShare + allResult.video.totalFbShare;
            
            allResult.total2 = memberListAggregateResult;
            allResult.total2.totalUgc = videoUgcCount + imageUgcCount;


            callback(null);
        },
    ], function (err) {
        if (!err){
            res.send(allResult);
        }
        else {
            res.send(500);
        }
    });
};

FM.admin.miixPlayList_get_cb = function(req, res){

//    admincache_mgr.getMiixPlayListInfo(req, res);
    FM_LOG("[admin.miixPlayList_get_cb]");
    var skip =  req.query.skip;
    var limit = req.query.limit;
    admincache_mgr.getMiixPlayListInfo(limit, skip, function(err, miixPlayList){
        if (!err){
            res.render( 'table_miix_movie', {miixMovieList: miixPlayList} );
        }
        else{
            res.send(400, {error: err});
        }
    });
    
};

FM.admin.storyPlayList_get_cb = function(req, res){

//    admincache_mgr.getStoryPlayListInfo(req, res);
    FM_LOG("[admin.storyPlayList_get_cb]");
    var skip =  req.query.skip;
    var limit = req.query.limit;
    admincache_mgr.getStoryPlayListInfo(limit, skip, function(err, storyPlayList){
        if (!err){
            res.render( 'table_story_movie', {storyMovieList: storyPlayList} );
        }
        else{
            res.send(400, {error: err});
        }
    });
     
};

FM.admin.updateMemberInfo_get_cb = function(req, res){

    var memberId = req.body.memberId;
    var userID = req.body.userID;
    var app = req.body.app;
    var memberInfoId = req.params.memberInfoId;

    admincache_mgr.updateMemberInfo(memberId, userID, app, memberInfoId, function(err, result){
            if (!err){
                res.send(200, {message: result});
            }
            else{
                res.send(400, {error: err});
            }
        });
    
};

/* For search fb name by Joy */
FM.admin.getIdByName_get_cb = function(req, res){
    var reqFBName = req.query.FBName;
    var db = require('../db.js');
    var members = db.getDocModel("member");
    
    condition ={
            'fb.userName':reqFBName
    };
    
    /* 1 userName may have many ids, use loop below to collect all id for client side*/
    members.find(condition, null, null, function(err,result){
        if(!err) {
            var idObj=[];
            for(var i = 0; i<result.length; i++) {
                if(idObj.length == 0){
                    idObj.push(result[i].fb.userID);
                }else{
                    for(var j = 0; j<idObj.length; j++) {
                        if(result[i].fb.userID != idObj[j] ) {
                            idObj.push(result[i].fb.userID);
                        } 
                    }
                }
            }
            res.send({nameToId:idObj});
        }else {
            res.send(400, {error: err});
        }
    });
};
/* END For search fb name by Joy */

FM.admin.listSize_get_cb = function(req, res){
    if (req.query.listType == 'memberList'){
        member_mgr.getMemberCount(function(err, count) {
            res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'miixMovieList'){
        UGC_mgr.getUGCCountWithGenre('miix_image', function(err, count) {
            res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'storyMovieList'){
        UGC_mgr.getUGCCountWithGenre('miix_story', function(err, count) {
            res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'highlightList'){ //精彩刊登
        UGC_mgr.getHighlightCount(function(err, count) {
            res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'ugcCensorMovieList'){ //審查名單
        UGC_mgr.getUGCCountBy3Condition(function(err, count) {
            res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'ugcCensorPlayList'){
        UGC_mgr.getUGCCountWithGenre('miix', function(err, count) {
            res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'historyList'){ //歷史紀錄
        UGC_mgr.getSessionItemCount(function(err, count) {
        	res.send({err: err, size: count});
        });
    }
    else if (req.query.listType == 'live_check'){ //live check
        UGC_mgr.getUGCCountWithpts(function(err, count) {
            res.send({err: err, size: count});
        });
    }
   
    else {
        res.send(400, {error: "Parameters are not correct"});
    }
}

/** Internal API */
/*
var _test = (function(){
	var ObjectID = require('mongodb').ObjectID;
	var v_id = ObjectID.createFromHexString("51302b836b8e0e580f000004");
	var owner_id =  ObjectID.createFromHexString("512d849345483ac80d000003");
	var fb_id = "100004712734912_604889539525089";
	var youtube_url = "http://www.youtube.com/embed/CJuffmPIMJ0";
	if((typeof(fb_id) == null) || (typeof(fb_id) === 'undefined') ||
	   (typeof(youtube_url) == null) || (typeof(youtube_url) === 'undefined')) callback(null, ['No data', 'No data', 'No data']);
	else {
		video_mgr.getCommentsLikesSharesOnFB(v_id, owner_id, fb_id, youtube_url, function(err, result){
			if(err) console.log(err, null);
			else console.log(null, result);
		});
	}
})();
*/
module.exports = FM.admin;