/**
 * @fileoverview Implementation of miixContentMgr
 */
var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var async = require('async');

var workingPath = process.cwd();
var aeServerMgr = require(workingPath+'/ae_server_mgr.js');
var doohMgr = require(workingPath+'/dooh_mgr.js');
var memberDB = require(workingPath+'/member.js');
var UGCDB = require(workingPath+'/ugc.js');
var memberDB = require("./member.js");
var awsS3 = require('./aws_s3.js');
var fmapi = require(workingPath+'/routes/api.js');   //TODO:: find a better name
var db = require('./db.js');
//var fbMgr = require('./facebook_mgr.js');
var pushMgr = require('./push_mgr.js');


/**
 * The manager who coordinates the operations for Miix contents
 *
 * @mixin
 */
var miixContentMgr = {};


/**
 * Coordinate AE server to render Miix movie and save the content info to UGC db
 * 
 * @param {String} movieProjectID
 * @param {String} ownerStdID
 * @param {String} ownerFbID
 * @param {String} movieTitle
 */
miixContentMgr.generateMiixMoive = function(movieProjectID, ownerStdID, ownerFbID, movieTitle, cbOfGenerateMiixMoive) {
    
    //console.log('generateMiixMoive is called.');
    //var mediaType = "MP4";
    var mediaType = "H.264";
    //var mediaType = "FLV";
    
    aeServerMgr.createMiixMovie( movieProjectID, ownerStdID, ownerFbID, movieTitle, mediaType, function(responseParameters){
        
        //console.log('[aeServerMgr.createMiixMovie()] responseParameters=');
        //console.dir(responseParameters);
        
        if ( responseParameters ) {
            logger.info("aeServerMgr.createMiixMovie(): responseParameters= "+JSON.stringify(responseParameters));
            
            var ugcModel = db.getDocModel("ugc");
            var aeServerID = responseParameters.ae_server_id;
            var youtubeVideoID = responseParameters.youtube_video_id;
            var s3Path = responseParameters.s3_path;
            var s3PathOfVideoForDooh = responseParameters.s3_path_of_video_for_dooh;
            var fileExtension = responseParameters.movie_file_extension;
            
            //post to FB; update video DB; push notification to mobile client 
            var youTubeUrl, s3Url, s3UrlOfVideoForDooh;
            if ( youtubeVideoID ) {
                youTubeUrl = "http://www.youtube.com/embed/"+youtubeVideoID;
            }
            else {
                youTubeUrl = null;
            }
            
            if ( s3Path ) {
                s3Url = "https://s3.amazonaws.com/miix_content"+s3Path;
            }
            else {
                s3Url = null;
            }

            if ( s3PathOfVideoForDooh ) {
                s3UrlOfVideoForDooh = "https://s3.amazonaws.com/miix_content"+s3PathOfVideoForDooh;
            }
            else {
                s3UrlOfVideoForDooh = null;
            }
            
            
            
            var url = {"youtube":youTubeUrl, "s3":s3Url, "s3OfVideoForDooh": s3UrlOfVideoForDooh  };           
            var vjson = {"title": movieTitle,
                         "ownerId": {"_id": ownerStdID, "userID": ownerFbID},
                         "url": url,
                         "genre":"miix",
                         "aeId": aeServerID,
                         "projectId": movieProjectID,
                         "mediaType": mediaType,
                         "fileExtension": fileExtension
                         };
            fmapi._fbPostUGCThenAdd(vjson); //TODO: split these tasks to different rolls; add a callback to _fbPostUGCThenAdd()
            

            
            
            if ( responseParameters.err == 'null' || (!responseParameters.err) ) {
                
                
                if (cbOfGenerateMiixMoive) {
                    cbOfGenerateMiixMoive(null);
                }
                
            }
            else {
                logger.error("aeServerMgr.createMiixMovie() returns responseParameters with error! responseParameters.err="+responseParameters.err);
                if (cbOfGenerateMiixMoive) {
                    cbOfGenerateMiixMoive("aeServerMgr.createMiixMovie() returns responseParameters with error! responseParameters.err="+responseParameters.err);
                }

            }
            
        }
        else {
            logger.error("aeServerMgr.createMiixMovie() returns invalid responseParameters! responseParameters="+responseParameters);
            if (cbOfGenerateMiixMoive) {
                cbOfGenerateMiixMoive("aeServerMgr.createMiixMovie() returns invalid responseParameters! responseParameters="+responseParameters);
            }

        }
        
    });
    
};

/**
 * Coordinate DOOH server to download Miix Content
 * 
 * @param {String} doohID
 * @param {String} miixMovieProjectID
 * @deprecated since Miix 2.0
 */
