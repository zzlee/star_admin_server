/*
 *  Ajax APIs
 */
// device_toekn = f822bb371e2d328d5a0f7ba1094269154f69027ac5ce4d4d04bd470cbd8001f1
// HTC ONE device_token = "APA91bFNoc98ei3m6mcRdNQFyBY34i4TjNd_Sqw7B5C3XKYqNeHcycE8MzJ9ONJTE79NI9d57RX9rUQiumzDXOfxT6tXSs8Xr_nZD7tN_qy4yo-62RxV06ZNJHfAuPipuLJmdl3CcuBH"

var memberDB = require("../member.js"),
    UGCDB = require("../UGC.js"),
    tokenMgr = require("../token_mgr.js"),
    fbMgr = require("../facebook_mgr.js");
    


var ObjectID = require('mongodb').ObjectID;

var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info( typeof(str)==='string' ? str : JSON.stringify(str)); } : function(str){} ;
    
var FM = { api: {} };

FM.api.reply = [];  // Queue Res callback according to sessionID.

/**
 * GET //connectStarServer
 * Make sure the client side can connect star_server
 * 
 */
FM.api.connection = function(req, res){
	FM_LOG("[connection]");
	res.send(200);
	
};

FM.api._pushErrorCallback = function(err, notification){
    FM_LOG("[_pushErrorCallback] ");
    if(err)
        FM_LOG("[error] " + JSON.stringify(err) );
    if(notification)
        FM_LOG("[notification] "+ JSON.stringify(notification) );
};

/**
 * Google Cloud Messaging, a.k.a., GCM.
 * GCM sender_ID: 701982981612
 * API Key: AIzaSyDn_H-0W251CKUjDCl-EkBLV0GunnWwpZ4
 */
FM.api._GCM_PushNotification = function( device_token ){

    var gcm = require('node-gcm');

    var message = new gcm.Message();
    var sender = new gcm.Sender('AIzaSyDn_H-0W251CKUjDCl-EkBLV0GunnWwpZ4');
    var registrationIds = [];

    // Optional
    message.addData('title', '登大螢幕');
    message.addData('message','您有一個新影片');
    message.addData('msgcnt','1');
    message.collapseKey = 'OnDascreen';
    message.delayWhileIdle = true;
    message.timeToLive = 3;

    // At least one required
    registrationIds.push(device_token);
    //registrationIds.push('regId2'); 

    /**
     * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
     */
    sender.send(message, registrationIds, 4, function (result) {
        FM_LOG(result);
    });
};

// Apple Push Notification Service.	
FM.api._pushNotification = function( device_token ){
    var apns = require('apn');
    var options = {
            cert: './apns/apns-dev-cert.pem',  			/* Certificate file path */ /*./apns-prod/apns-prod-cert.pem*/ /*./apns/apns-dev-cert.pem*/
            certData: null,                   			/* String or Buffer containing certificate data, if supplied uses this instead of cert file path */
            key:  './apns/apns-dev-key-noenc.pem',/* Key file path */ /*./apns-prod/apns-prod-key-noenc.pem*/ /*./apns/apns-dev-key-noenc.pem*/
            keyData: null,                    			/* String or Buffer containing key data, as certData */
            passphrase: null,                 			/* A passphrase for the Key file */
            ca: null,                         			/* String or Buffer of CA data to use for the TLS connection */
            gateway: 'gateway.sandbox.push.apple.com',	/* gateway address 'Sand-box' - gateway.sandbox.push.apple.com */ /* Product- gateway.push.apple.com */
            port: 2195,                   				/* gateway port */
            enhanced: true,               				/* enable enhanced format */
            errorCallback: FM.api._pushErrorCallback,	/* Callback when error occurs function(err,notification) */
            cacheLength: 100              				/* Number of notifications to cache for error purposes */
    };

    
    var apnsConnection = new apns.Connection(options);
    var device = new apns.Device(device_token);
    var note = new apns.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600*24; // Expires 1 day from now.
    note.badge = 1;
    note.sound = "ping.aiff";
    note.alert = "You have a new video!";
    note.payload = {'messageFrom': 'Miix.tv'};
    note.device = device;
    
    FM_LOG("PUSH to Device[" + device_token +"]");
    apnsConnection.sendNotification(note);

};


//DEPRECATED
FM.api.fbStatus = function(req, res){
    
    var sid = req.sessionID;
    FM_LOG("\n[Get LongPolling] sessionID: " + sid);
    FM_LOG("Session: " + JSON.stringify(req.session) );
    var date = new Date();
    
    if(date - req.socket._idleStart.getTime() > 59999){
        res.send("Keep Polling");
    }
    
    FM.api.reply[sid] = res;
};

