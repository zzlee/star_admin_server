var FMDB = require('./db.js'),
    UGCDB = require('./ugc.js'),
    ObjectID = require('mongodb').ObjectID,
    fbMgr = require('./facebook_mgr.js'),
    youtubeInfo = require('./youtube_mgr.js');
    
var FM = {};
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info(str); } : function(str){} ;

FM.MEMBER = (function(){
    var uInstance = null;
    
    
    function constructor(){
        var members = FMDB.getDocModel("member");
        var memberListInfoModel = FMDB.getDocModel("memberListInfo");
        
        return {
        
        /*
         *  Public Members
         */
            addMember: function(pfjson, callback){
                FMDB.createAdoc(members, pfjson, callback);
            },
            
            deleteMember: function(memberID){
                var field = "_id";
                FMDB.getValueOf(members, {"memberID":memberID}, field, function(err, result){
                    if(err) throw err;
                    FMDB.deleteAdoc(members, result[field]);
                    logger.info("deleteMember " + memberID + result[field]);
                });
            },
            
            updateMember: function(oid, newdata, cb){
                
                FMDB.updateAdoc(members, oid, newdata, cb);
            },
            
            isValid: function(memberID, cb){
               
                var field = { "password": 1,
                              "_id": 1
                            };
                FMDB.getValueOf(members, {"memberID":memberID}, field, cb);
            },
            
            authenticate: function(_id, code, cb){
                var condition = {'_id': _id, 'mPhone.code': code};
                FMDB.updateOne(members, condition, {'mPhone.verified': true, 'mPhone.code': null}, {select: 'mPhone.number'}, cb)
            },
            
            isFBValid: function(userID, app, cb){
                
                var field = { "_id":1, "fb": 1, "deviceToken":1, "mPhone":1 };
                FMDB.getValueOf(members, {"fb.userID":userID, "app":app}, field, cb);
            },
            
			getDeviceTokenById: function(oid, cb){
				var field = {"deviceToken": 1, "app": 1};
                FMDB.getValueOf(members, {"_id":oid}, field, cb);
			},
			
            getFBAccessTokenByFBId: function(userID, app, cb){
            
                var field = {"fb.auth": 1, "fb.userName":1 };
                FMDB.getValueOf(members, {"fb.userID":userID, "app":app}, field, cb);
            },
            
            getFBAccessTokenById: function(oid, cb){
            
                var field = {"fb.userID":1, "fb.auth": 1, "fb.userName": 1};
                FMDB.getValueOf(members, {"_id":oid}, field, cb);
            },
            
            listOfMembers: function(condition, fields, options, cb){
                members.find(condition, fields, options, cb);
            },
            
            getObjectId: function(memberID, cb){
                var field = {"_id":1};
                FMDB.getValueOf(members, {"memberID" : memberID}, field, cb);
            },
            
            getProfile: function(memberID, cb){
                FMDB.readAdoc(members, {"memberID":memberID}, cb);
            },
            
            getProfileById: function(oid, cb){
                FMDB.readAdocById(members, oid, cb);
            },
            
            getUserNameAndID: function(user_id, cb){
                //var oid = ObjectID.createFromHexString(user_id);
				var oid = null;
				if('string' === typeof(user_id))
					oid = ObjectID.createFromHexString(user_id);
				else
					oid = user_id;
					
                members.findById(oid, "fb.userName fb.userID", function(err, result){
					if(err){
						logger.error("[members.findById]", err);
						cb(err, null);
					}else{
						cb(err, result);
					}
				});
            },
            
            getUGCsOf: function(memberID, cb){
                var field = {"ugc_ids":1};
                FMDB.getValueOf(members, {"memberID" : memberID}, field, cb);
            },
            
            getTotalCommentsLikesSharesOnFB: function(memberID, userID, app, cb){
                var likes_count = 0,
                    comments_count = 0,
                    shares_count = 0;
                    debugger;
                UGCDB.getUGCListOnFB(memberID, function(err, UGCs){
//                    console.log('UGCs'+UGCs);
                    if(err){
                         cb(err, null);
                         logger.error("[UGCDB.getUGCListOnFB] ", err);
                         
                    }else if(UGCs && UGCs.length > 0){
//                        console.log('---UGCs---'+UGCs);
                        var async = require("async");
                        
                        FM.MEMBER.getInstance().getFBAccessTokenByFBId(userID, app, function(err, fb_auth){
                            if(err){
                                logger.error("[getTotalLikesOnFB] ", err);
                                cb(err, null);

                            }else if(fb_auth){
                                
                                var access_token = fb_auth.fb.auth.accessToken;
                                var async = require("async");
//                                console.log('access_token'+access_token+',userID'+userID);

                                async.parallel([
                                                function(callback){
                                                    var batch = [];
                                                    
                                                    for(var idx in UGCs){
                                                        for(var _idx=0; _idx<UGCs[idx].fb_postId.length;_idx++){
                                                            var fbPostId = UGCs[idx].fb_postId[_idx].postId;
                                                            if(fbPostId){
                                                                if(fbPostId.length == 33){
                                                                    var relative_url = UGCs[idx].fb_postId[_idx].postId + "?fields=comments,likes,shares";
                                                                }else{
                                                                    var relative_url = UGCs[idx].fb_postId[_idx].postId + "?fields=comments,likes,sharedposts";
                                                                }
                                                                if(UGCs[idx].fb_postId[_idx].postId){
                                                                    batch.push( {"method": "GET", "relative_url": relative_url} );
                                                                }                                                                
                                                            }
                                                        }
                                                    }
//                                                    console.dir(batch);
                                                    fbMgr.batchRequestToFB(access_token, null, batch, function(err, result){
                                                        if(err){
                                                            callback(null, {totalLikes: likes_count, totalComments: comments_count, totalShares: shares_count});
                                                        }else if(!result){
                                                            callback(null, {totalLikes: likes_count, totalComments: comments_count, totalShares: shares_count} );
                                                        }else{
                                                            if (result) {
//                                                                console.log('memberID'+memberID);
//                                                                console.log(result);
                                                                for(var i in result){
                                                                    if(!result[i]){
                                                                        
                                                                    }else if(result[i]){
                                                                        if (result[i].comments){
                                                                            comments_count = comments_count + result[i].comments.data.length;
                                                                        }
                                                                        // when count=0, there is no likes object.
                                                                        if (result[i].likes){
                                                                            likes_count = likes_count + result[i].likes.data.length;
                                                                        }
                                                                        if (result[i].shares){
                                                                            shares_count = shares_count + result[i].shares.count;
                                                                        }
                                                                        if (result[i].sharedposts){
                                                                            shares_count = shares_count + result[i].sharedposts.data.length;
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            callback(null, {totalLikes: likes_count, totalComments: comments_count, totalShares: shares_count} );
                                                        }
                                                    });
                                                },
//                                              function(callback){
//                                              var batch = [];

//                                              for(var idx in UGCs){
//                                              var relative_url = UGCs[idx].url.youtube;
//                                              batch.push( {"method": "GET", "relative_url": relative_url} );
//                                              }

//                                              fbMgr.batchRequestToFB(access_token, null, batch, function(err, result){
//                                              if(err){
//                                              //callback(err, null);
//                                              callback(null, {totalShares: shares_count} );
//                                              }else{
//                                              for(var i in result){
//                                              shares_count += (result[i].shares) ? result[i].shares: 0;
//                                              }
//                                              callback(null, {totalShares: shares_count} );
//                                              }
//                                              });
//                                              }
                                                ]
                                , function(err, result){
                                    if(err){
                                        cb(err, null);
                                    }else{
                                        cb(null, result);
                                    }
                                });
                            }else{
                                logger.info("[member.js getCommentsLikesSharesOnFB] fb_auth is null. owner_id="+owner_id);
                                cb(null, [{totalLikes: likes_count, totalComments: comments_count, totalShares: shares_count}]);
                            }
                        });
                        
                        
                    }else{
//                        cb(null, [{totalLikes: likes_count, totalComments: comments_count}, {totalShares: shares_count}]);
                        cb(null, [{totalLikes: likes_count, totalComments: comments_count, totalShares: shares_count}]);
                    }
                });
            },
            
            
            isFBTokenValid: function( req, res ){
                FM_LOG("[isFBTokenValid]");
                if(!req.query || !req.query.fb_id || !req.query._id || ((req.query._id).length!==24)){
                    res.send({error: "Bad Request"});
                    return;
                }
                
                var oid = ObjectID.createFromHexString(req.query._id);
                var fb_id = req.query.fb_id;
                var user_token = null;
                var expiresIn = 0;
                var appGenre = "ondascreen";
                if(req.body.appGenre){
                    appGenre = req.body.appGenre;
                }  
                
                // Do not use "this" here, it's in differenct closure since "async callback".
                FM.MEMBER.getInstance().getFBAccessTokenByFBId( fb_id, appGenre, function(err, result){
                    if(err){
                        res.send({error: "Internal Server Error"});
                        
                    }else if(result.fb){
                        user_token = result.fb.auth.accessToken;
                        var is_valid = null;
                        //console.log("getFBAccessTokenByFBId" + JSON.stringify(result));
                        
                        fbMgr.isTokenValid(user_token, appGenre, function(err, result){
                            if(err){
                                res.send({error: err});
                                
                            }else if(result){
                                expiresIn = result.expires_at;
                                is_valid = result.is_valid;
                                
                                if(expiresIn*1000 - Date.now() < 15*864000*1000){
                                
                                    fbMgr.extendToken(user_token, appGenre, function(err, result){
                                        if(err){
                                            res.send({message: is_valid, });
                                        }else{
                                            FM.MEMBER.getInstance().updateMember(oid, {"fb.auth": result.data}, function(err, result){
                                                if(err)
                                                    logger.error("[updateMember fb.auth error] ", err);
                                                else
                                                    FM_LOG("[updateMember fb.auth result]", result);
                                            });
                                            
                                            res.send({message: is_valid, access_token: result.data.accessToken});
                                        }
                                    });
                                }else{
                                    res.send({message: is_valid});
                                }
                                
                            }else{
                                res.send({message: result.is_valid});
                            }
                        });
                    }else{
                        res.send({error: "get FB Access Token Error"});
                    }
                });
            },
            
            getTotalCommentsLikesShares: function( memberId, cbOfGetTotalCommentsLikesShares ){
                var likes_count = 0,
                comments_count = 0,
                shares_count = 0;
                
                UGCDB.getUGCListByOwnerId(memberId, null, 0, function(err, ugcList){
                    console.log(err, ugcList);
                    if (!err) {
                        
                    }
                    else {
                    }
                });
            
            },
            
            /*    TEST    */
            _test: function(){
                var oid = ObjectID.createFromHexString("512d8df5989cfc2403000002");
                this.getTotalCommentsLikesSharesOnFB( '100000886748741', function(err, result){
                    if(err)
                        console.log("Err: " + JSON.stringify(err));
                    else
                        console.log("Result: " + JSON.stringify(result));
                });
            },
            
            //GZ
			getMemberCount: function( cb){
			    memberListInfoModel.count(cb);
			},
            
            _GZ_test: function(){
            
                this.getMemberCount(function(err, count) {
                    console.log('count= '+count);
                });
            },
			
			//JF
			updateUGCCount: function(_id, cb){
				UGCDB.getUGCCount(_id, "miix", function(err, result){
					var condition = {'_id': _id};
					FMDB.updateOne(members, condition, {'ugc_count': result}, null, cb);
				});
			},
			
			updateDoohTimes: function(_id, cb){
				UGCDB.getUGCCount(_id, "miix_story", function(err, result){
					var condition = {'_id': _id};
					FMDB.updateOne(members, condition, {'doohTimes': result}, null, cb);
				});
			},
			
			getTotalView: function(_id, totalView_cb){
				var UGCs = FMDB.getDocModel("ugc"),
					async = require('async');
				var condition = {'ownerId._id': _id};
				UGCs.find(condition, {}, function(err, result){
					if(result.length == 0) totalView_cb(null, 0);
					else {
						var count = [];
						var asyncStart = function() {
							async.parallel(count , function(err, result) {
								if(err) totalView_cb(err, null);
								else {
									var total = 0;
									for(var i=0; i<result.length; i++) total += result[i];
									totalView_cb(null, total);
								}
							});
						}
						for(var i=0;i<result.length;i++){
							count.push(
								function(callback){
									//console.log(typeof(result[i].url.youtube) + ", " + result[i].url.youtube);
									if((typeof(result[i].url.youtube) != null)&&(typeof(result[i].url.youtube) != 'undefined')) UGCDB.getViewCount(result[i].url.youtube, callback);
									else callback(null, 0);
								}
							);
							if(i == result.length-1) asyncStart();
						}
					}
				});
			},
			
			_JF_test: function(){
				this.getTotalView('50e00d33f04c60040b000006', function(err, res) {
					console.log(res);
				});
			},
        };
    } //    End of Constructor.
    
    return {
        getInstance: function(){
            if(!uInstance){
                uInstance = constructor();
            }
            return uInstance;
        }
    }; //   End of Return uInstance.
})(); // End of FM.MEMBER

/*  For TEST. */
//FM.MEMBER.getInstance()._test();
//FM.MEMBER.getInstance()._JF_test();
//FM.MEMBER.getInstance()._GZ_test();
//FM.MEMBER.getInstance().getTotalCommentsLikesShares("52201b3999f24f9809000006",null);

module.exports = FM.MEMBER.getInstance();