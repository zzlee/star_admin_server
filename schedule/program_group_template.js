

var programGroupTemplate =(function(){ 
    
    var PROGRAM_GROUP_TEMPLATE_TABLE = {
        PG_30SEC_3UGC: {
            programs : [
                {
                    sequenceNo: 0,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 1,
                    preSetDuration: 7,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 2,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 3,
                    preSetDuration: 7,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 4,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 5,
                    preSetDuration: 7,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 6,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                }
            ]
        },
        
        PG_30SEC_2UGC: {
            programs : [
                {
                    sequenceNo: 0,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 1,
                    preSetDuration: 12,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 2,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 3,
                    preSetDuration: 12,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 4,
                    preSetDuration: 2,
                    contentType: 'media_item',
                    type: 'padding'
                }
            ]
        }
            
    };
    
    return {
        get: function(templateId, cb){
            if (cb){
                cb(null, PROGRAM_GROUP_TEMPLATE_TABLE[templateId]);
            } 
        }
    };
})();

module.exports = programGroupTemplate;
