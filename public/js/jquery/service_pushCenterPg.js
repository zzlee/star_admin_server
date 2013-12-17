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
    var label_sendTime = $("<label>").text("送出時間");
    var input_sendTime = $("<input>").attr({
        type:"text",
        name:"input_sendTime",
        class:"input_sendTime"
    });
    var label_genre = $("<label>").text("類別");
    var select_genre = $("<select>").attr({});
    var select_option_genre_1 = $("<option>").text('維修');
    var select_option_genre_2 = $("<option>").text('新服務');
    var select_option_genre_3 = $("<option>").text('節慶');
    
    var label_app_genre = $("<label>").text("app類別");
    var select_app_genre = $("<select>").attr({});
    var select_app_option_genre_1 = $("<option>").text('上大螢幕');
    var select_app_option_genre_2 = $("<option>").text('哇上小巨蛋');
    
    
    var label_content = $("<label>").text("訊息內容");
    var textarea = $("<textarea>").attr({
        cols:"30",
        rows:"4"
    });
    var input_btn = $("<input>").attr({
        type:"button",
        name:"input_sendTimeBtn",
        class:"input_sendTimeBtn",
        value:"發送"
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
    var th_showPush_1 = $("<th>").attr({width:"14%"}).text("送出時間");
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
     header.append(h3)
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
     
     for(var i =0; i<3; i++) {
         
         var tr_ajax = $("<tr>");
         var td_1 = $("<td>").text("test: "+i);
         var td_2 = $("<td>").text("test: "+i);
         var td_3 = $("<td>").text("test: "+i);
         var td_4 = $("<td>").text("test: "+i);
         var td_5 = $("<td>").text("test: "+i);
         var td_6 = $("<td>").text("test: "+i);
         
         tr_ajax.append(td_1);
         tr_ajax.append(td_2);
         tr_ajax.append(td_3);
         tr_ajax.append(td_4);
         tr_ajax.append(td_5);
         tr_ajax.append(td_6);
         tbody_content.append(tr_ajax);
     }
     /*-----------------END  Ajax get push list-----------------------------*/

     $('#main').append(sendForm);
     $('#main').append(article);
//    $.get( "../../service_push_head.html",{type:html}. function( data ) {
//        console.log(data);
//        $( "#main" ).append( data );
//        $( "#main" ).append( "123");
//        
//      });
    /*
    $.ajax({
        url:"../../service_push_head.html",
        type:"GET",
        dataType:"html",
        success: function(res){
         //var testt = eval(res);
            $('res').append('1233');
            $( "#main" ).append( res );
            $( "#main" ).append( "123");
        },
        error:function(xhr, ajaxOptions, thrownError){
            console.log(xhr.status); 
            console.log(thrownError); 
        }
    });*/
    
};