miixContentMgr.submitMiixMovieToDooh = function( doohID, miixMovieProjectID ) {
   
    UGCDB.getValueByProject(miixMovieProjectID, "fileExtension", function(err3, result){ 
        if (result){
            var miixMovieFileExtension = result.fileExtension;
            doohMgr.downloadMovieFromS3(miixMovieProjectID, miixMovieFileExtension,  function(resParametes){
                logger.info('downloading Miix movie from S3.');
                logger.info('res: _commandId='+resParametes._commandId+' err='+resParametes.err);
                
            }); 
        }                              
        else {
            logger.error("UGCDB.getValueByProject() failed: "+err3);
        }
        
    });
    
};


/**
 * Add some info some preliminary info of Miix movie to UGC db and ask AE Server to render Miix video.<br>  
 * <br>
 * These info are for clinet side to show some dummy icon for Miix movie which is under rendering
 * 
 * @param {String} ugcProjectID Project ID of this UGC
 * @param {Object} ugcInfo An object containing UGC info:
 *     <ul>
 *     <li>ownerId: ownerId An object containing owner's id info:
 *         <ul>                                                                             
 *         <li>_id: owner's member ID (hex string representation of its ObjectID in MongoDB)
 *         <li>fbUserId: owner's Facebook user ID                                                    
 *         </ul>                                                                            
 *     <li>contentGenre: it is normally the template (id) that this UGC uses
 *     <li>customizableObjects: an array of objects describing the customizable objects
 *     <li>title: title of UGC. This title will be used when it is posted on YouTube
 *     </ul>
 * @param {Function} cbOfPreAddMiixMovie Callback function called when adding operation is done
 */
