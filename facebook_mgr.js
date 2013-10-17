
var FM = {};
var DEBUG = true,
    FM_LOG = (DEBUG) ? function(str){ logger.info(str); } : function(str){} ;


FM.facebookMgr = (function(){
    var uInstance = null;
    var request = require("request");
    var fb_url = 'https://graph.facebook.com';
   /** for postMessage();*/
    // this token will expire in 1 hour,u should go to graph tool to get new one.  
    //this is User Token,not app token
    var test_token = 
    	"CAABqPdYntP0BAMlhDdqmJloWQvcTmIhKVtJN7kzsVxs0Ymsmo7OCVhZCmINNjcIHrchNbAbItBmRlofaO6605u7GQ9NjV7W9CEQp1CKt7fSHrw93ZBc6tkrQDofAXZBr6qnr5hkAHjxrnhb6YRROUFCZAqoCYnYZD";
    var my_message="hello!"
    var s_link="www.google.com"
    
    /**  for miix.tv @ AWS */
//    var app_access_token = "116813818475773|d9EXxXNwTt2eCbSkIWYs9dJv-N0", 
//        app_id = "116813818475773",
//        app_secret = "b8f94311a712b98531b292165884124a";
        
        //for OnDaScreen        
        var app_access_token_OnDaScreen = "430008873778732|99f7c401c399ce8caaa90cc79a29f795", 
        app_id_OnDaScreen = "430008873778732",
        app_secret_OnDaScreen = "99f7c401c399ce8caaa90cc79a29f795";
        
        // for WowTaipeiarena 
        var app_access_token_WowTaipeiarena = "154438938098663|1ee57dc3fd8c7596781bbd1c986bf6b0", 
        app_id_WowTaipeiarena = "154438938098663",
        app_secret_WowTaipeiarena = "1ee57dc3fd8c7596781bbd1c986bf6b0";
  
    
    /** for feltmeng.idv.tw @ Local */
    /*
    var app_access_token = "243619402408275|HA4e-5_fg95gUcT8sAviXHx2SHg",
        app_id = "243619402408275",
        app_secret = "c35e27572a71efcd3035247c024c9d4b";
    */
    
    
    function constructor(){
        
        return {
            
            /*
             *  REF: https://developers.facebook.com/docs/reference/api/batch/
             */
            batchRequestToFB: function( token, path, data, cb){
                var qs;
                
                if(!token){
                    cb( {error: "access_token is necessary."}, null);
                    return;
                }
                
				//console.log("data"+ JSON.stringify(data));
                qs = {'access_token':token, 'batch':JSON.stringify(data) };
                    
                request({
                    method: 'POST',
                    uri: 'https://graph.facebook.com' + ((path)? path: ''),
                    qs: qs,
                    json: true,
                    //body: {'batch': JSON.stringify(data),},
                    
                }, function(error, response, body){
                    
                    if(error){
                        console.logger("[postOnFB] ", error);
                        cb(error, null);
                        
//                    }else if(body.error){
//						cb(body.error, null);
					}else{
                        var result = [];
                        //console.log("BODY: " + JSON.stringify(body));
                        for(var i in body){
                            if(body[i]){
                                if(typeof(body[i].body) === 'string'){
									var sub_body = JSON.parse(body[i].body);
									//console.log("sub_body" + sub_body.error);
									if(!sub_body.error)
										result.push(sub_body);
                                }else{

									if(!body[i].error)
										result.push(body[i].body);
								}
                            }
                        }
                        
                        cb(null, result);
                    }
                });
            },
            
            /*
             * REF: http://developers.facebook.com/docs/howtos/login/debugging-access-tokens/
             */
            isTokenValid: function(user_token, app, cb){
                var qs = null;
                var path = "/debug_token";
                
                if(!user_token){
                    cb( {error: "access_token is necessary."}, null);
                    return;
                }
//                if(app == "wowtaipeiarena"){    
//                    qs = { 'input_token': user_token, 'access_token': app_access_token_WowTaipeiarena };
//                }else{
//                    qs = { 'input_token': user_token, 'access_token': app_access_token_OnDaScreen };
//                }
                switch(app){
                case "wowtaipeiarena":
                    qs = { 'input_token': user_token, 'access_token': app_access_token_WowTaipeiarena };
                    break;
                default:
                    qs = { 'input_token': user_token, 'access_token': app_access_token_OnDaScreen };
                    break;
                }
//                console.log('user_token='+user_token);
                    
                request({
                    method: 'GET',
                    uri:  fb_url + path,
                    qs: qs,
                    json: true,
                    //body: {'batch': isTokenValiddata),},
                    
                }, function(error, response, body){
                    if(error){
                        logger.error("[isTokenValid err] ", JSON.stringify(error));
                        cb(error, null);
                    }else if(body){
                        if(body.data){
                            if(body.error){
                                logger.error("[isTokenValid] error="+JSON.stringify(body.error));
                                cb("get incorrect response from facebook", null);
                            }else if(body.data.error){
                                logger.error("[isTokenValid] error="+JSON.stringify(body.data));
                                cb("get incorrect response from facebook", null);
                            }else if(body.data.is_valid && body.data.expires_at){
                                FM_LOG("[isTokenValid ok] " + JSON.stringify(body.data)+"user_token"+user_token);
                                cb(null, { is_valid: body.data.is_valid, expires_at: body.data.expires_at });
                            }else{
                                logger.error("[isTokenValid] error=","get incorrect response from facebook");
                                cb("get incorrect response from facebook", null);
                            }
                        }else{
                            logger.error("[isTokenValid] error=","get incorrect response from facebook");
                            cb("get incorrect response from facebook", null);
                        }
                    }else{
                        logger.error("[isTokenValid] error=","get incorrect response from facebook");
                        cb("get incorrect response from facebook", null);
                    }
                });
            },
            
            // Old-school, keep a while until new one has no problem.
            _extendToken: function(accessToken, callback){

                FM_LOG("[ExtendToken]: ");
                
                var https = require('https');
                switch(app){
                case "wowtaipeiarena":
                    var path = "/oauth/access_token?grant_type=fb_exchange_token"
                        + "&client_id=" +  app_id
                        + "&client_secret=" + app_secret
                        + "&fb_exchange_token=" + accessToken
                        + "&scope=email,read_stream,publish_stream";
                    break;
                default:
                    var path = "/oauth/access_token?grant_type=fb_exchange_token"
                        + "&client_id=" +  app_id_OnDaScreen
                        + "&client_secret=" + app_secret_OnDaScreen
                        + "&fb_exchange_token=" + accessToken
                        + "&scope=email,read_stream,publish_stream";
                    break;
                }
                var path = "/oauth/access_token?grant_type=fb_exchange_token"
                    + "&client_id=" +  app_id
                    + "&client_secret=" + app_secret
                    + "&fb_exchange_token=" + accessToken
                    + "&scope=email,read_stream,publish_stream";
                    
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
                                FM_LOG("[Got longer lived token]: ");
                                FM_LOG(result);
                                
                                var longerToken = result.substring( result.indexOf("=")+1, result.indexOf("&expires") );
                                var longerExpiresIn = parseInt(result.substring( result.lastIndexOf("=")+1 ), 10);
                                var now = new Date();
                                var data = { "data":{
                                    "accessToken": longerToken,
                                    "expiresIn": now.getTime() + longerExpiresIn * 1000
                                }};
                            
                                callback(null, data);
                            }
                        });                  
                    });
                            
                req.on('error', function(e){
                    logger.error("[Failed to Extend Token]: ", e.message );
                    callback({error: e.message}, null);
                });
                
                req.end();
                
            },
            
            
            extendToken: function(accessToken, app, cb){
                var qs = null;
                var path = "/oauth/access_token?grant_type=fb_exchange_token";
                
                if(!accessToken){
                    cb( {error: "access_token is necessary."}, null);
                    return;
                }
                switch(app){
                case "wowtaipeiarena":
                    qs = { 
                        'client_id': app_id_WowTaipeiarena
                        , 'client_secret': app_secret_WowTaipeiarena
                        , 'fb_exchange_token': accessToken
                        , 'scope': 'email,read_stream,publish_stream'
                     };
                    break;
                default:
                    qs = { 
                        'client_id': app_id_OnDaScreen 
                        , 'client_secret': app_secret_OnDaScreen
                        , 'fb_exchange_token': accessToken
                        , 'scope': 'email,read_stream,publish_stream'
                     };
                    break;
                }    
                    
                request({
                    method: 'POST',
                    uri:  fb_url + path,
                    qs: qs,
                    json: true,
                    //body: {'batch': JSON.stringify(data),},
                    
                }, function(error, response, body){
                    if(error){
                        logger.error("[extendToken] ", error);
                        cb(error, null);
                        
                    }else if(body.error){
                        logger.error("[extendToken] ", body.error);
                        cb(body.error, null);
                        
                    }else{
                        FM_LOG("[extendToken] body " + JSON.stringify(body));
                        var longerToken = body.substring( body.indexOf("=")+1, body.indexOf("&expires") );
                        var longerExpiresIn = parseInt(body.substring( body.lastIndexOf("=")+1 ), 10);
                        
                        var data = { "data": {
                                    "accessToken": longerToken,
                                    "expiresIn": Date.now() + longerExpiresIn * 1000
                        }};
                        
                        cb(null, data);
                    }
                });
            },
            
            //by joy
            postMessage:function(access_token, message, link, cb ) {

                // Specify the URL and query string parameters needed for the request
                var url = 'https://graph.facebook.com/me/feed';
                var params = {
                    access_token: access_token,
                    message: message,
            		//privacy:{'value':'SELF'},
            		link: link, 
                };
            	// Send the request
                request.post({url: url, qs: params}, function(err, resp, body) {
                  
					// Handle any errors that occur
					
					if (err) return console.error("Error occured: ", err);
					body = JSON.parse(body);
					if (body.error) return console.error("Error returned from facebook: ", body.error);
					
					var result = JSON.stringify(body);
					if (cb){
					    cb(err, result);
					}
                });
            },
            
            //JF
            postPhoto : function(access_token, message, img_url, album_id, cb){
                if(typeof(album_id) === 'undefined'){
                    cb = album_id;
                    album_id = 'me';
                }
                var url = 'https://graph.facebook.com/' + album_id + '/photos?access_token=' + access_token;
                var params =
                {
                    access_token: access_token,
                    message: message,
                    url: img_url,
                };
                request.post({url: url, qs: params}, function(err, resp, body) {
      
                    // Handle any errors that occur
                    
                    if (err) return console.error("Error occured: ", err);
                    body = JSON.parse(body);
                    if (body.error) return console.error("Error returned from facebook: ", body.error);
                    
                    var result = JSON.stringify(body);
                    if (cb){
                        cb(err, result);
                    }
                });
            },
            
            createAlbum : function(access_token, album_name, message, cb){
                var url = 'https://graph.facebook.com/me/albums?access_token=' + access_token;
                var params =
                {
                    access_token: access_token,
                    message: message,
                    name: album_name,
                };
                request.post({url: url, qs: params}, function(err, resp, body) {
      
                    // Handle any errors that occur
                    
                    if (err) return console.error("Error occured: ", err);
                    body = JSON.parse(body);
                    if (body.error) return console.error("Error returned from facebook: ", body.error);
                    
                    var result = JSON.stringify(body);
                    if (cb){
                        cb(err, result);
                    }
                });
            },
            
            postMessageAndShare : function(access_token, message, share_option, cb ) {

                // Specify the URL and query string parameters needed for the request
                var url = 'https://graph.facebook.com/me/feed?access_token=' + access_token;
                var params = {
                    access_token: access_token,
                    message: message,
                    name: (!share_option.name)?'':share_option.name, 
                    picture: (!share_option.img_url)?'':share_option.img_url,
                    link: (!share_option.link)?'':share_option.link,  // Go here if user click the picture
                    description: (!share_option.description)?'':share_option.description 
                };
            	// Send the request
                request.post({url: url, qs: params}, function(err, resp, body) {
                  
					// Handle any errors that occur
					
					if (err) return console.error("Error occured: ", err);
					body = JSON.parse(body);
					if (body.error) return console.error("Error returned from facebook: ", body.error);
					
					var result = JSON.stringify(body);
					if (cb){
					    cb(err, result);
					}
                });
            },
            
            //TODO: need to verify
            //deprecated
            postOnFeed: function(fb_id, message, cb){
                if(!fb_id || !message){
                    cb( {error: "fb_id/message is necessary."}, null );
                    return;
                }
                
                var path = "/"+ fb_id+"/feed";
                var qs = { "access_token": app_access_token, "message": message };

                
                request({
                    method: 'POST',
                    uri: fb_url + path,
                    qs: qs,
                    json: true,
                    
                }, function(error, response, body){
                    if(error){
                        cb(error, null);
                    }else if(body.error){
                        cb(body, null);
                    }else{
                        cb(null, body);
                    }
                });
            },
            
          //kaiser
            getUserProfilePicture: function(fb_id, app, cb){
                
                var path = "/"+fb_id+"/?fields=picture&width=240&height=240";
//                if(app == "wowtaipeiarena"){    
//                    var qs = { "access_token": app_access_token_WowTaipeiarena};
//                }else{
//                    var qs = { "access_token": app_access_token_OnDaScreen};
//                }
                switch(app){
                case "wowtaipeiarena":
                    var qs = { "access_token": app_access_token_WowTaipeiarena};
                    break;
                default:
                    var qs = { "access_token": app_access_token_OnDaScreen};
                break;
                }
                
                request({
                    method: 'GET',
                    uri:  fb_url + path,
                    qs: qs,
                    json: true,
                    
                }, function(error, response, body){
                    if(error){
                        cb(error, null);
                    }else if(body.error){
                        cb(body, null);
                    }else{
                        cb(null, body);
                    }
                });
            },

            
            //TODO: need further implement.  Check FM.api.fbGetCommentReq() in api.js
            getComment: function(cb){
                
            },
            
            //TODO: need further implement.  Check FM.api.fbGetThumbnail() in api.js
            getThumbnail: function(cb){
                
            },
            
            /** TEST */
            _test: function(){
                
                      
                /*
                this.extendToken( token, function(err, result){
                    if(err)
                        console.log("err: " + JSON.stringify(err));
                    else
                        console.log("result: " + JSON.stringify(result));
                });*/
            
                /*this.postMessage(test_token,my_message,s_link, function(err, result){
                	console.log("result=%s", result);
                });*/
                var batch = [];
                var access_token ="CAAGHFz4rZCiwBABbfOFZBMaokZCeJCtZAspTxuklOf6ITvDtvRMsn3Advjp7OMYXoog3aVaG66gTxJ88OcKeZAHXV1Vhaf1rQZAayBYtJBJlFvFPyWmvNOgyI7KLzLSSo7NoeV3WH69r4BiyDvtgwC2eaeDAzLqLw3Qk1VnLmtXpRWGZC97KqzY"; 
                var relative_url = "100006588456341" + "?fields=comments,likes";
                batch.push( {"method": "GET", "relative_url": relative_url} );
                var i = 0;
                var likes_count =0;
                this.batchRequestToFB(access_token,null,batch, function(err, result){
                    var i = 0;
                    if (result[i].likes){
                        likes_count += result[i].likes.count;
                    }
//                    likes_count += (result[i].likes) ? result[i].likes.count : 0;
                    console.dir(result);
                    console.dir(result[0].likes.paging);
                    console.dir(result[0].likes.data);
                    console.log("result=", likes_count);
                });
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
    };
})();

/* TEST */
//FM.facebookMgr.getInstance()._test();

module.exports = FM.facebookMgr.getInstance();