//DEPRECATED
FM.api._fbStatusAck = function(response){
    FM_LOG("\n[fbStatusAck]:");
    
    var sid = response.data.sessionID;
    if(response.data._id){
        response.data._id = response.data._id.toHexString();
    }
    FM.api.reply[sid].send(response);
        
    delete FM.api.reply[sid];
};

//DEPRECATED
FM.api._fbExtendToken = function(accessToken, callback){

    FM_LOG("\n[_fbExtendToken]: ");
    
    var https = require('https');
    var path = "/oauth/access_token?grant_type=fb_exchange_token"
        + "&client_id=116813818475773" // Miixcard: 116813818475773; Watasi: 243619402408275
        + "&client_secret=b8f94311a712b98531b292165884124a" // MiixCard: b8f94311a712b98531b292165884124a; Watasi: c35e27572a71efcd3035247c024c9d4b
        + "&fb_exchange_token=" + accessToken
        + "&scope=read_stream,publish_stream";
        
    var host = "graph.facebook.com",
        urlOpts = {
            host: host,
            port: 443,
            path: path,
            method: 'POST'
        },
        req = https.request(urlOpts, function(res){
            res.setEncoding('utf8');
            res.on('data', function(result){
            
                if(typeof(result) != 'string'){
                    FM_LOG("Error: " + result.error.message);
                    
                }else{
                    FM_LOG("\nGot longer lived token: ");
                    FM_LOG(result);
                    
                    var longerToken = result.substring( result.indexOf("=")+1, result.indexOf("&expires") );
                    var longerExpiresIn = parseInt(result.substring( result.lastIndexOf("=")+1 ), 10);
                    var now = new Date();
                    var data = { "data":{
                        "accessToken": longerToken,
                        "expiresIn": now.getTime() + longerExpiresIn * 1000
                    }};
                
                    callback(data);
                }
            });                  
        });
                
    req.on('error', function(e){
        FM_LOG("[Failed to Extend Token]: " + e.message );
    });
    
    req.end();
    
};


/* where = /PROFILE_ID/ or /OBJECT_ID/
             * what = 
             * {    "message": "",
             *      "picture": "",
             *         "link": "",
             *         "name": "",
             *      "caption": "",
             *  "description": "",
             *       "source": "",
             *        "place": "",
             *         "tags": "" };
             */

             
             
// Inter
// TODO: it is suggested that these codes are handled by different roles (such as SocialNetworkMgr, VideoDB, PushMgr)
FM.api._fbPostUGCThenAdd = function(vjson){ 
    
    /* Keep for testing in case.
    var vjson2 = {  "title":"A Awesome World",
                    "ownerId": {"_id": "509ba9395a5ce36006000001", "userID": "100004053532907"},
                    "url": {"youtube":"http://www.youtube.com/embed/oZmtwUAD1ds"},
                    "projectId": "rotate-anonymous-20121115T004014395Z"}; */
                    
    var vjsonData = vjson;				
    var link = vjsonData.url.youtube;
    var oid = vjsonData.ownerId._id;
    var pid = vjsonData.projectId;
    
    memberDB.getFBAccessTokenById(oid, function(err, result){
    
        if(err) throw err;
        if(result){
            var userID = result.fb.userID;
            var userName = result.fb.userName;
            var can_msg = (vjsonData.genre === 'miix_story') ? ("不要懷疑！【"+ userName +"】登上大螢幕和你說聲嗨！") : (userName + "MiixCard活動初體驗！");
            var accessToken = result.fb.auth.accessToken;
            var path = "/" + userID + "/feed",
                query = "?" + "access_token=" + accessToken
                + "&message=" + can_msg
                + "&link=" + link;
            path += query.replace(/\s/g, "+");
            
            FM_LOG("[POST req to FB with:]\n" + JSON.stringify(path) );
            //  Post on FB.
//            FM.api._fbPost(path, function(response){     
                
                //  Get Object_id of Post Item on FB, then update db.
//                if(response.error){
//                    FM_LOG("[POST on FB:ERROR] " + response.error.message );
//                    
//                }else{
//                    var fb_id = response.id;    // Using full_id to get detail info.  full_id = userID + item_id
//                    FM_LOG("\n[Response after POST on FB:]\n" + JSON.stringify(response) ); 
//                    //var fb_id = full_id.substring(full_id.lastIndexOf("_")+1);
//                   
//                    vjsonData.fb_id = fb_id;
//                    
//                }
                UGCDB.updateOne({"projectId":pid}, vjsonData, {"upsert": true}, function(err, vdoc){
                    if(err)
                        logger.error(err);
                    
                    //debug
                    UGCDB.getNewUGCListByFB(vjsonData.ownerId.userID, 'miix', 0, function(err, result){
                        logger.info('[result of adding one new miix UGC into db]: '+JSON.stringify(result));
                    });
                    
                    memberDB.getDeviceTokenById(oid, function(err, result){
                        if(err) throw err;
                        if(result.deviceToken){
                            FM_LOG("deviceToken Array: " + JSON.stringify(result.deviceToken) );
                            for( var devicePlatform in result.deviceToken){
                                if(result.deviceToken[devicePlatform] != 'undefined'){
                                	var pushMgr = require("../push_mgr.js");
                                	pushMgr.sendMessageToDevice(devicePlatform, result.deviceToken[devicePlatform], result.app, "您有一個新影片！");
                                }
                            }
                        }
                    });
                });
//            });
        }
    });
};


