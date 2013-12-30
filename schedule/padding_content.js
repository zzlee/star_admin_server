

var paddingContent =(function(){ 
    var PADDING_CONTENT_TABLE = { //specify the media name of each padding content store on Scala's Content Manager
            miix_it: [{name: "ondascreen_padding-miix_it-start"},
                      //{name: "Jeff_start"},
                      {name: "ondascreen_padding-miix_it-end.jpg"}],
            cultural_and_creative: [{name: "ondascreen_padding-cultural_and_creative-start"},
                                    {name: "ondascreen_padding-cultural_and_creative-middle.jpg"},
                                    {name: "ondascreen_padding-cultural_and_creative-middle.jpg"},
                                    {name: "ondascreen_padding-cultural_and_creative-end.jpg"}
                                    ],
            mood: [{name: "ondascreen_padding-wish-start"},
                   {name: "ondascreen_padding-wish-middle.jpg"},
                   {name: "ondascreen_padding-wish-middle.jpg"},
                   {name: "ondascreen_padding-wish-end.jpg"}
                   ],
            check_in: [{name: "ondascreen_padding-check_in-start"},
                       {name: "ondascreen_padding-check_in-middle.jpg"},
                       {name: "ondascreen_padding-check_in-middle.jpg"},
                       {name: "ondascreen_padding-check_in-end.jpg"}
                       ]                                
    };
        
    return {
        get: function(id, cb){
            var idArray = id.split('-');
            var contentGenre = idArray[0]; 
            var index = idArray[1];
            if (cb){
                cb(null, PADDING_CONTENT_TABLE[contentGenre][index]);
            } 
        }
    };
})();

module.exports = paddingContent;