miixContentMgr.preAddMiixMovie = function(imgDoohPreviewBase64, ugcProjectID, ugcInfo, cbOfPreAddMiixMovie) {
    var movieProjectDir = path.join( workingPath, 'public/contents/user_project', ugcProjectID);
    var userDataDir = path.join( movieProjectDir, 'user_data');
    var userContentDescriptionFilePath = path.join( userDataDir, 'customized_content.xml');
    var customizableObjects = ugcInfo.customizableObjects;
    var ugcDoohPreviewS3Path = null;
    var allUserContentExist = true;

    async.series([
        function(callback){
            //generate user content description file customized_content.xml
            var builder = require('xmlbuilder');
            var userDataXml = builder.create('customized_content',{'version': '1.0', 'encoding': 'UTF-8', 'standalone': true});
            userDataXml.ele('template_ID', ugcInfo.contentGenre);
            var customizableObjectListXml = userDataXml.ele('customizable_object_list');
            var customizableObjectXml = "";
            

            if( Object.prototype.toString.call( customizableObjects ) === '[object Array]' ) {
                for (var i in customizableObjects) {
                    //append the content in customized_content.xml
                    customizableObjectXml = customizableObjectListXml.ele('customizable_object');
                    customizableObjectXml.ele('ID', customizableObjects[i].ID );
                    customizableObjectXml.ele('format', customizableObjects[i].format);
                    customizableObjectXml.ele('content', "_"+customizableObjects[i].content);
                }
            }
            else {
                //append the content in customized_content.xml
                customizableObjectXml = customizableObjectListXml.ele('customizable_object');
                customizableObjectXml.ele('ID', customizableObjects.ID );
                customizableObjectXml.ele('format', customizableObjects.format);
                customizableObjectXml.ele('content', "_"+customizableObjects.content);
            }
            
            //finalize customized_content.xml 
            var xmlString = userDataXml.end({ 'pretty': true, 'indent': '  ', 'newline': '\n' });
            //logger.info(userDataXml);
            //TODO: create userDataDir if it does not exist 
            if ( fs.existsSync(userDataDir) ) {
                fs.writeFile(userContentDescriptionFilePath, xmlString, function(errOfWriteFile){
                    if (!errOfWriteFile){
                        callback(null);
                    }
                    else {
                        callback("Failed to write to customized_content.xml: "+errOfWriteFile);
                    }
                }); 
            }

        },
        function(callback){
            //save customized_content.xml to S3 
            var s3Path =  '/user_project/' + ugcProjectID + '/user_data/'+ "customized_content.xml";
            awsS3.uploadToAwsS3(userContentDescriptionFilePath, s3Path, 'text/xml', function(errOfUploadToAwsS3, result){
                if (!errOfUploadToAwsS3){
                    callback(null);
                }
                else {
                    callback("Failed to save customized_content.xml to S3: "+errOfUploadToAwsS3);
                }
            });
        },
        function(callback){
            //now save the base64 image of DOOH preview to a PNG file
            var base64Data = imgDoohPreviewBase64.replace(/^data:image\/png;base64,/,"");
            imageUgcDoohPreviewFile = path.join(workingPath,"public/contents/user_project", ugcProjectID, ugcProjectID+"_dooh_preview.png");

            fs.writeFile(imageUgcDoohPreviewFile, base64Data, 'base64', function(errOfWriteFile) {
                if (!errOfWriteFile){
                    callback(null);
                }
                else {
                    callback("Fail to save base64 image of DOOH preview to a PNG file: "+errOfWriteFile);
                }
                
            });
        },
        function(callback){
            //Upload the PNG file of image UGC's DOOH preview to S3
            ugcDoohPreviewS3Path =  '/user_project/' + ugcProjectID + '/'+ ugcProjectID+"_dooh_preview.png";
            awsS3.uploadToAwsS3(imageUgcDoohPreviewFile, ugcDoohPreviewS3Path, 'image/png', function(err,result){
                if (!err){
                    logger.info('DOOH preview of Miix image is successfully uploaded to S3 '+ugcDoohPreviewS3Path);
                    callback(null);
                }
                else {
                    logger.info('DOOH preview of Miix image is failed to be uploaded to S3 '+ugcDoohPreviewS3Path);
                    callback('DOOH preview of Miix movie is failed to be uploaded to S3 '+ugcDoohPreviewS3Path);
                }
            });
        },

        function(callback){
            //Add UGC info to UGC db 
            
            //check if all the user data exist. 
            //TODO: use async to better check file existance
            if( Object.prototype.toString.call( customizableObjects ) === '[object Array]' ) {
                for (var i in customizableObjects) {
                    allUserContentExist = allUserContentExist && fs.existsSync( path.join( userDataDir, "_"+customizableObjects[i].content) );
                }
            }
            else {
                allUserContentExist = fs.existsSync( path.join( userDataDir, "_"+customizableObjects.content) );
            }

            var ugcDoohPreviewS3Url =  "https://s3.amazonaws.com/miix_content" + ugcDoohPreviewS3Path;
            var vjson = {
                    "ownerId": {"_id": ugcInfo.ownerId._id, "userID": ugcInfo.ownerId.fbUserId, "fbUserId": ugcInfo.ownerId.fbUserId},
                    "projectId": ugcProjectID,
                    "genre": "miix",
                    "contentGenre": ugcInfo.contentGenre,
                    "title": ugcInfo.title,
                    "doohPreviewUrl": ugcDoohPreviewS3Url,
                    "allUserContentExist": allUserContentExist
                };

            UGCDB.addUGC(vjson, function(errOfAddUGC, newlyAddedUgc){
                if (!errOfAddUGC){
                    for (var i=0; i<customizableObjects.length; i++){
                        if (customizableObjects[i].format=="text") {
                            vjsonCustomizableObject = {
                                "id": customizableObjects[i].ID,
                                "type": customizableObjects[i].format,
                                "content": customizableObjects[i].content
                            };
                        }
                        else { // customizableObjects[i].format=="image" or "video"
                            var userContentS3Path = '/user_project/' + ugcProjectID + '/user_data/_'+ customizableObjects[i].content;
                            var userContentS3Url = "https://s3.amazonaws.com/miix_content" + userContentS3Path;
                            vjsonCustomizableObject = {
                                "id": customizableObjects[i].ID,
                                "type": customizableObjects[i].format,
                                "content": userContentS3Url
                            };
                        }
                        
                        newlyAddedUgc.userRawContent.push(vjsonCustomizableObject);
                    }
                    newlyAddedUgc.save(function(errPushUserRawContent){
                        if (!errPushUserRawContent){
                            logger.info('Miix movie info is successfully saved to UGC db: '+ugcProjectID);
                            callback(null);
                        }
                        else {
                            logger.info('Miix movie info failed to saved to UGC db: '+errPushUserRawContent);
                            callback('Miix movie info failed to saved to UGC db: '+errPushUserRawContent);
                        }
                    });
                }
                else {
                    callback("Failed to add UGC info to UGC db: "+errOfAddUGC);
                }
            });
        },
        function(callback){
            //Generate the Miix movie
            if ( systemConfig.RENDER_MIIX_MOVIE_IMMEDIATELY_AFTER_GETTING_USER_CONTENT ) {
                if ( allUserContentExist ) {
                    logger.info('Start generating movie '+ ugcProjectID +'!');
                    miixContentMgr.generateMiixMoive(ugcProjectID, ugcInfo.ownerId._id, ugcInfo.ownerId.fbUserId, ugcInfo.title);
                    callback(null);
                }
                else {
                    callback("Cannot generate UGC because some or all user contents are missing.");
                }
            }
            else {
                callback(null);
            }
        }
    ],
    function(err, results){
        if (cbOfPreAddMiixMovie){
            cbOfPreAddMiixMovie(err);
        }
    });
    
    
    

};

