var paddingContent =(function(){ 
    var PADDING_CONTENT_TABLE = { //specify the media name of each padding content store on Scala's Content Manager
            miix_it: { 
                start: "ondascreen_padding-miix_it-start", 
                middle: "ondascreen_padding-miix_it-end.jpg",
                end: "ondascreen_padding-miix_it-end.jpg"
            },
            cultural_and_creative: { 
                start:  "ondascreen_padding-cultural_and_creative-start",    
                middle: "ondascreen_padding-cultural_and_creative-middle.jpg",
                end:    "ondascreen_padding-cultural_and_creative-end.jpg"
            },          
            mood: { 
                start:  "ondascreen_padding-wish-start",    
                middle: "ondascreen_padding-wish-middle.jpg",
                end:    "ondascreen_padding-wish-end.jpg"
            },          
            check_in: { 
                start:  "ondascreen_padding-check_in-start",    
                middle: "ondascreen_padding-check_in-middle.jpg",
                end:    "ondascreen_padding-check_in-end.jpg"
            }          

    };
        
    return {
        get: function(contentGenre, paddingType){
            return PADDING_CONTENT_TABLE[contentGenre][paddingType];
        }
    };
})();

module.exports = paddingContent;