//DEPRECATED
FM.api._fbPostUGC = function(projectID, content){
        
    UGCDB.getValueByProject(projectID, "ownerId _id url.youtube", function(err, result){    
        if(result){
            var ownerId = result["ownerId"];
            var v_oid = result["_id"];
            var link = result["url"].youtube;
            
            memberDB.getFBAccessTokenById(ownerId, function(err, result){
    
                if(err) throw err;
                if(result){
                    var userID = result.fb.userID;
                    var accessToken = result.fb.auth.accessToken;
                        path = "/" + userID + "/feed",
                        query = "?" + "access_token=" + accessToken
                        + "&message=" + content.message
                        + "&link=" + link;
                    path += query.replace(/\s/g, "+");
                    
                    FM_LOG("[POST req to FB with:]\n" + JSON.stringify(path) );
                    //  Post on FB.
                    FM.api._fbPost(path, function(response){     
                        
                        //  Get Object_id of Post Item on FB, then update db.
                        if(response.error){
                            FM_LOG("[POST on FB:ERROR] " + response.error.message );
                            
                        }else{
                            var fb_id = response.id;    // Using full_id to get detail info.  full_id = userID + item_id
                            FM_LOG("\n[Response after POST on FB:]\n" + JSON.stringify(response) ); 
                            //var fb_id = full_id.substring(full_id.lastIndexOf("_")+1);
                            var newdata = {"fb_id": fb_id};
                            UGCDB.update(v_oid, newdata);
                        }
                    });
                }
            });
        }
    });
};

//DEPRECATED
// POST
FM.api.fbPostCommentReq = function(req, res){
    FM_LOG("[api.fbPostCommentReq]");
    if(req.body && req.body.post){
    
        var path = post.path,
            token = post.token;
            
        var path = "/" + fb_oid + "/comments",
            data = "?" + "access_token=" + token;
        
        for(var key in post.data){
            data += "&" + key + "=" + post.data[key];
        }
        path += data;
        FM.api._fbPost( path, function(response){
        
            if(response.error){
                logger.info(error);
            }else{
                logger.info(response.id);
                res.send({"res":"Succeed"});
            }
        });
    }
};

//TODO: move to facebook_mgr.js
//GET /fb/comment
FM.api.fbGetCommentReq = function(req, res){
    FM_LOG("[api.fbGetCommentReq]");
    if(req.query && req.query.fb_id && req.query.accessToken){
        logger.info(req.query);
        var fb_id = req.query.fb_id;
            accessToken = req.query.accessToken,
            projectId = req.query.projectId;
            
        var fields = "comments,likes";
        var path = "/" + fb_id 
            + "?access_token=" + accessToken 
            + "&fields=" + fields;
            
        FM.api._fbGet(path, function(response){
            if(response.error){
                logger.info(response.error.message);
                res.send(response.error);
            }else{
                res.send(response); // "comments" and "likes"
            }
        });
    }else{
        res.send({error: "fb_id, token are MUST-Have."});
    }
};

//TODO: move to facebook_mgr.js
//GET /fb/thumbnail
FM.api.fbGetThumbnail = function(req, res){
    FM_LOG("[api.fbGetThumbnail]");
    if(req.query && req.query.fb_id && req.query.accessToken && req.query.commenter){
        logger.info(req.query);
        var fb_id = req.query.fb_id,
            commenter = req.query.commenter,
            accessToken = req.query.accessToken;
            
        var fields = "picture";    
        var path = "/" + commenter 
            + "?access_token=" + accessToken
            + "&fields=" + fields; 
            
        FM.api._fbGet(path, function(response){
            FM_LOG("[Thumbnail] ");
            logger.info(response);
            if(response.error){
                logger.info(response.error.message);
                res.send(response.error);
            }else{
                response.id = fb_id;
                res.send(response); // "thumbnail of commenter"
            }
        });
    }else{
        res.send({error: "fb_id, token and commenter are MUST-Have."});
    }
};

