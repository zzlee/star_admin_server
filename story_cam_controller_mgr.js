storyCamControllerMgr = {};
var globalConnectionMgr = require('./global_connection_mgr.js');

var correspondingStoryCamController = 'story_cam_server';
//var correspondingStoryCamController = 'story_cam_jeff_Feltmeng_pc';
//var correspondingStoryCamController = 'story_cam_gance_Feltmeng_pc';
//var correspondingStoryCamController = 'story_cam_gance_Feltmeng_pc';

storyCamControllerMgr.startRecording = function( miixMovieProjectID, startedRecording_cb ){
    
    //console.log('start recod.');

	//TODO:: get corresponding storyCamController ID
	var storyCamControllerID = correspondingStoryCamController;

	var commandParameters = {
		movieProjectID: miixMovieProjectID
	};
	
	globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "START_RECORDING", parameters: commandParameters }, function(responseParameters) {
		//console.dir(responseParameters);
		if (startedRecording_cb )  {
			startedRecording_cb(responseParameters);
		}
	});



};

storyCamControllerMgr.stopRecording = function( stoppedRecording_cb ){

	//TODO:: get corresponding storyCamController ID
	var storyCamControllerID = correspondingStoryCamController;

	var commandParameters = null;
	
	globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "STOP_RECORDING", parameters: commandParameters }, function(responseParameters) {
		//console.dir(responseParameters);
		if (stoppedRecording_cb )  {
			stoppedRecording_cb(responseParameters);
		}
	});

};

storyCamControllerMgr.uploadStoryMovieToMainServer = function(movieProjectID, uploadMovie_cb) {

	//TODO:: get corresponding storyCamController ID
	var storyCamControllerID = correspondingStoryCamController;

	var commandParameters = {
		movieProjectID: movieProjectID
	};
	
	globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "UPLOAD_STORY_MOVIE_TO_MAIN_SERVER", parameters: commandParameters }, function(responseParameters) {
		//console.dir(responseParameters);
		if (uploadMovie_cb )  {
			uploadMovie_cb(responseParameters);
		}
	});


};

storyCamControllerMgr.uploadStoryMovieToS3 = function(movieProjectID, uploadMovie_cb) {

    //TODO:: get corresponding storyCamController ID
    var storyCamControllerID = correspondingStoryCamController;

    var commandParameters = {
        movieProjectID: movieProjectID
    };
    
    globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "UPLOAD_STORY_MOVIE_TO_S3", parameters: commandParameters }, function(responseParameters) {
        //console.dir(responseParameters);
        if (uploadMovie_cb )  {
            uploadMovie_cb(responseParameters);
        }
    });


};



module.exports = storyCamControllerMgr;