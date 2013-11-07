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
    $.get('/miix_admin/list_size', {listType: listType, token: localStorage.token}, function(res){
        if (!res.err){
            var listSize = res.size;
           
            _this.totalPageNumber = Math.ceil(res.size/_this.rowsPerPage); 
            $('#totalPage').html(FM.currentContent.totalPageNumber);
        }
    });
    
    
    
    //TODO: consider this new implementation
    this.getListSize = function(cbOfGetListSize) {
        $.get('/miix_admin/list_size', {listType: listType, token: localStorage.token}, function(res){
            if (!res.err){
                var listSize = res.size;
                
                if (cbOfGetListSize) {
                    cbOfGetListSize(null, listSize);
                }

                
               
                _this.totalPageNumber = Math.ceil(res.size/_this.rowsPerPage); 
                $('#totalPage').html(FM.currentContent.totalPageNumber);
            }
            else {
                if (cbOfGetListSize) {
                    cbOfGetListSize(res.err);
                }
            }
        });
    };
    
    
    
} 

PageList.prototype.setExtraParameters = function(extraParameters){
    this.extraParameters = extraParameters;
};

PageList.prototype.setConditions = function(conditions){
    this.conditions = conditions;
};

PageList.prototype.showPageContent = function(Page,condition, cbOfShowPageContent){
    $('#table-content').html('Loading...');
    var _this = this;
    
    
    
    
    $.get(this.urlToGetListContent, {skip: (Page-1)*this.rowsPerPage, limit: this.rowsPerPage, token:localStorage.token, condition:this.conditions, extraParameters: JSON.stringify(this.extraParameters)}, function(res){
        if(res.message){
            console.log("[Response] message:" + res.message);
            
        }else{
            if (!_this.drawPageFunction){
                _this.currentPage = Page;
                $('#table-content').html(res);
                $('#pageNoInput').val(_this.currentPage);
                $('input#rowsPerPage').val( _this.rowsPerPage);
            }
            else { //drawPageFunction exists
            console.log(res);
                _this.drawPageFunction(res, _this.currentPage, _this.rowsPerPage);
                // console.log(_this.currentPage);
                $('#pageNoInput').val(_this.currentPage);
                $('input#rowsPerPage').val( _this.rowsPerPage);
            }
        }
    });

    $.get('/miix_admin/list_size', {listType: this.listType, token: localStorage.token}, function(res){
        if (!res.err){
        //console.log(res);
            var listSize = res.size;
            _this.totalPageNumber = Math.ceil(res.size/_this.rowsPerPage); 
            $('#totalPage').html(FM.currentContent.totalPageNumber);
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

PageList.prototype.showLastPageContent = function(){
    this.showPageContent(this.totalPageNumber);
};

PageList.prototype.setRowsPerPage = function(newRowsPerPage ){
    var keyRow = this.rowsPerPage*(this.currentPage-1)+1;
    var newPage = Math.ceil(keyRow/newRowsPerPage); 
    this.rowsPerPage = newRowsPerPage;
    this.showPageContent(newPage);
};