/**
 * Add a Miix image to system. <br>  
 * <br>
 * Miix image content body (in base64 format) is saved as a PNG and put onto AWS S3; the complete set of  
 * content info is save to UGC db
 * 
 * @param {String} imgBase64 image date with base64 format
 * @param {String} ugcProjectID Project ID of this UGC
 * @param {Object} ugcInfo An object containing UGC info:
 *     <ul>
 *     <li>ownerId: ownerId An object containing owner's id info:
 *         <ul>                                                                             
 *         <li>_id: owner's member ID (hex string representation of its ObjectID in MongoDB)
 *         <li>fbUserId: owner's Facebook user ID                                                    
 *         </ul>                                                                            
 *     <li>contentGenre: it is normally the template (id) that this UGC uses
 *     <li>title: title of UGC 
 *     </ul>
 * @param {Function} cbOfAddMiixImage Callback function called when adding operation is done
 */
miixContentMgr.addMiixImage = function(imgBase64, imgDoohPreviewBase64, ugcProjectID, ugcInfo, cbOfAddMiixImage) {
    var imageUgcFile = null;
    var imageUgcDoohPreviewFile = null;
    var ugcS3Path = null;
    var ugcDoohPreviewS3Path = null;
    var ugcS3Url = null;    
    debugger;
    
    async.series([
        function(callback){
            //Save base64 image to a PNG file
            
            var projectDir = path.join( workingPath, 'public/contents/user_project', ugcProjectID);
            async.waterfall([
                function(callbackOfWaterfall){
                    //check if project dir exists
                    fs.exists(projectDir, function (exists) {
                        callbackOfWaterfall(null, exists);
                    });
                },
                function(projectDirExists, callbackOfWaterfall){
                    //if not exists, create one
                    if (!projectDirExists) {
                        fs.mkdir(projectDir, function(errOfMkdir){
                            if (!errOfMkdir) {
                                callbackOfWaterfall(null);
                            }
                            else {
                                callbackOfWaterfall("Failed to create the project dir "+projectDir+": "+errOfMkdir);
                            }
                        });
                    }
                    else {
                        callbackOfWaterfall(null);
                    }
                },
                function(callbackOfWaterfall){
                    //now save the base64 image to a PNG file
                    var base64Data = imgBase64.replace(/^data:image\/png;base64,/,"");
                    imageUgcFile = path.join(workingPath,"public/contents/user_project", ugcProjectID, ugcProjectID+".png");

                    fs.writeFile(imageUgcFile, base64Data, 'base64', function(errOfWriteFile) {
                        if (!errOfWriteFile){
                            callbackOfWaterfall(null);
                        }
                        else {
                            callbackOfWaterfall("Fail to save base64 image to a PNG file: "+errOfWriteFile);
                        }
                        
                    });
                },
                function(callbackOfWaterfall){
                    //now save the base64 image of DOOH preview to a PNG file
                    var base64Data = imgDoohPreviewBase64.replace(/^data:image\/png;base64,/,"");
                    imageUgcDoohPreviewFile = path.join(workingPath,"public/contents/user_project", ugcProjectID, ugcProjectID+"_dooh_preview.png");

                    fs.writeFile(imageUgcDoohPreviewFile, base64Data, 'base64', function(errOfWriteFile) {
                        if (!errOfWriteFile){
                            callbackOfWaterfall(null);
                        }
                        else {
                            callbackOfWaterfall("Fail to save base64 image of DOOH preview to a PNG file: "+errOfWriteFile);
                        }
                        
                    });
                }
            ], function (err, result) {
                callback(err);    
            });
            
        },
        function(callback){
            //Upload the PNG file of original image UGC to S3
            ugcS3Path =  '/user_project/' + ugcProjectID + '/'+ ugcProjectID+".png";
            awsS3.uploadToAwsS3(imageUgcFile, ugcS3Path, 'image/png', function(err,result){
                if (!err){
                    logger.info('Miix image is successfully uploaded to S3 '+ugcS3Path);
                    callback(null, ugcS3Path);
                }
                else {
                    logger.info('Miix image is failed to be uploaded to S3 '+ugcS3Path);
                    callback('Miix movie is failed to be uploaded to S3 '+ugcS3Path, null);
                }
            });
        },
        function(callback){
            //Upload the PNG file of image UGC's DOOH preview to S3
            ugcDoohPreviewS3Path =  '/user_project/' + ugcProjectID + '/'+ ugcProjectID+"_dooh_preview.png";
            awsS3.uploadToAwsS3(imageUgcDoohPreviewFile, ugcDoohPreviewS3Path, 'image/png', function(err,result){
                if (!err){
                    logger.info('DOOH preview of Miix image is successfully uploaded to S3 '+ugcDoohPreviewS3Path);
                    callback(null, ugcDoohPreviewS3Path);
                }
                else {
                    logger.info('DOOH preview of Miix image is failed to be uploaded to S3 '+ugcDoohPreviewS3Path);
                    callback('DOOH preview of Miix movie is failed to be uploaded to S3 '+ugcDoohPreviewS3Path, null);
                }
            });
        },
        function(callback){
            //Add UGC info (including user content info) to UGC db
            var customizableObjects = ugcInfo.customizableObjects;
            ugcS3Url = "https://s3.amazonaws.com/miix_content" + ugcS3Path;
            var ugcDoohPreviewS3Url =  "https://s3.amazonaws.com/miix_content" + ugcDoohPreviewS3Path;
            var vjson = {
                    "ownerId": {"_id": ugcInfo.ownerId._id, "userID": ugcInfo.ownerId.fbUserId, "fbUserId": ugcInfo.ownerId.fbUserId},
                    "projectId": ugcProjectID,
                    "genre": "miix_image",
                    "contentGenre": ugcInfo.contentGenre,
                    "mediaType": "PNG",
                    "fileExtension": "png",
                    "title": ugcInfo.title,
                    "url": {"s3":ugcS3Url},
                    "doohPreviewUrl": ugcDoohPreviewS3Url
                    //"userRawContent": JSON.stringify(customizableObjects)
                };

            UGCDB.addUGC(vjson, function(errAddUgc, newlyAddedUgc){
                var vjsonCustomizableObject = null;
                if (!errAddUgc){
                    for (var i=0; i<customizableObjects.length; i++){
                        
                        if (customizableObjects[i].type=="text") {
                            vjsonCustomizableObject = {
                                "id": customizableObjects[i].id,
                                "type": customizableObjects[i].type,
                                "content": customizableObjects[i].content
                            };
                            newlyAddedUgc.userRawContent.push(vjsonCustomizableObject);
                        }
                        else if ((customizableObjects[i].type=="image")||(customizableObjects[i].type=="video")) {  
                            var userContentS3Path = '/user_project/' + ugcProjectID + '/user_data/_'+ customizableObjects[i].content;
                            var userContentS3Url = "https://s3.amazonaws.com/miix_content" + userContentS3Path;
                            vjsonCustomizableObject = {
                                "id": customizableObjects[i].id,
                                "type": customizableObjects[i].type,
                                "content": userContentS3Url
                            };
                            newlyAddedUgc.userRawContent.push(vjsonCustomizableObject);
                        }
                    }
                    newlyAddedUgc.save(function(errPushUserRawContent){
                        if (!errPushUserRawContent){
                            logger.info('Miix image info is successfully saved to UGC db: '+ugcProjectID);
                            callback(null);
                        }
                        else {
                            logger.info('Miix image info failed to saved to UGC db: '+errPushUserRawContent);
                            callback('Miix image info failed to saved to UGC db: '+errPushUserRawContent);
                        }
                    });
                    
                    
                    
                }
                else {
                    logger.info('Miix image info failed to saved to UGC db: '+errAddUgc);
                    callback('Miix image info failed to saved to UGC db: '+errAddUgc);
                }
            });
        },
//        function(callback){
//            //post on Facebook
//            memberDB.getFBAccessTokenById(ugcInfo.ownerId._id, function(errOfGetFBAccessTokenById, result){
//                
//               if (!errOfGetFBAccessTokenById){
//                   //var userID = result.fb.userID;
//                   //var userName = result.fb.userName;
//                   var can_msg =  "上大螢幕活動初體驗！";
//                   var accessToken = result.fb.auth.accessToken;
//                   fbMgr.postMessage(accessToken, can_msg, ugcS3Url, function(errOfPostMessage, result){
//                       //console.log("result=%s", result);
//                       if (!errOfPostMessage) {
//                           callback(null);
//                       }
//                       else {
//                           callback("Failed to post FB: "+errOfPostMessage);
//                       }
//                   });
//               }
//               else {
//                   callback("Failed to get FB access token from member DB: "+errOfGetFBAccessTokenById);
//               }
//                
//            });
//        }
//        function(callback){
//            var projectDir = path.join( workingPath, 'public/contents/user_project', ugcProjectID);
//            async.waterfall([
//                function(callbackOfWaterfall){
//                    //check if project dir exists
//                    fs.exists(projectDir, function (exists) {
//                        callbackOfWaterfall(null, exists);
//                    });
//                },
//                function(projectDirExists, callbackOfWaterfall){
//                    //if exists, delete one
//                    if (projectDirExists) {
//                        rmDirectory(projectDir);
//                        callbackOfWaterfall(null);
//                    }
//                    else {
//                        callbackOfWaterfall(null);
//                    }
//                }        
//                ], function (err, result) {
//                callback(err);    
//            });
//        }

    ],
    function(err, results){
        if (cbOfAddMiixImage){
            cbOfAddMiixImage(err);
        }
    });
    

};
var rmDirectory = function(dirName, cbOfRmDirectory) {
    if(!fs.existsSync(dirName)) return;  
    fs.readdirSync(dirName).forEach(function(file,index){
      var currentPath = dirName + "/" + file;
      if(fs.statSync(currentPath).isDirectory()) 
        rmDirectory(currentPath);
      else 
        fs.unlinkSync(currentPath);
    });
    fs.rmdirSync(dirName);
  };
