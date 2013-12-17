/**
 * FeltMeng.com
 */

var customerServiceItemId = null;
var condition = null;
var DOMAIN = "/miix_service/";

$(document).ready(function(){
    customerServicePg();
    $('#customerService').click(function(){
        location.reload();
    });
    $('#pushCenter').click(pushCenterPg);
});


