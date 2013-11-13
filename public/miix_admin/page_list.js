//PageList object implementation
function PageList( listType, rowsPerPage, urlToGetListContent, drawPageFunction){
    var _this = this;
    this.currentPage = 1;
    this.rowsPerPage = rowsPerPage;
    this.urlToGetListContent = urlToGetListContent;
    this.totalPageNumber = 1;
    this.listType = listType;
    this.extraParameters = null;
    this.conditions = null;
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
        if (cbOfShowPageContent){
            cbOfShowPageContent(err);
        }
    });
};

PageList.prototype.showCurrentPageContent = function(cb){
    this.showPageContent(this.currentPage, cb);
};


PageList.prototype.showNextPageContent = function(cb){
    if (this.currentPage < this.totalPageNumber){
        this.currentPage++;
        this.showCurrentPageContent(cb);
    }
};

PageList.prototype.showPreviousPageContent = function(cb){
    if (this.currentPage > 1){
        this.currentPage--;
        this.showCurrentPageContent(cb);
    }

};

PageList.prototype.showFirstPageContent = function(cb){
    this.showPageContent(1, cb);
};

PageList.prototype.showLastPageContent = function(cb){
    this.showPageContent(this.totalPageNumber, cb);
};

PageList.prototype.setRowsPerPage = function(newRowsPerPage, cb ){
    var keyRow = this.rowsPerPage*(this.currentPage-1)+1;
    var newPage = Math.ceil(keyRow/newRowsPerPage); 
    this.rowsPerPage = newRowsPerPage;
    this.showPageContent(newPage, cb);
};