/**
 * Get the url of user-uploaded image <br>  
 * 
 * @param {String} miixMovieProjectID
 * @param {Function} gotUrls_cb
 */
miixContentMgr.getUserUploadedImageUrls = function( miixMovieProjectID, gotUrls_cb) {
    var userUploadedImageUrls = [];
    var anUserUploadedImageUrl;
    var userContentXmlFile = path.join( workingPath, 'public/contents/user_project', miixMovieProjectID, 'user_data/customized_content.xml');
    var parser = new xml2js.Parser({explicitArray: false});
    fs.readFile( userContentXmlFile, function(err, data) {
        if (!err){
            parser.parseString(data, function (err2, result) {
                if (!err2){
                    var customizable_objects = result.customized_content.customizable_object_list.customizable_object;
                    
                    if( Object.prototype.toString.call( customizable_objects ) === '[object Array]' ){
                        for (var i=0;i<customizable_objects.length;i++) {
                            anUserUploadedImageUrl = '/contents/user_project/'+miixMovieProjectID+'/user_data/'+customizable_objects[i].content;
                            userUploadedImageUrls.push( anUserUploadedImageUrl );
                        }
                    }
                    else{
                        anUserUploadedImageUrl = '/contents/user_project/'+miixMovieProjectID+'/user_data/'+customizable_objects.content;
                        userUploadedImageUrls.push( anUserUploadedImageUrl );
                    }
                    if (gotUrls_cb) {
                        gotUrls_cb(userUploadedImageUrls, null);
                    }
                }
                else{
                    if (gotUrls_cb) {
                        gotUrls_cb(null, err2);
                    }
                }
            });
        }
        else {
            if (gotUrls_cb) {
                gotUrls_cb(null, err);
            }		
        }
    });
};

