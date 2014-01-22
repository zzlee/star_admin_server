storyCamControllerMgr = {};
var globalConnectionMgr = require('./global_connection_mgr.js');

var db = require('./db.js');
var programGroupModel = db.getDocModel("programGroup");

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

// long-polling shutter control : start
storyCamControllerMgr.startShutter = function( startedShutter_cb ){
    
    //console.log('start recod.');

	//TODO:: get corresponding storyCamController ID
	var storyCamControllerID = correspondingStoryCamController;
    
    // camera time trigger setting
    /* var actionSetting = [5.5, 9, 9];
    
	var commandParameters = {
		movieProjectID: '',
        actionSetting: actionSetting
	};
	
	globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "START_SHUTTER", parameters: commandParameters }, function(responseParameters) {
		//console.dir(responseParameters);
		if (startedShutter_cb )  {
			startedShutter_cb(responseParameters);
		}
	}); */
    
    var triggerTime = new Date().getTime();
    // var triggerTime = 1388479200000 + 60000; // test for lab
    logger.info('Camera start shutter: ' + triggerTime);
    
    var query_start = new Date().getTime(),
        query_end;
    
    var query = 
    {
        "interval.start" : { $lte : triggerTime },
        "interval.end" : { $gte : triggerTime }
    };

    programGroupModel.find(query, function(err, docs) {
        if(err) {
            // console.log(err);
            logger.info(err);
            return;
        }
        else if(docs.length == 0) {
            // console.log('not_find_program_group');
            logger.info('storyCamControllerMgr.startShutter: not_find_program_group, trigger time is ' + triggerTime);
            return;
        }
        
        var programGroup = docs[0];
        var actionSetting = [];
        var waitTimeBuffer = 0;
        programGroup.programs.forEach(function(program) {
            
            if(program.type == 'padding') {
                waitTimeBuffer += program.preSetDuration;
            }
            else if(program.type == 'UGC') {
                waitTimeBuffer += program.preSetDuration / 2;
                actionSetting.push(waitTimeBuffer / 1000);
                waitTimeBuffer = program.preSetDuration / 2;
            }
        });
        query_end = new Date().getTime();
        actionSetting[0] -= (query_end - query_start) / 1000;
        if(actionSetting[0] < 0) { actionSetting[0] = 0.0; }
        
        var commandParameters = {
            movieProjectID: '',
            actionSetting: actionSetting
        };
        
        globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "START_SHUTTER", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (startedShutter_cb )  {
                startedShutter_cb(responseParameters);
            }
        });
        
    });
    
};

storyCamControllerMgr.stopShutter = function( stoppedShutter_cb ){

	//TODO:: get corresponding storyCamController ID
	var storyCamControllerID = correspondingStoryCamController;

	var commandParameters = null;
	
	globalConnectionMgr.sendRequestToRemote( storyCamControllerID, { command: "STOP_SHUTTER", parameters: commandParameters }, function(responseParameters) {
		//console.dir(responseParameters);
		if (stoppedShutter_cb )  {
			stoppedShutter_cb(responseParameters);
		}
	});
    
};

// long-polling shutter control : end



module.exports = storyCamControllerMgr;