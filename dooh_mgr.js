var doohMgr = {};

var globalConnectionMgr = require('./global_connection_mgr.js');

//TODO:: get corresponding DOOH ID
var doohID = 'DOOH_server_winXP_vm';
//var doohID = 'DOOH_gance_winXP_vm';
//var doohID = 'DOOH_gance_Feltmeng_pc';


doohMgr.downloadMovieFromMainServer = function(movieProjectID, downloadMovie_cb) {


	var commandParameters = {
		movieProjectID: movieProjectID
	};
	
	globalConnectionMgr.sendRequestToRemote( doohID, { command: "DOWNLOAD_MOVIE_FROM_MAIN_SERVER", parameters: commandParameters }, function(responseParameters) {
		//console.dir(responseParameters);
		if (downloadMovie_cb )  {
			downloadMovie_cb(responseParameters);
		}
	});


};

doohMgr.downloadMovieFromS3 = function(movieProjectID, movieFileExtension, downloadMovie_cb) {
    
    var commandParameters = {
            movieProjectID: movieProjectID,
            movieFileExtension: movieFileExtension
        };
        
        globalConnectionMgr.sendRequestToRemote( doohID, { command: "DOWNLOAD_MOVIE_FROM_S3", parameters: commandParameters }, function(responseParameters) {
            //console.dir(responseParameters);
            if (downloadMovie_cb )  {
                downloadMovie_cb(responseParameters);
            }
        });
};

module.exports = doohMgr;