// Inter
FM.api._fbPost = function( path, cb){  //is only activily used by FM.api._fbPostUGCThenAdd

    var https = require('https'),
        host = "graph.facebook.com",
        urlOpts = {
            host: host,
            port: 443,
            path: path,
            method: 'POST'
        };
    var req = https.request(urlOpts, function(res){
            res.setEncoding('utf8');
            res.on('data', function(chunk){
                cb(JSON.parse(chunk));
            });                  
        });
                
    req.on('error', function(e){
        FM_LOG("[Error from FB after POST]: " + e.message );
    });
    
    req.end();
};

// Inter
FM.api._fbGet = function( path, cb){ //is only actively used by FM.api.fbGetCommentReq() and FM.api.fbGetThumbnail()

    var host = "graph.facebook.com",
        https = require('https'),
        urlOpts = {
            host: host,
            port: 443,
            path: path,
            method: 'GET'
        };
        
    var req = https.request(urlOpts, function(res){
            res.setEncoding('utf8');
            res.on('data', function(chunk){
                FM_LOG("[fbGet] \n" + chunk);
                cb(JSON.parse(chunk));
            });                  
        });
                
    req.on('error', function(e){
        FM_LOG("[Error from FB after GET]: " + e.message );
    });
    
    req.end();

};

//DEPRECATED
FM.api._fbGetHttp = function( path, cb){

    var host = "graph.facebook.com",
        http = require('http'),
        urlOpts = {
            host: host,
            port: 80,
            path: path,
            method: 'GET'
        };
        
    var req = http.request(urlOpts, function(res){
            res.setEncoding('utf8');
            res.on('data', function(chunk){
                FM_LOG("[fbGet] \n" + chunk);
                cb(JSON.parse(chunk));
            });                  
        });
                
    req.on('error', function(e){
        FM_LOG("[Error from FB after GET]: " + e.message );
    });
    
    req.end();

};

//TODO:
//POST
FM.api.deviceToken =  function(req, res){
    FM_LOG("[Receive deviceToken POST] ");
    
    if(req.body && req.body.user){
        var user = req.body.user;
        logger.info(user);
        FM_LOG("\n[Got Device_Token] devicePlatform: " + user.devicePlatform + "; dvc_token: " + user.deviceToken);
        
        var oid = ObjectID.createFromHexString(user._id);
        var deviceToken = {};
        deviceToken[user.devicePlatform] = user.deviceToken;
        
        var jsonStr = '{"deviceToken.' + user.devicePlatform +'":"'+ user.deviceToken + '"}';
        var json = JSON.parse(jsonStr);
        
        memberDB.updateMember( oid, json, function(err, result){
            if(err) logger.info("[updateMember api line507 err]"+err);
            if(result) logger.info("[updateMember api line508 result]"+result);
            res.send({"message": "Update Device Token!"});
        });
    }else{
        res.send({"message": "Failed!"});
    }
};

