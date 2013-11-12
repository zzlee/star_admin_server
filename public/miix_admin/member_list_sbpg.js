var memberListSubPg = {
    loadPage: function() {
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#memberList').attr("class", "current");

        FM.currentContent = FM.memberList;
        FM.currentContent.showCurrentPageContent();
        $('#table-content-header').html('');
        
        $.get('/miix_admin/table_censorMemberList_contentExtra.html', function(res){
            $('#contentExtra').html(res).show();
            $.get('/miix_admin/member_total_counts', {token: localStorage.token}, function(res){
                $('#tdUgcTatalCount').html(res.totalUgc);
                $('#tdPlayedOnDoohTatalCount').html(res.totalPlayOnDooh);
                $('#tdFBLikeTatalCount').html(res.totalFbLike);
                $('#tdFBCommentTatalCount').html(res.totalFbComment);
                $('#tdFBShareTatalCount').html(res.totalFbShare);
            });
        });
    }
};