/**
 * Retrieve the latest highlights of UGCs.<br>
 * 
 * @param {Number} limit The number of UGC highlights to retrieve
 * @param {Function} cbOfGetUgcHighlights The callback function called when finishing retrieving. It has the following signature:<br>
 *     cbOfGetUgcHighlights(err, ugcHighlightList)
 */
miixContentMgr.getUgcHighlights = function(limit, cbOfGetUgcHighlights){
    
    var ugcModel = db.getDocModel("ugc");
	var userLiveContentModel = db.getDocModel("userLiveContent");
    var listLimit = 0;
    var next = 0;
    var newlyUgcHighlights = [];
    
    //TODO: change to query to meet the requirements
    ugcModel.find({ "highlight": true}).sort({"createdOn":-1}).limit(limit).exec(function (err, ugcHighlights) {
        if (!err){
            
            var UGCListInfo = function(fbUserId, fb_userName, genre, longPhotoUrl, liveContentUrl, youtubeUrl, liveTime, arr) {
                arr.push({
                    fbUserId: fbUserId,
                    fb_userName: fb_userName,
                    genre: genre,
                    longPhotoUrl: longPhotoUrl,
                    liveContentUrl: liveContentUrl,
                    youtubeUrl: youtubeUrl,
                    liveTime: liveTime
                });
            };
            var mappingUgcHighlightsList = function(data, set_cb){
                listLimit = data.length;

                var toDo = function(err, result){
                    var liveContentUrl=null;
                    var youtubeUrl=null;
                    var fbUserId=null;

                    if(err && next <= listLimit - 1){
                        next += 1;
                        mappingUgcHighlightsList(data, set_cb);
                    }else if(err) set_cb("NO UGC highlights from DB", newlyUgcHighlights);

                    if(data[next].genre == "miix_image")
                        liveContentUrl = result[1].url.s3;
                    if(data[next].genre == "miix" || data[next].genre == "miix_story"){
                        youtubeUrl = data[next].url.youtube;
                        liveContentUrl = result[1].url.youtube;
                    }
                    if(data[next].ownerId){
                        if(data[next].ownerId.fbUserId)
                            fbUserId = data[next].ownerId.fbUserId;
                        else if(data[next].ownerId.userID)
                            fbUserId = data[next].ownerId.userID;
                    }

                    if(next == listLimit - 1) {
                        UGCListInfo(fbUserId, result[0], data[next].genre, data[next].url.s3, liveContentUrl, youtubeUrl, result[1].liveTime, newlyUgcHighlights);
                        set_cb(null, newlyUgcHighlights); 
                        next = 0;
//                        console.log(newlyUgcHighlights);
                        newlyUgcHighlights = [];
                    }
                    else{
                        UGCListInfo(fbUserId, result[0], data[next].genre, data[next].url.s3, liveContentUrl, youtubeUrl, result[1].liveTime, newlyUgcHighlights);
                        next += 1;
                        mappingUgcHighlightsList(data, set_cb);
                    }
                };//toDo End ******
                //async
                if(data[next] !== null){
                    async.parallel([
                                    function(callback){
                                        memberDB.getUserNameAndID(ugcHighlights[next].ownerId._id, function(err, result){
                                            if(err) callback(err, null);
                                            else if(result === null) callback(null, 'No User');
                                            else callback(null, result.fb.userName);
                                        });
                                    },
                                    function(callback){
                                        userLiveContentModel.find({"sourceId": data[next].projectId, "state":"correct"}).sort({'createdOn': -1}).exec(function(err, result){
                                            if(err) callback(err, null);
                                            else if(!result) callback(null, 'No Live Content');
                                            else if(!result[0]) callback(null, 'No Live Content');
                                            else{
                                                callback(null, result[0]);
                                            }
                                        });
                                    }
                                    ], toDo);
                }

            };
            if(ugcHighlights.length > 0){
                mappingUgcHighlightsList(ugcHighlights, function(err, docs){
                    if (!err){
//                        console.log('newlyUgcHighlights',newlyUgcHighlights);
                       cbOfGetUgcHighlights(null, newlyUgcHighlights);
                    }else{
                       cbOfGetUgcHighlights("Fail to mapping UGC highlights from DB: "+err, newlyUgcHighlights); 
                    }
                });
            }
            
            
        }
        else {
            cbOfGetUgcHighlights("Fail to retrieve UGC highlights from DB: "+err, ugcHighlights);
        }
        
    });
};