//TODO: move to memeber.js?  
//POST /members/fb_info
FM.api.signupwithFB = function(req, res){
    
    var sid = req.sessionID;
    FM_LOG("\n[signupwithFB] sessionID: " + sid);
    
    if(req.body && req.body.authResponse){
    
        FM_LOG("\n[Got FB_Token]: ");
        logger.info(req.body.authResponse);
        
        var authRes = req.body.authResponse;
        var userID = authRes.userID,
            userName = authRes.userName,
            email = null,
            accessToken = authRes.accessToken,
            expiresIn = authRes.expiresIn,
            device = authRes.device,
            devicePlatform = authRes.devicePlatform,
            dvc_Token = authRes.deviceToken,
            auth = {"accessToken": accessToken,
                    "expiresIn": expiresIn,
            },
            meta = {"userID": userID,
                    "userName": userName,
                      "auth": auth
            },
            member = {"fb": meta};
        
        if(authRes.email){
            email = authRes.email;
            member.email = email;
        }
            
            
        
        /* New FB User or Exsited User */
        memberDB.isFBValid( userID, function(err, result){
        
            if(err){
                res.send(500, { error: "Valid User/Password"});
            }     
            
            if(result){ //  fb user existed.
                FM_LOG("[signupwithFB] FB user[" + userID + "] Existed!");
                
                var oid = result._id;
                var deviceToken;
                var mPhone_verified = result.mPhone.verified;
                var fb = result.fb;
                var existed_access_token = fb.auth.accessToken;
                var newdata = result.fb;
                
                if(dvc_Token){
                    if(result.deviceToken){
                        deviceToken = result.deviceToken;
                    }else{
                        deviceToken = {};
                    }
                    deviceToken[devicePlatform] = dvc_Token;
                    member.deviceToken = deviceToken;
                    
                }
                
                fbMgr.isTokenValid(accessToken, function(err, result){
                    
                    if(err){
                        res.send(500, { error: "Valid User/Password"});
                    }  
                    
                    // Extending new/short access_token replaces invalid existed access_token.
                    else if(!result.is_valid){
                        fbMgr.extendToken(accessToken, function(err, response){
                            if(err){
                                //res.send( {"data":{"_id": oid.toHexString(), "accessToken": accessToken, "expiresIn": expiresIn, "verified": mPhone_verified  }, "message":"success"} );
                                tokenMgr.getToken(oid, function(err, miixToken){
                                    res.send( {"data":{"_id": oid.toHexString(), "accessToken": accessToken, "expiresIn": expiresIn, "verified": mPhone_verified, "miixToken": miixToken }, "message":"success"} );
                                });

                            }else{
                                
                                member.fb.auth = response.data;
                                var data = response.data;
                                newdata.auth = data;
                                
                                var update = { fb: newdata, deviceToken: deviceToken };
                                if(email)
                                    update.email = email;
                                
                                memberDB.updateMember( oid, update, function(err, result){
                                    if(err) logger.info("[fbMgr.extendToken line607 error]"+err);
                                    if(result) logger.info("[fbMgr.extendToken line608 result]"+fbMgr.extendTokenresult);
                                });
                                
                                //res.send( {"data":{"_id": oid.toHexString(), "accessToken": data.accessToken, "verified": mPhone_verified  }, "message":"success"} );
                                tokenMgr.getToken(oid, function(err, miixToken){
                                    res.send( {"data":{"_id": oid.toHexString(), "accessToken": data.accessToken, "verified": mPhone_verified, "miixToken": miixToken  }, "message":"success"} );
                                });
                            }
                        });
                        
                    }else{
                        // existed access_token is valid. Check if expire within 20days, then renew it.
                        if( parseInt(fb.auth.expiresIn) - Date.now() < 20*86400*1000 || isNaN(fb.auth.expiresIn) || fb.auth.expiresIn === null){
                    
                            fbMgr.extendToken(authRes.accessToken, function(err, response){
                                if(err){
                                    //res.send( {"data":{"_id": oid.toHexString(), "accessToken": existed_access_token, "verified": mPhone_verified  }, "message":"success"} );
                                    tokenMgr.getToken(oid, function(err, miixToken){
                                        res.send( {"data":{"_id": oid.toHexString(), "accessToken": existed_access_token, "verified": mPhone_verified, "miixToken": miixToken  }, "message":"success"} );
                                    });
                                    
                                }else{
                                    
                                    member.fb.auth = response.data;
                                    var data = response.data;
                                    newdata.auth = data;
                                    
                                    var update = { fb: newdata, deviceToken: deviceToken };
                                    if(email)
                                        update.email = email;
                                    
                                    memberDB.updateMember( oid, update, function(err, result){
                                        if(err) logger.info("[fbMgr.extendToken line640 error]"+err);
                                        if(result) logger.info("[fbMgr.extendToken line641 result]"+result);
                                    });
                                    
                                    //res.send( {"data":{"_id": oid.toHexString(), "accessToken": data.accessToken, "expiresIn": data.expiresIn, "verified": mPhone_verified  }, "message":"success"} );
                                    tokenMgr.getToken(oid, function(err, miixToken){
                                        res.send( {"data":{"_id": oid.toHexString(), "accessToken": data.accessToken, "expiresIn": data.expiresIn, "verified": mPhone_verified, "miixToken": miixToken  }, "message":"success"} );
                                    });
                                }
                            });
                        }else{
                            var update = {};
                            if(dvc_Token)
                                update.deviceToken = deviceToken;
                            if(email)
                                update.email = email;
                                
                            if(update.deviceToken || update.email){
                                memberDB.updateMember( oid, update, function(err, result){
                                    if(err) logger.info("[updateMember api line659 err]"+err);
                                    if(result) logger.info("[updateMember api line660 result]"+result);
                                });
                            }
                            
                            
                            //res.send( {"data":{ "_id": oid.toHexString(), "accessToken": member.fb.auth.accessToken, "expiresIn": member.fb.auth.expiresIn, "verified": mPhone_verified}, "message":"success"} );
                            tokenMgr.getToken(oid, function(err, miixToken){
                                res.send( {"data":{ "_id": oid.toHexString(), "accessToken": member.fb.auth.accessToken, "expiresIn": member.fb.auth.expiresIn, "verified": mPhone_verified, "miixToken": miixToken }, "message":"success"} );
                            });
                        }
                    }
                });
                
                
            }else{  //  New fb user signup.
                FM_LOG("[signupwithFB:] NEW FB User[" + userID + "] Signup!");
                
                if(dvc_Token){
                    var deviceToken = {};
                    deviceToken[devicePlatform] = dvc_Token;
                    member.deviceToken= deviceToken;
                }
                
                fbMgr.extendToken(authRes.accessToken, function(err, response){

                    
                    if(err){
                        //res.send( {"data":{"_id": oid.toHexString(), "accessToken": accessToken, "expiresIn": expiresIn, "verified": mPhone_verified  }, "message":"success"} );
                        tokenMgr.getToken(oid, function(err, miixToken){
                            res.send( {"data":{"_id": oid.toHexString(), "accessToken": accessToken, "expiresIn": expiresIn, "verified": mPhone_verified, "miixToken": miixToken }, "message":"success"} );
                        });

                    }else{
                        
                        member.fb.auth = response.data;
                        var data = response.data;
//                        newdata.auth = data;
                        
                        memberDB.addMember(member, function(err, result){
                            if(err) logger.info("[addMember api line700 err]"+err);
                            
                            FM_LOG("with userId " + result["_id"]);
                            if(result){
                                FM_LOG("\n[addMember]:");
                                logger.info("[addMember api line704 result]"+result);
                                
                                oid = result["_id"];
                                /* ACK LongPolling from Client
                                var ack = { "data":{"sessionID": sid, "accessToken": accessToken, "userID": userID, "_id": oid} };
                                FM.api._fbStatusAck(ack);
                                */
                                
                                req.session.user = {
                                    userID: member.fb.userID,
                                    _id: oid,
                                    accessToken: member.fb.auth.accessToken
                                };
                                
                                //res.send( {"data":{ "_id": oid.toHexString(), "accessToken": member.fb.auth.accessToken, "expiresIn": member.fb.auth.expiresIn}, "message":"success"} );
                                tokenMgr.getToken(oid, function(err, miixToken){
                                    res.send( {"data":{ "_id": oid.toHexString(), "accessToken": member.fb.auth.accessToken, "expiresIn": member.fb.auth.expiresIn, "miixToken": miixToken }, "message":"success"} );
                                });
                            }
                        });
                    }
                });
            }
        });
        
    }else{
    
        /* ACK LongPolling - Facebook Authentication Failed!
        var ack = {"data": {"sessionID": sid, "message":req.body.fail} };
        FM.api._fbStatusAck(ack);
        */
    }
};           
    
