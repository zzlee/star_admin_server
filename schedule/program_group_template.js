

var programGroupTemplate =(function(){ 
    
    var PROGRAM_GROUP_TEMPLATE_TABLE = {
        PG_30SEC_3IMAGEUGC: {
            programs : [
                {
                    sequenceNo: 0,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 1,
                    preSetDuration: 7*1000,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 2,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 3,
                    preSetDuration: 7*1000,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 4,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 5,
                    preSetDuration: 7*1000,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 6,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                }
            ]
        },
        
        PG_30SEC_2IMAGEUGC: {
            programs : [
                {
                    sequenceNo: 0,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 1,
                    preSetDuration: 12*1000,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 2,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 3,
                    preSetDuration: 12*1000,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 4,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                }
            ]
        },
        
        PG_30SEC_1VIDEOUGC: {
            programs : [
                {
                    sequenceNo: 0,
                    preSetDuration: 2*1000,
                    contentType: 'media_item',
                    type: 'padding'
                },
                {
                    sequenceNo: 1,
                    preSetDuration: 26*1000,
                    contentType: 'file',
                    type: 'UGC'
                },
                {
                    sequenceNo: 2,
                    preSetDuration: 2*1000,
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
