
    
var FM = {};
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.log(str); } : function(str){} ;

FM.UGC = (function(){
    var uInstance;
	
    
    function constructor(){
		var FMDB = require('./db.js'),
			memberDB = require('./member.js'),
			youtubeInfo = require('./youtube_mgr.js'),
            fbMgr = require('./facebook_mgr.js'),
		    ugcSerialNoMgr = require('./ugc_serial_no_mgr.js'),
			UGCs = FMDB.getDocModel("ugc");
		/* count right number by joy */
		pts = FMDB.getDocModel("programTimeSlot"); //for live check
		sessionItems = FMDB.getDocModel("sessionItem"); //for 歷史紀錄
		
		/* end ------- */
        
        return {
        /*
         *  Public Members
         */
            getListByLoc: function(locationUID){
                var query = UGCs.find({});
                query.sort('timestamp', -1).exec(function(err, doc){
                    if(err){
                        logger.log('locationQuery failed: '+err);
                    }else{
                        logger.log('locationQuery '+locationUID+': '+doc);
                    }
                });
            },

            latest: function(latestNum, cb){
                var query = UGCs.find({});
                query.sort('timestamp', -1),limit(latestNum).exec(cb);
            },

            top: function(topNum, cb){
                var query = UGCs.find({});
                query.sort('likes', -1).limit(topNum).exec(cb);
            },
            
            getUGCById: function(oid, cb){
                FMDB.readAdocById(UGCs, oid, cb);
            },
            
            getValueById: function(oid, fields, cb){
                
                FMDB.getValueOf(UGCs, {"_id":oid}, fields, cb);
            },
            
            getOwnerIdByPid: function(pid, cb){
                UGCs.findOne({projectId: pid}, 'ownerId._id', function(err, result){
                    if(err){
                        logger.error("[getOwnerIdByPid]", err);
                        cb(err, null);
                    }else if(result){
                        cb(null, result.ownerId._id);
                    }else{
                        cb(null, result);
                    }
                });
            },
            
            getAeIdByPid: function(pid, cb){
                UGCs.findOne({projectId: pid}, 'aeId', function(err, result){
                    if(err){
                        logger.error("[getAeIdByPid]", err);
                        cb(err, null);
                    }else if(result){
                        cb(null, result.aeId);
                    }else{
                        cb(null, result);
                    }
                });
            },
            
            getValueByProject: function(projectId, fields, cb){
                FMDB.getValueOf(UGCs, {"projectId":projectId}, fields, cb);
            },
            
            getUGCListByOwnerId: function(ownerId, limit, skip, cb){
                UGCs.find({"ownerId._id":ownerId, $or:[ { "genre":"miix" }, { "genre": "miix_image"} ]}).sort({"createdOn":-1}).limit(limit).skip(skip).exec(cb);
            },
            //DEPRECATED
            getLiveUGCListByOwnerId: function(ownerId, limit, skip, cb){
                UGCs.find({"ownerId._id":ownerId, $or:[ { "genre":"miix_story" }, { "genre": "miix_image_live_photo"} ]}).sort({"createdOn":-1}).limit(limit).skip(skip).exec(cb);
            },
            
            getUGCListByFB: function(userID, cb){
                UGCs.find({"ownerId.userID":userID}, cb );
            },
            
            getUGCListOnFB: function(userID, genre, cb){
                debugger;
                var query = UGCs.find(null, 'fb_postId.postId');
                
                if('function' === typeof (genre)){
                    cb = genre;
                    query.where("ownerId.userID", userID).ne("fb_postId.postId", null).sort({createdOn: -1}).exec(cb);
//                    console.log('UGC.js cb'+cb);
                }else{
                    query.where("ownerId.userID", userID).where("genre", genre).ne("fb_id", null).sort({createdOn: -1}).exec(cb);
                }
            },
            
			getNewUGCListByFB : function(userID, genre, after, cb){
                // Only catch UGCs which are posted on FB.
                var query = UGCs.find();
				query.where("ownerId.userID", userID).where("genre", genre).where("createdOn").gte(after).sort({createdOn: -1}).limit(10).exec(cb);
            },
            
            //DEPRECATED
            getNewStreetUGCListByFB : function(userID, after, cb){
                var query = UGCs.find();
				query.where("ownerId.userID", userID).where("genre", "miix_street").ne("fb_id", null).where("createdOn").gte(after).sort({createdOn: -1}).limit(10).exec(cb);
            },
            
            //kaiser            
            getOwnerIdByNo: function(no, cb){
                UGCs.findOne({no: no}, '_id', function(err, result){
                    if(err){
                        logger.error("[getOwnerIdByNo]", err);
                        cb(err, null);
                    }else if(result){
                        cb(null, result._id);
                    }else{
                        cb(null, result);
                    }
                });
            },
			
            update: function(oid, newdata){
                FMDB.updateAdoc(UGCs, oid, newdata, function(res){
                    FM_LOG("[UGC Update Succeed!] " + JSON.stringify(res) );
                });
            },
			
			updateOne: function(condition, newdata, options, cb){
				FMDB.updateOne(UGCs, condition, newdata, options, cb);
			},
            
            
            /*  ownerId must be included in vjson. [callback]  */
            addUGC: function(vjson, cb){
                if(vjson.ownerId){
                    ugcSerialNoMgr.getUgcSerialNo(function(err, ugcSerialNo) {
                        if (!err) {
                            vjson.no = ugcSerialNo;
                            FMDB.createAdoc(UGCs, vjson, cb);
                        }
                        else {
                            cb({error: "Failed to get the serial No of UGC"}, null);
                        }
                    });
            
                }else{
                    var err = {error: "ownerId is MUST-HAVE!"};
                    cb(err, null);
                }
			},
            
			getCommentsLikesSharesOnFB: function( v_id, owner_id, fb_postId, cb){
			    var access_token;
			    var async = require("async");
			    var likes_count = 0,
			    comments_count = 0,
			    shares_count = 0;	
			    var memberDB_fb = require('./member.js');

			    memberDB_fb.getFBAccessTokenById(owner_id, function(err, fb_auth){
//			        console.log(fb_auth);
			        if(err){
			            logger.error("[memberDB.getFBAccessTokenById] ", err);
			            cb(err, null);

			        }if(fb_auth){
			            access_token = fb_auth.fb.auth.accessToken;

			            async.parallel([
			                            function(callback){
			                                var batch = [];

			                                for(var _idx=0; _idx<fb_postId.length;_idx++){
			                                    var relative_url = fb_postId[_idx].postId + "?fields=comments,likes,shares";
			                                    batch.push( {"method": "GET", "relative_url": relative_url} );
			                                }
//			                                console.dir(batch);
			                                fbMgr.batchRequestToFB(access_token, null, batch, function(err, result){
			                                    if(err){
			                                        callback(null, {totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count});

			                                    }else if(!result){
                                                    callback(null, {totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count});
                                                    
                                                }else if(!result[0]){
                                                    callback(null, {totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count});
                                                
                                                }else{
			                                        if (result) {
//			                                            console.log('result'+result);
			                                            for(var i in result){
			                                                if (result[i].comments){
			                                                    comments_count += result[i].comments.data.length;
			                                                }
			                                                // when count=0, there is no likes object.
			                                                if (result[i].likes){
//			                                                    console.log(result[i].likes);
			                                                    likes_count += (result[i].likes) ? result[i].likes.data.length : 0;
			                                                }
			                                                if (result[i].shares){
			                                                    shares_count += (result[i].shares) ? result[i].shares.count : 0;
			                                                }
			                                            }
			                                        }

			                                        callback(null, {totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count} );
			                                    }
			                                });
			                            },
			                            ]

			            , function(err, result){
			                if(err){
			                    logger.err("[getCommentsLikesSharesOnFB] ", err);
			                    cb(err, null);

			                }else if(!result){
			                    cb(null, [{totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count}]);
			                }else if(result){
			                    cb(null, result);
			                }else{
			                    cb(null, [{totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count}]);
			                }
			            });
			        }else{
			            logger.info("[UGC.js getCommentsLikesSharesOnFB] fb_auth is null. owner_id="+owner_id);
			            cb(null, [{totalComments: comments_count, totalLikes: likes_count, totalShares: shares_count}]);
			        }
			    });
			},
            
            /*  For TEST. */
            
            // Only for v1.2 - GL
            getPlayList: function(cb){
                var query = UGCs.find();
                query.ne("doohTimes.submited_time", null).sort({"doohTimes.submited_time": 1}).exec(cb);
            },
            
            
            nextDoohUGC: function(cb){
                var query = UGCs.findOneAndUpdate(null, {$unset:{"doohTimes.submited_time": 1}}, {select:{projectId:1}} );
                query.ne("doohTimes.submited_time", null).sort({"doohTimes.submited_time": 1}).limit(1).exec(cb);
            },
            
            _updateCounter: function(cb){  //DEPRECATED  (Not being called by anyone
                var query = UGCs.find({});
                query.sort({createdOn:1}).exec(function(err, result){
                    if(err) return;
                    for(var i in result){
                        UGCs.findByIdAndUpdate(result[i]._id, {no:parseInt(i)+1}, {select:{no:1}}, cb);
                    }
                });
            },
			
            
            //GZ
			getUGCCountWithGenre: function(UGCGenre, cb){
				var condition = { 'genre': UGCGenre };
				UGCs.count(condition, cb);
			},
			
			//------ count right page number by Joy---------
			getUGCCountWithpts: function(cb){ //for live check
				var condition = { "type": "UGC",
           			            "state": "confirmed"};
				pts.count(condition, cb);
			},
			
			getSessionItemCount: function(cb){ //for 歷史紀錄
				var condition = { };
				sessionItems.count(condition, cb);
			},
			
			getHighlightCount: function(cb){ //for 精彩刊登
				var condition = {'doohPlayedTimes':{$gte : 1} };
				UGCs.count(condition, cb);
			},
			getUGCCountBy3Condition: function(cb){ //for 審查名單
				var condition = {
						'no':{ $exists: true},
			            'ownerId':{ $exists: true},
			            'projectId':{ $exists: true}
				};
				UGCs.count(condition, cb);
			},
			//------  end------------
            _GZ_test: function(){
                /*
                this.getVideoCountWithGenre('miix_story', function(err, count) {
                    console.log('count= '+count);
                });
                */
                /*
                var after = new Date(parseInt('1363950956281'));
                var query = videos.find();
				query.exec(function(err, result){
				//query.where("ownerId.userID", '100004619173955').sort({createdOn: -1}).limit(20).exec(function(err, result){
				//query.where("ownerId.userID", '100004619173955').where("genre", 'miix_story').where("createdOn").gte(after).sort({createdOn: -1}).limit(10).exec(function(err, result){
                //this.getNewVideoListByFB('100004619173955', 'miix_story', after, function(err, result){
                    console.dir(result);
                    fs=require('fs');
                    fs.writeFile('result2.txt', result);
                });
                */
                this.getAeIdByPid('greeting-5192f1cac6e16fa00d000006-20130530T082537316Z',function(err, _aeID){
                    console.log('_aeID=%s', _aeID);
                });
            },
            
            
			
			//JF
			getViewCount: function(youtube_url, viewCount_cb){
				var youtube_path = youtube_url.slice(youtube_url.lastIndexOf("/")+1);
				youtubeInfo.getVideoViewCount(youtube_path, function(viewCount, err){
					if(err) viewCount_cb(null, 0);
					else if(viewCount == null) viewCount_cb(null, 0);
					else viewCount_cb(null, viewCount);
				});
			},
			
			getUGCCount: function(_id, ugcType, cb){
//				var condition = { 'ownerId._id': _id, 'genre': ugcType };
				var condition = { 'ownerId._id': _id};
				UGCs.count(condition, cb);
			},
			getUGCDoohPlayedCount: function(_id, cb){
                var doohPlayedTimes_total = 0;
			    var condition = { 'ownerId._id': _id};
			    UGCs.find(condition).exec(function(err, result){
			        console.log(result.length);
			        for(var i in result){
			            if(result[i].doohPlayedTimes)
			                doohPlayedTimes_total = doohPlayedTimes_total + result[i].doohPlayedTimes
			        }
			        cb(null, doohPlayedTimes_total);
			    });
			},
            kaiser_test: function(){
                this.getUGCDoohPlayedCount('524ad83abc2a7e380a000005',function(err, res){
                    console.log('res=%s', res);
                });
            },
			
			_test: function(){
                var ObjectID = require('mongodb').ObjectID;
                var v_id = ObjectID.createFromHexString("51302b836b8e0e580f000004");
                var owner_id =  ObjectID.createFromHexString("512d849345483ac80d000003");
                var fb_id = "100004712734912_604889539525089";
                var youtube_url = "http://www.youtube.com/embed/CJuffmPIMJ0";
                
                this.getCommentsLikesSharesOnFB( v_id, owner_id, fb_id, youtube_url, function(err, result){
                    if(err){
                        console.log("err: " + JSON.stringify(err));
                    }else{
                        console.log("result: " + JSON.stringify(result));
                    }
                });
				/*
				this.getViewCount('http://www.youtube.com/embed/Y1DdQmx8os0', function(res, err){
					if(res == null) console.log('0');
				});
				*/
            },
        };
    }
    
    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            return uInstance;
        }
    };  // End of Return uInstance
})(); // End of FM.VIDEO;

/*  For TEST. */
//FM.VIDEO.getInstance()._test();
//FM.VIDEO.getInstance()._GZ_test();
//FM.UGC.getInstance().kaiser_test();

module.exports = FM.UGC.getInstance();