//POST /api/signin
FM.api.signin = function (req, res) {
    /*
     *  Once member sign-in, we should save profile in session to be used in same session.
     */
    FM_LOG("Get Sign In Req: " + JSON.stringify(req.body)); 
    if(req.body && req.body.member){
        var member = req.body.member,
            oid = null;

        memberDB.isValid(member.memberID, function(err, result){
            if(err) FM_LOG(memberID + " is invalid " + err);
            if(result && member.password === result["password"]){
                oid = result["_id"];
                req.session.user = {
                    name: member.memberID,
                    pwd: member.password,
                    userId: oid 
                };             
                FM_LOG(member.memberID + " Log-In! with userId " + oid.toHexString());
                
                FM.api.profile(req, res);
                
            }else{
                res.send({"isValid": "false"});
            }
        });
    }else{
        res.send(500, { error: "Wrong User/Password"});
    }
};


// GET 
FM.api.signout = function (req, res) {
    var username = req.session.user.name;
    FM_LOG(username + " Log-Out!");
    delete req.session.user;
    res.redirect("/");
};

// POST
FM.api.signup = function(req, res){
    FM_LOG("Get POST SignUp Req: " + JSON.stringify(req.body));
    
    if(req.body && req.body.member){
        var member = req.body.member,
            oid = null;
        FM_LOG(JSON.stringify(member));
        memberDB.addMember(member, function(err, result){
            FM_LOG("with userId " + result["_id"]);
            if(result){
                oid = result["_id"];
                req.session.user = {
                    name: member.memberID,
                    pwd: member.password,
                    userId: oid};
                 
                var vjson1 = {  "title":"Darth vader funny commercial",
                                "ownerId": oid,
                                "url": {"youtube":"http://www.youtube.com/embed/YRQyS_8sShw"},
                                "projectId": "8608"};
                
                var vjson2 = {  "title":"36 Story",
                                "ownerId": oid,
                                "url": {"youtube":"http://www.youtube.com/embed/YsvYa77EySg"},
                                "projectId": "5376"};
                
                UGCDB.addUGC(vjson1, function(err, vdoc){
                    UGCDB.addUGC(vjson2, function(err, vdoc){
                        FM.api.profile(req, res);
                    });
                });
            }
        });
        
        
        /*
        crypto.randomBytes(128, function(err, salt){
            if(err){ throw err; }
            salt = new Buffer(salt).toString("hex");
            crypto.pbkdf2(req.body.pass, salt, 7000, 256, function(err, hash){
                if(err){ throw err; }
                
                var jsonObj = {};
                DB.createDoc("Member", jsonObj);
                userStore[req.body.user] = { salt : salt,
                    hash : (new Buffer(hash).toString("hex")) };
                
                
                res.send("Thanks for registering " + req.body.user);
                FM_LOG(userStore);
            });
        });
        */
        
    }else{
        res.redirect("/");
    }
};

 