miixContentMgr.putFbPostIdUgcs = function(ugcProjectID, ugcInfo, cbOfPutFbPostIdUgcs){
    var ugcModel = db.getDocModel("ugc");
    
    async.waterfall([
        function(callback){
            ugcModel.find({ "projectId": ugcProjectID}).sort({"createdOn":-1}).exec(function (err, ugcObj) {
                if (!err)
                    callback(null, ugcObj);
                else
                    callback("Fail to retrieve UGC Obj from DB: "+err, ugcObj);
            });
            
        },
        function(ugcObj, callback){
            var vjson;
            var arr = [];
            
            if(ugcObj[0].fb_postId[0]){
              ugcObj[0].fb_postId.push({'postId': ugcInfo});
              vjson = {"fb_postId" :ugcObj[0].fb_postId};
            }else{
                arr = [{'postId': ugcInfo}];
                vjson = {"fb_postId" : arr};
            }
            
            db.updateAdoc(ugcModel, ugcObj[0]._id, vjson, function(errOfUpdateUGC, resOfUpdateUGC){
                if (!errOfUpdateUGC){
                    callback(null, resOfUpdateUGC);
                }else
                    callback("Fail to update UGC Obj from DB: "+errOfUpdateUGC, resOfUpdateUGC);
            });
            
        }
    ],
    function(err, result){
        if (cbOfPutFbPostIdUgcs){
            cbOfPutFbPostIdUgcs(err, result);
        } 
    });
};

var getRandomMessage = function(userNo, cbOfRandomMessage){
    var max= 7;//you have to check your max if you add a new case
    var min= 1;
    var randomNum = Math.floor(Math.random()*(max-min+1)+min);
    
    switch(randomNum){
    case 1:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，您可以先到客棧打個工。');
        break;
    case 2:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，記得要每天敷臉。');
        break;
    case 3:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，您可以先練練身段。');
        break;
    case 4:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，您可以先吊個嗓子。');
        break;
    case 5:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，您得趕緊準備胭脂水粉。');
        break;
    case 6:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，您記得備好轎，看倌不等人的。');
        break;
    case 7:
        cbOfRandomMessage(null, '您目前是第'+userNo+'位試鏡者，等候通告期間，您記得用膳節制，以免戲服穿不上。');
        break;
    default:
        cbOfRandomMessage('get random Message failed', '您目前是第'+userNo+'位試鏡者，等候通告期間，您可以先到客棧打個工。');
    break;
    }
    
};


