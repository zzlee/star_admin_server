var pushCenterPg = function(){
    $('#main').html('');
    
    
    /* -------------Search block declaration--------------*/
    var sendForm = $("<form>").attr({
        id:"push_form",
        action:""
    });
    var condition_inner = $("<div>").attr({
        id:"condition_inner"
    });
    var label_sendTime = $("<label>").text("預定送出時間");
    var input_sendTime = $("<input>").attr({
        id: "pushTime",
        type:"text",
        name:"input_sendTime",
        class:"input_sendTime"
    });
    var label_genre = $("<label>").text("類別");
    var select_genre = $("<select>").attr({id:"pushGenre"});
    var select_option_genre_1 = $("<option>").attr({value:"maintain"}).text('維修');
    var select_option_genre_2 = $("<option>").attr({value:"newService"}).text('新服務');
    var select_option_genre_3 = $("<option>").attr({value:"festival"}).text('節慶');
    
    var label_app_genre = $("<label>").text("app類別");
    var select_app_genre = $("<select>").attr({id:"appGenre"});
    var select_app_option_genre_1 = $("<option>").attr({value:"ondascreen"}).text('上大螢幕');
    var select_app_option_genre_2 = $("<option>").attr({value:"wowtaipeiarena"}).text('哇上小巨蛋');
    
    
    var label_content = $("<label>").text("訊息內容");
    var textarea = $("<textarea>").attr({
        cols:"30",
        rows:"4",
        id:"textareaContent"
    });
    var input_btn = $("<input>").attr({
        type:"button",
        name:"input_sendTimeBtn",
        class:"input_sendTimeBtn",
        value:"發送",
        id: "pushToAllBtn"
    });
    /*----------------END Search block declaration-----------*/
    /*---------------- show push list declaration-------------*/
    var article = $('<article>').attr({
        class: "module width_3_quarter"
    });
    var header = $("<header>");
    var h3 = $("<h3>").attr({
        class: "tabs_involved"
    }).text("訊息中心");
    var div_tab_container = $("<div>").attr({
        class: "tab_container"
    });
    var div_tab_container_sub = $("<div>").attr({
        class: "tab_content",
        id: "tab1"
    });
    var form_pushList = $("<form>").attr({
        id: "showPushList",
        action:""
    });
    var table_push_list = $("<table>").attr({
       class: "tablesorter",
       cellspacing: "0",
       id: "product-table"
    });
    var thead_push_list = $("<thead>");
    var tr = $("<tr>");
    var th_showPush_1 = $("<th>").attr({width:"14%"}).text("(預定)送出時間");
    var th_showPush_2 = $("<th>").attr({width:"13%"}).text("類型");
    var th_showPush_3 = $("<th>").attr({width:"29%"}).text("訊息內容");
    var th_showPush_4 = $("<th>").attr({width:"18%"}).text("狀態");
    var th_showPush_5 = $("<th>").attr({width:"14%"}).text("app");
    var th_showPush_6 = $("<th>").attr({width:"12%"}).text("備註");
    var tbody_content = $("<tbody>");
    /* ----------------END show push list declaration---------------*/
    
    /* ------------ Search block combine ----------- */
     condition_inner.append(label_sendTime);
     condition_inner.append(input_sendTime);
     /*push genre block*/
     condition_inner.append(label_genre);
     select_genre.append(select_option_genre_1);
     select_genre.append(select_option_genre_2);
     select_genre.append(select_option_genre_3);
     condition_inner.append(select_genre);
     /*END push genre block*/
     /* app genre block*/
     condition_inner.append(label_app_genre);
     select_app_genre.append(select_app_option_genre_1);
     select_app_genre.append(select_app_option_genre_2);
     condition_inner.append(select_app_genre);
     /*END app genre block*/
     condition_inner.append("<br><br>");
     condition_inner.append(label_content);
     condition_inner.append(textarea);
     condition_inner.append(input_btn);
     sendForm.append(condition_inner);
     /*----------END Search block combine------------- */
     
     /* ------------ Show push list block combine ----------- */
     article.append(header);
     header.append(h3);
     article.append(div_tab_container);
     div_tab_container.append(div_tab_container_sub);
     div_tab_container_sub.append(form_pushList);
     form_pushList.append(table_push_list);
     table_push_list.append(thead_push_list);
     thead_push_list.append(tr);
     tr.append(th_showPush_1);
     tr.append(th_showPush_2);
     tr.append(th_showPush_3);
     tr.append(th_showPush_4);
     tr.append(th_showPush_5);
     tr.append(th_showPush_6);
     table_push_list.append(tbody_content);
     /* ------------END Show push list block combine ----------- */
   
     /*-----------------  Ajax get push list-----------------------------*/
     var getPushList = function(){
         $.get('/miix_service/get_push_all_message', {},function(res) {
             console.log(res.message); // show cb status
             for(var i = 0; i<res.result.length; i++) {
                 var timeString = new Date(res.result[i].pushTime)+" ";
                 var tr_ajax = $("<tr>");
                 var td_1 = $("<td>").text(timeString);
                 var td_2 = $("<td>").text(res.result[i].pushGenre);
                 var td_3 = $("<td>").text(res.result[i].content);
                 var td_4 = $("<td>").text(res.result[i].pushStatus);
                 var td_5 = $("<td>").text(res.result[i].appGenre);
                 var td_6 = $("<td>");
                 
                 
                 var remarkArea = $("<textarea>").attr({
                     id:"pushCenterRemark",
                     class: "remarkText",
                     "_id": res.result[i]._id
                         });
                 
                 var remarkDiv = $('<div>').text(res.result[i].remark);
                 if(res.result[i].remark){
                     td_6.append(remarkDiv);
                 }else{
                     td_6.append("<div>");
                 }
                 td_6.append(remarkArea);
                 tr_ajax.append(td_1);
                 tr_ajax.append(td_2);
                 tr_ajax.append(td_3);
                 tr_ajax.append(td_4);
                 tr_ajax.append(td_5);
                 tr_ajax.append(td_6);
                 tbody_content.append(tr_ajax);
             }
         console.log(res.result);
         });
     };
     getPushList();
     /*-----------------END  Ajax get push list-----------------------------*/
    
     $('#main').append(sendForm);
     $('#main').append(article);
     
     /* --------------START send push record to db, not actually do push!! -----------*/
     $('#pushToAllBtn').click(function(){
         var send_message = $('#textareaContent').val();
         var send_appGenre = $("#appGenre").find(":selected").val();
         var send_pushGenre = $("#pushGenre").find(":selected").val();
         var send_pushTime = new Date($("#pushTime").val()).getTime();
         
         $.post('/miix_service/message', { pushTime: send_pushTime, message: send_message, app: send_appGenre, pushGenre: send_pushGenre},function(res) {
             console.log(res);
             tbody_content.html("");
             getPushList();
         });
     });
     /*-------------- END send push record to db, not actually do push!!---------------- */
//     $('body').bind("keyup",function(e){
//         alert('rr');
//     });
     $('#pushCenterRemark').click(function(){
         alert('tt');
     });
     $(document).keyup(function(e){
         if ($("tr td .textarea:focus") && (e.keyCode === 13)) {
             $('#pushCenterRemark.remarkText').each(function(){
                 if($(this).attr("value")){
                     var url = DOMAIN + "update_push_all_message";
                     var _id=  $(this).attr("_id");
                     var text = $(this).attr("value");
                     $.ajax({
                         url: url,
                         type: 'PUT',
                         data: {_id: $(this).attr("_id"), vjson:{remark: $(this).attr("value")}},
                         success: function(response) {
                             if(response.message){
                                 console.log(response.message);
                                 $( "textarea[_id="+_id+"]" ).prev().html('').append(text);
                             }
                         }
                     });
                 }
             });
         }        
     });
};