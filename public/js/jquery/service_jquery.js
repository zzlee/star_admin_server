/**
 * FeltMeng.com
 */

$.ajaxSetup({  
    async : false  
});

var customerServiceItemId = null;
var condition = null;
var DOMAIN = "/miix_service/";

$(document).ready(function(){
    var url = DOMAIN + "customer_service_items";
    /**
     * load table and init message list
     */      
    var type = 'table';
    $.get(url, {type :type}, function(res){
        if (!res.err){
            $('div.tab_container').html(res);
        }
    });
    $('div.message_list').html('');

    /**
     * load message list
     */        
    $('#product-table tbody tr').click( function() {
        customerServiceItemId = this.id;
        reloadList();
    });

    /**
     * answer enter
     */
    $('#answerInput').click( function() {
        var url = DOMAIN + "questions";
        $('#answer textarea[class="answerInput"]').each(function(){
            $.ajax({
                url: url,
                type: 'PUT',
                data: {_id: customerServiceItemId, answer: $(this).attr("value")},
                success: function(response) {
                    if(response.message){
//                        console.log("[Response] message:" + response.message);
                    }
                }
            });

            /**
             * reload  table and list
             */
            reloadTable();
            reloadList();
        });
    });


});


$(document).keyup(function (e) {
    /**
     * quickSearch bind enter
     */
    if ($("quickSearch .input:focus") && (e.keyCode === 13)) {
        $('#quickSearchInput').each(function(){
            var url = DOMAIN + "customer_service_items";
            var fb_userName = $(this).attr("value");
            var type = 'table';
            condition = {fb_userName: fb_userName};
            if(fb_userName != 'Quick Search'){
                $.get(url, {type :type, condition:condition}, function(res){
                    if (!res.err){
                        $('div.tab_container').html(res);
                    }
                });
            }
        });
    }
    /**
     * remark enter
     */
    if ($("tr td .textarea:focus") && (e.keyCode === 13)) {
        $('#service._idRemarks').each(function(){
            if($(this).attr("value")){
                var url = DOMAIN + "questions";
                $.ajax({
                    url: url,
                    type: 'PUT',
                    data: {_id: $(this).attr("name"), vjson:{remarks: $(this).attr("value")}},
                    success: function(response) {
                        if(response.message){
//                            console.log("[Response] message:" + response.message);
                        }
                    }
                });
                /**
                 * reload  table
                 */
                condition = null;
                reloadTable();
            }
        });

    }

});

/**
 * ajax
 */ 
$(document).ajaxComplete(function(event,request, settings) {
    serviceCheck = settings.url.substring(0,36);

    if(serviceCheck == '/miix_service/customer_service_items'){
        $('#product-table tbody tr').click( function() {
            customerServiceItemId = this.id;
            reloadList();
        });

        $(document).keyup(function (e) {
                $('#service._idRemarks').each(function(){
                    if($(this).attr("value")){
                        var url = DOMAIN + "questions";
                        $.ajax({
                            url: url,
                            type: 'PUT',
                            data: {_id: $(this).attr("name"), vjson:{remarks: $(this).attr("value")}},
                            success: function(response) {
                                if(response.message){
//                                    console.log("[Response] message:" + response.message);
                                }
                            }
                        });
                    }
                });
        });

    }

});

function reloadTable(){
    url = DOMAIN + "customer_service_items";
    var type = 'table';
    $.get(url, {type :type, condition:condition}, function(res){
        if (!res.err){
            $('div.tab_container').html(res);
        }
    });
};

function reloadList(){
    url = DOMAIN + "customer_service_items";
    var type = 'list';
    var condition = {_id :customerServiceItemId};
    if(customerServiceItemId){
        $.get(url, {type :type, condition:condition}, function(res){
            if (!res.err){
                $('div.message_list').html(res);
            }
        });
    }
};