miixContentMgr.pushRandomMessage = function(memberId, ugcProjectID, cbOfPushRandomMessage){
    
    async.waterfall([
                     function(callback){
                         UGCDB.getValueByProject( ugcProjectID, 'no', function(err, ugcObj){
                             if (!err)
                                 callback(null, ugcObj);
                             else{
                                 callback("Fail to retrieve UGC Obj from DB: "+err, null);
                             }

                         });
                     },
                     function(ugcObj, callback){
//                         getRandomMessage(ugcObj.no, function(err, randomMessage){
//                             if (!err)
//                                 callback(null, randomMessage);
//                             else{
//                                 callback("Fail to get random message: "+err, null);
//                             }
//                         });
                         callback(null, "你目前是第"+ugcObj.no+"位投稿者。排定時段後，你會收到APP通知與facebook預告，通知播出日期時間。");
                     },
                     function(randomMessage, callback){
                         pushMgr.sendMessageToDeviceByMemberId( memberId, randomMessage, function(err, result){
                             if (!err)
                                 callback(null, result);
                             else{
                                 callback("Fail to send message to device by memberId: "+err, null);
                             }
                     });
                     }
                 ],
                 function(err, result){
                     if (cbOfPushRandomMessage){
                         cbOfPushRandomMessage(err, result);
                     } 
                 });
};

miixContentMgr.getUserLiveContentList = function(memberId, limit, skip, cbOfGetLiveContent){
    var userLiveContentModel = db.getDocModel("userLiveContent");
    
    userLiveContentModel.find({"ownerId._id": memberId, "state":"correct"}).sort({"createdOn":-1}).limit(limit).skip(skip).exec(cbOfGetLiveContent);
    
    
};


miixContentMgr.putFbPostIduserLiveContents = function(userLiveContentProjectID, userLiveContentInfo, cbOfPutFbPostIduserLiveContents){
    var userLiveContentModel = db.getDocModel("userLiveContent");
    
    async.waterfall([
        function(callback){
            userLiveContentModel.find({ "projectId": userLiveContentProjectID, "state":"correct"}).sort({"createdOn":-1}).exec(function (err, userLiveContentObj) {
                if (!err)
                    callback(null, userLiveContentObj);
                else
                    callback("Fail to retrieve userLiveContent Obj from DB: "+err, userLiveContentObj);
            });
            
        },
        function(userLiveContentObj, callback){
            var vjson;
            var arr = [];
            
            if(userLiveContentObj[0].fb_postId[0]){
                userLiveContentObj[0].fb_postId.push({'postId': userLiveContentInfo});
              vjson = {"fb_postId" :userLiveContentObj[0].fb_postId};
            }else{
                arr = [{'postId': userLiveContentInfo}];
                vjson = {"fb_postId" : arr};
            }
            
            db.updateAdoc(userLiveContentModel, userLiveContentObj[0]._id, vjson, function(errOfUpdateUserLiveContent, resOfUpdateUserLiveContent){
                if (!errOfUpdateUserLiveContent){
                    callback(null, resOfUpdateUserLiveContent);
                }else
                    callback("Fail to update userLiveContent Obj from DB: "+errOfUpdateUserLiveContent, resOfUpdateUserLiveContent);
            });
            
        }
    ],
    function(err, result){
        if (cbOfPutFbPostIduserLiveContents){
            cbOfPutFbPostIduserLiveContents(err, result);
        } 
    });
};



module.exports = miixContentMgr;

/*
//test
miixContentMgr.getUserUploadedImageUrls('greeting-50c99d81064d2b841200000a-20130129T072747490Z', function(userUploadedImageUrls, err){
    console.log('userUploadedImageUrls=');
    console.dir(userUploadedImageUrls);
});

*/
//miixContentMgr.putFbPostIdUgcs('miix_it-519af8c5b14a8a2c0e00000d-20130808T064444717Z', '123', function(err, putFbPostIdUgcs){
//    console.log('userUploadedImageUrls=');
//    console.dir(putFbPostIdUgcs);
//});

//miixContentMgr.pushRandomMessage( '526107a409900bbc02000005', 'wow_pic-526107a409900bbc02000005-20131018T102216893Z', function(err, result){
//    console.log(err, result);
//});

//miixContentMgr.getLiveContent( '51d38ca086fa21440a000002',10,0, function(err, result){
//console.log(err, result);
//});

//miixContentMgr.putFbPostIduserLiveContents('cultural_and_creative-51d38ca086fa21440a000002-1375784400000-005', '123', function(err, putFbPostIdUgcs){
//console.log('userUploadedImageUrls=');
//console.dir(putFbPostIdUgcs);
//});
