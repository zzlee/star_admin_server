//PageList object implementation
function PageList( listType, rowsPerPage, urlToGetListContent, drawPageCallback, drawPageFunction){
    var _this = this;
    this.currentPage = 1;
    this.rowsPerPage = rowsPerPage;
    this.urlToGetListContent = urlToGetListContent;
    this.totalPageNumber = 1;
    this.listType = listType;
    this.extraParameters = null;
    this.conditions = null;
    this.drawPageCallback = drawPageCallback;
    this.drawPageFunction = drawPageFunction;
    
    //TODO: have a cleaner way to get the list size
    $.get('/miix_admin/list_size', {listType: listType, token: localStorage.token}, function(res){
        if (!res.err){
            var listSize = res.size;
           
            _this.totalPageNumber = Math.ceil(res.size/_this.rowsPerPage); 
            $('#totalPage').html(FM.currentContent.totalPageNumber);
        }
    });
    
} 

PageList.prototype.setExtraParameters = function(extraParameters){
    this.extraParameters = extraParameters;
};

PageList.prototype.setConditions = function(conditions){
    this.conditions = conditions;
};

PageList.prototype.showPageContent = function(Page, cbOfShowPageContent){
    $('#table-content').html('Loading...');
    var _this = this;
    
    
    async.parallel([
        function(callback){
            //get list's HTML content
            $.get(_this.urlToGetListContent, {skip: (Page-1)*_this.rowsPerPage, limit: _this.rowsPerPage, token:localStorage.token, condition:_this.conditions, extraParameters: JSON.stringify(_this.extraParameters)}, function(res){
                if(res.message){
                    console.log("[Response] message:" + res.message);
                    callback("Failed to get list's HTML content: "+res.message);
                    
                }else{
                    
                    
                    if(_this.listType == "ugcCensorMovieList") {
                    
                        if (!_this.drawPageFunction){
                            _this.currentPage = Page;
                            $('#table-content').html(res);
                        }
                        else { //drawPageFunction exists
                            _this.drawPageFunction(res, _this.currentPage, _this.rowsPerPage);
                        }
                        $('#pageNoInput').val(_this.currentPage);
                        $('input#rowsPerPage').val( _this.rowsPerPage);
                    
                        //alert(_this.listType);
                        findErrorImgAndFix(function(){
                             callback(null);
                        });
                        //$('#table-content').html('test');
                    }else {
                        if (!_this.drawPageFunction){
                        _this.currentPage = Page;
                        $('#table-content').html(res);
                        }
                        else { //drawPageFunction exists
                            _this.drawPageFunction(res, _this.currentPage, _this.rowsPerPage);
                        }
                        $('#pageNoInput').val(_this.currentPage);
                        $('input#rowsPerPage').val( _this.rowsPerPage);
                        
                         callback(null);
                    }
                   
                }
            }).fail(function() {
                callback("Failed to get list's HTML content");
            });
        },
        function(callback){
            //get list's size
            //TODO: have a cleaner way to get the list size
            $.get('/miix_admin/list_size', {listType: _this.listType, token: localStorage.token}, function(res){
                if (!res.err){
                //console.log(res);
                    var listSize = res.size;
                    _this.totalPageNumber = Math.ceil(res.size/_this.rowsPerPage); 
                    $('#totalPage').html(FM.currentContent.totalPageNumber);
                    callback(null);
                }
                else {
                    callback("Failed to get list's size: "+ res.err);
                }
            }).fail(function() {
                callback("Failed to get list's size");
            });

        }
    ],
    function(err){
        if (_this.drawPageCallback){
            _this.drawPageCallback(err);
        }
    });
};

PageList.prototype.showCurrentPageContent = function(){
    this.showPageContent(this.currentPage);
};


PageList.prototype.showNextPageContent = function(){
    if (this.currentPage < this.totalPageNumber){
        this.currentPage++;
        this.showCurrentPageContent();
    }
};

PageList.prototype.showPreviousPageContent = function(){
    if (this.currentPage > 1){
        this.currentPage--;
        this.showCurrentPageContent();
    }

};

PageList.prototype.showFirstPageContent = function(){
    this.showPageContent(1);
};

PageList.prototype.showLastPageContent = function(cb){
    this.showPageContent(this.totalPageNumber);
};

PageList.prototype.setRowsPerPage = function(newRowsPerPage ){
    var keyRow = this.rowsPerPage*(this.currentPage-1)+1;
    var newPage = Math.ceil(keyRow/newRowsPerPage); 
    this.rowsPerPage = newRowsPerPage;
    this.showPageContent(newPage);
};

var findErrorImgAndFix = function(findErrorImgAndFix_cb) {

     var chechImgValid = function(id,imgUrl, cb){
            var checkImg = document.createElement("img");
            checkImg.src = imgUrl;
            
            checkImg.onerror = function () {
            
                
                var brokenArray = [];
              
                imgUrl = imgUrl.replace('_s.jpg','.png');
                imgUrl = imgUrl.replace('https://s3.amazonaws.com/miix_content','');
                brokenArray.push(imgUrl);
                console.log( brokenArray);
                
                $('#'+id).parent().append("<div class='hint' style='font-size:40pt'>圖片載入中，請稍後!</div>");
                $('#'+id).hide();
                
                $.ajax({
                    url: DOMAIN+"getBrokenImgAndFix",
                    cache:false,
                    //async:false,
                    type: 'POST',
                    data: {
                        time: new Date().getTime(),
                        brokenArray:brokenArray
                    },
                    success: function(response) {
                        var smallOne = imgUrl.replace('.png','_s.jpg');
                        smallOne = smallOne.replace('/user_project/','https://s3.amazonaws.com/miix_content/user_project/');
                        var appendImg = $('<img>').attr({
                            width:700,
                            height:149,
                            src:smallOne
                        });
                        $('#'+id).parent().append(appendImg);
                        $('.hint').hide();
                        cb(null);
                    },
                    error:function(){
                    }
                });    
                
             };
             checkImg.onload = function(){
               cb(null)  
             };
        };
        
        var selectorCount = 0;
        
        $(".sourceUgc").each(function(i){
            var selector =  $(".sourceUgc").length;
            var ugcId = $(this).attr('id');
            var imgUrl = $(this).attr('src');
            
            chechImgValid(ugcId,imgUrl, function(){
                selectorCount++;
                if(selectorCount == selector) {
                    findErrorImgAndFix_cb(null);
                }
            });
            
        });
};

