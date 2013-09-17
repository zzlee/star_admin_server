var fs = require('fs');
var path = require('path');
var workingPath = process.cwd();
var ytToken;

/*
var refreshYtToken = function(ytRefreshToken){
	var https = require('https');

	var options = {
		host: 'accounts.google.com',
		port: 443,
		path: '/o/oauth2/token',
		headers: { 'content-type': 'application/x-www-form-urlencoded'  },
		method: 'POST'
	};
			
	var client_req = https.request(options, function(client_res) {
		client_res.setEncoding('utf8');
		client_res.on('data', function (res_token) {
			//logger.log("res_token= %s", res_token);
			
			ytToken = JSON.parse(res_token);
			if ( ytToken.access_token ) {
				logger.log('<'+ new Date() +'> Refreshed YouTube token: ', ytToken );
				//console.dir(ytToken);
				
				
				var tokenFile = path.join( workingPath, 'yt_token.json');
				fs.writeFile(tokenFile, res_token, function(err) {
					if(!err) {
						logger.log('Successfully save YouTube token ' + ytToken.access_token );

					} 
				}); 
				
				
			}
			else {
				logger.log('Failed to refresh YouTube token: '+res_token);				
			}
			
		});
	});
	var body = 'client_id=701982981612-434p006n3vi10ghlk6u9op178msavtu2.apps.googleusercontent.com&';
	body += 'client_secret=NhmRDngvVVHtkLLPnhAN349b&';
	body += 'refresh_token='+ytRefreshToken+"&";
	body += 'grant_type=refresh_token';
	client_req.write(body);
	client_req.end();
}; 
*/

exports.YoutubeOAuth2_cb = function(req, res){
	if (req.query.code) {
		logger.log('code='+req.query.code);
		
		
		
		var https = require('https');
		
		var options = {
			host: 'accounts.google.com',
			port: 443,
			path: '/o/oauth2/token',
			headers: { 'content-type': 'application/x-www-form-urlencoded'  },
			method: 'POST'
		};
				
		var client_req = https.request(options, function(client_res) {
			client_res.setEncoding('utf8');
			client_res.on('data', function (res_token) {
				
				ytToken = JSON.parse(res_token);
				if ( ytToken.access_token ) {
					logger.log('Got YouTube access_token: ' + ytToken.access_token);
					res.send('Successfully obtained YouTube token: '+res_token);
					
					var tokenFile = path.join( workingPath, 'yt_token.json');
					fs.writeFile(tokenFile, res_token, function(err) {
						if(!err) {
							logger.log('Successfully save YouTube token ' + ytToken.access_token );
	                         //TODO get accessToken need better solution
						} 
						else {
							logger.log("Failed to save YouTube access_token");
						}
					}); 
					
				}
				else {
					res.send('Failed to obtain YouTube token: '+res_token);				
				}
				
				if ( ytToken.refresh_token ) {
					var refreshTokenFile = path.join( workingPath, 'yt_refresh_token.json');
					fs.writeFile(refreshTokenFile, ytToken.refresh_token, function(err) {
						if(!err) {
							logger.log('Successfully save YouTube refresh_token ' + ytToken.refresh_token );
						}
						else {
							logger.log("Failed to save YouTube refresh_token");
						}
					});
					
					/*
					setInterval( function( _ytRefreshToken){
						//logger.log("_ytRefreshToken= %s", _ytRefreshToken);
						refreshYtToken(_ytRefreshToken);
					}, 3500*1000, ytToken.refresh_token);
					*/
				}
				
			});
		});
		var body = 'code='+req.query.code+'&';
		body += 'client_id=701982981612-434p006n3vi10ghlk6u9op178msavtu2.apps.googleusercontent.com&';
		body += 'client_secret=NhmRDngvVVHtkLLPnhAN349b&';
		body += 'redirect_uri=http://localhost/oauth2callback&';
		body += 'grant_type=authorization_code';
		client_req.write(body);
		client_req.end();
		
	}
	if (req.query.error) {
		logger.log(req.query.error);
		res.send('Accessing YouTube service was denied!');
	}
};

