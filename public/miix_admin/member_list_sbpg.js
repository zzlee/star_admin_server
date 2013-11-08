var memberListSubPg = {
    loadPage: function() {
        $('#main_menu ul[class="current"]').attr("class", "select");
        $('#memberList').attr("class", "current");

        FM.currentContent = FM.memberList;
        FM.currentContent.showCurrentPageContent();
        $('#table-content-header').html('');
    }
};