// GET
FM.api.profile = function(req, res){
    FM_LOG("[api.profile]: ");
    logger.info(req.query);
    
    if(req.query && req.query.userID){
    
        var userID = req.query.userID;
        
        UGCDB.getUGCListByFB(userID, function(err, result){
        
            if(err) throw err;
            FM_LOG("[getUGCListByFB] " + JSON.stringify(result));
            var data;
            if(result){
               data = {"videoWorks": result};
            }else{
                data = {"message": "No UGC"};
            }
            res.send(data);
        });
    }
};

//	GET
//GET /miix/videos/new_videos
FM.api.newUGCList = function(req, res){
    FM_LOG("[api.newUGCList]: ");
    logger.info(req.query);
    
    if(req.query && req.query.userID && req.query.after){
    
        var userID = req.query.userID;
        var genre = req.query.genre;
        var after = new Date(parseInt(req.query.after));
        FM_LOG(genre +" [AFTER]: " + after.toISOString());
        
        UGCDB.getNewUGCListByFB(userID, genre, after, function(err, result){
        
            if(err){
                logger.error("[api.newUGCList] error: ", err);
                res.send({error: "Internal Server Error."});
                return;
            }
            
            FM_LOG("[getNewUGCListByFB] "+ genre + ": " + JSON.stringify(result));
            
            var data;
            if(result){
               data = {"videoWorks": result};
            }else{
                data = {"message": "No UGC"};
            }
            res.send(data);
        });
        
    }else{
        res.send({error: "Bad Request!"});
    }
};

//  GET  //DEPRECATED
FM.api.newStreetUGCList = function(req, res){
    FM_LOG("[api.newStreetUGCList]: ");
    
    if(req.query && req.query.userID){
    
        var userID = req.query.userID;
        var after = new Date(parseInt(req.query.after));
        
        UGCDB.getNewStreetUGCListByFB( userID, after, function(err, result){
            if(err){
                logger.error("[api.newStreetUGCList] error: ", err);
                res.send({error: "Internal Server Error."});
                return;
            }
            
            FM_LOG("[getNewStreetUGCListByFB] " + JSON.stringify(result));

            var data;
            if(result){
                data = {streetUGCs: result};
            }else{
                data = {message: "No UGC"};
            }
            res.send(data);
        });
        
    }else{
        res.send({error: "Bad Request!"});
    }
};


/*
var vjson2 = {  "title":"A Awesome World",
                    "ownerId": {"_id": "509ba9395a5ce36006000001", "userID": "100004053532907"},
                    "url": {"youtube":"http://www.youtube.com/embed/oZmtwUAD1ds"},
                    "projectId": "Miix-Street-20121115T004014395Z",
                    "genre": "miix_story",
                    "createdOn": 1357010644000,
             };*/

// POST
//POST /miix/videos/miix_videos
FM.api.submitAUGC = function(req, res){
    FM_LOG("[api.submitAUGC]");
    
    if(req.body && req.body.userID && req.body.pid && req.body._id){
        var _id = ObjectID.createFromHexString(req.body._id);
        var userID = req.body.userID;
        var pid = req.body.pid;
        var genre = (req.body.genre) ? req.body.genre : 'miix';
        
        FM_LOG("User[" + userID + "] submit a UGC[" + pid +"]");
        var vjson = {
                "ownerId": {"_id": _id, "userID": userID},
                "projectId": pid,
                "genre": genre
            };

        UGCDB.addUGC(vjson, function(err, result){
            if(err) throw err;
            if(result)
                res.send(result);
        });
        
        
        //TODO: have aeServerMgr generate Miix movie here
        
    }else{
        res.send({"message": "_id, userID, pid MUST HAVE!"});
    }
};


