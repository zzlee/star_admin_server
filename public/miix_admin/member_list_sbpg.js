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
                $('#tdVideoUgcTatalCount').html(res.video.totalUgc);
                $('#tdVideoPlayedOnDoohTatalCount').html(res.video.totalPlayOnDooh);
                $('#tdVideoFBLikeTatalCount').html(res.video.totalFbLike);
                $('#tdVideoFBCommentTatalCount').html(res.video.totalFbComment);
                $('#tdVideoFBShareTatalCount').html(res.video.totalFbShare);
                
                $('#tdImageUgcTatalCount').html(res.image.totalUgc);
                $('#tdImagePlayedOnDoohTatalCount').html(res.image.totalPlayOnDooh);
                $('#tdImageFBLikeTatalCount').html(res.image.totalFbLike);
                $('#tdImageFBCommentTatalCount').html(res.image.totalFbComment);
                $('#tdImageFBShareTatalCount').html(res.image.totalFbShare);

                $('#tdTotalUgcTatalCount').html(res.total.totalUgc);
                $('#tdTotalPlayedOnDoohTatalCount').html(res.total.totalPlayOnDooh);
                $('#tdTotalFBLikeTatalCount').html(res.total.totalFbLike);
                $('#tdTotalFBCommentTatalCount').html(res.total.totalFbComment);
                $('#tdTotalFBShareTatalCount').html(res.total.totalFbShare);

            });
        });
    }
};