
exports.init = function() {

    //generic 

    app.get('/fb/comment', routes.api.fbGetCommentReq); 
    app.get('/fb/thumbnail', routes.api.fbGetThumbnail);
    app.post('/members/fb_info', routes.api.signupwithFB);

};