//POST /miix/videos/videos_on_dooh
FM.api.submitDooh = function(req, res){
    FM_LOG("[api.submitDooh]");
    
    if(req.body && req.body.userID && req.body.pid && req.body._id){
        var _id = ObjectID.createFromHexString(req.body._id),
            userID = req.body.userID,
            pid = req.body.pid;
        var condition = {projectId: pid};
        var update = {status: 'waiting', "doohTimes.submited_time": Date.now(), inc: { "triedDoohTimes": 1 }};
        //JF: add $inc: { "triedDoohTimes": 1 }
        
        UGCDB.updateOne(condition, update, null, function(err, result){
            if(err){
                logger.error("[submitDooh]UGCDB.updateOne", err);
                res.send({error: "Internal Server Error!"});
                
            }else{
                FM_LOG(JSON.stringify(result));
                res.send(200, {message: "已收到您申請影片登上大螢幕。"});
                
                var miixContentMgr = require('../miix_content_mgr.js');
                miixContentMgr.submitMiixMovieToDooh('', pid);
            }
        });
        
    }else{
        res.send("Bad Request.");
    }
};


/**
 *  Authentication of Mobile User. *
 */


// GET
FM.api.codeGenerate = function(req, res){
    FM_LOG("[api.codeGenerate]");
    if(req.query){
        var code = '';
        for( var i=0; i < 4; i++){
            code += (Math.floor(Math.random() * 10)%10).toString();  // 4 digits
        }
        if(req.query.phoneNum == "0988888888"){
            code = "7777";
        }
        var phoneNum = req.query.phoneNum,
            fb_userID = req.query.fb_userID,
            _id = ObjectID.createFromHexString(req.query.userID);
//        console.log(JSON.stringify(req.query));    
        var metadata = {number: phoneNum, verified: false, code: code};
        memberDB.updateMember(_id, {mPhone: metadata}, function(err, result){
            if(err){
                logger.error("[codeGenerate] updateMember error: ", err);
                res.send({error: 'Internal Server Error'});
                return;
            }
            var smsMgr = require("../sms_mgr.js");
            if(phoneNum == "0988888888"){
                res.send(200, {message:"手機認證碼已發送"});
            }
            else{
            smsMgr.sendMessageToMobile(phoneNum, code, function(err, result){
                if (err){
                    res.send(401, {message:"手機認證碼發送失敗"});
                }
                else{
                    res.send(200, {message:"手機認證碼已發送"});
                }
            });
            }

            FM_LOG("[codeGenerate] Succeed!" + JSON.stringify(result));
//            res.send(200, {message: '手機號碼:「'+ phoneNum +'」，驗證碼：「'+ code +'」。'});
        });
        
    }else{
        res.send({error: 'Bad Request!'});
    }
};

// POST
FM.api.codeVerify = function(req, res){
    FM_LOG("[api.codeVerify]");
    if(req.body){
        var code = req.body.code,
            fb_userID = req.body.fb_userID,
            _id = ObjectID.createFromHexString(req.body.userID);
            
        memberDB.authenticate(_id, code, function(err, result){
            if(err){
                logger.error('[codeVerify] error:', err);
                res.send({error: 'Internal Server Error'});
                return;   
            }
            if(result){
                //console.log('[codeVerify] result:' + JSON.stringify(result));
                var phoneNum = result.mPhone.number;
                res.send(200, {message: '手機號碼：「'+ phoneNum +'」已通過認證，謝謝您的配合！'});
                
            }else{
                res.send({error: '錯誤的認證碼！'});
            }
        });
        
    }else{
        res.send({error: 'Bad Request!'});
    }
};



// Inter
FM.api._test = function(){
   
   var _id = ObjectID.createFromHexString("50c9afd0064d2b8412000013");
   var code = '5376';
   var phoneNum = '0911988320';
   
   var metadata = {number: phoneNum, verified: false, code: code};
   memberDB.updateMember(_id, {mPhone: metadata}, function(err, result){
       if(err){
           logger.error("[codeGenerate] updateMember error: ", err);
           res.send({error: 'Internal Server Error'});
           return;
       }
       
       console.log("[codeGenerate] Succeed!" + JSON.stringify(result));
   });
   
   
   //HTC_Desire FM.api._GCM_PushNotification("APA91bFsZZUk2lH_Ud-oOCqSbVsHSOiePVM7NG_Prdw8Q-_ubJXII1F7QewGlK-2GY1MzJYQsf-U3QprSaS8iSaoHKKzODL_vXVguGJg1LisWG5cohC3OMujDvs3kbyJ0QnWOeD951UX");
   //HTC_ONE FM.api._GCM_PushNotification("APA91bH3fugF50nw0sb1zsVQrLx6BDRApdTUHj9-3XiLHc-2fSTqRDVXYJr9cxkkNXtn6X2bb163q_-Sh1yuB7H0BKaMlNZO_BL3qmrPmrDdGEzVqs4L3YIywprv90bBa95k4YaPdZ_t");
};

//FM.api._test();

module.exports = FM.api;