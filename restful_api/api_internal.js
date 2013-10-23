

exports.init = function() {

   // Internal

    app.get('/oauth2callback', routes.YoutubeOAuth2_cb );
    app.get('/internal/commands', routes.connectionHandler.command_get_cb);
    app.post('/internal/command_responses', routes.connectionHandler.commandResponse_post_cb); 

    app.post('/internal/dooh/movie_playing_state', routes.doohHandler.doohMoviePlayingState_post_cb);  //TODO: PUT /internal/dooh/movie_playing_state is better

    //GET push html to dooh player and trigger story camera.
    app.get('/internal/dooh/padding_start_html/:contentGenre', routes.doohHandler.streamVideoTrigger);
    //PUT get play dooh video play time.
    app.put('/available_street_movies/:playTime', routes.storyCamControllerHandler.availableStreetMovies);

    app.post('/internal/story_cam_controller/available_story_movie', routes.storyCamControllerHandler.availableStoryMovie_post_cb);

    //POST upload base64 image to facebook
    app.post('/fb/image_uplaod/base64', routes.fbEventHandler.fbUploadImageByBase64);
    app.post('/fb/image_uplaod', routes.fbEventHandler.fbUploadImage);
    
};