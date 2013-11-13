var adminBrowserMgr = {};

var globalConnectionMgr = require('./global_connection_mgr.js');


adminBrowserMgr.showTrace = function(browserId, traceText, cdOfShowTrace) {
    
    var adminBrowserId = "admin_browser";
    if (browserId) {
        adminBrowserId = browserId;
    }
    
    var commandParameters = {
        trace: traceText
    };
    
    globalConnectionMgr.sendRequestToRemote( adminBrowserId, { command: "SHOW_TRACE", parameters: commandParameters }, function(responseParameters) {
        if (cdOfShowTrace )  {
            cdOfShowTrace(responseParameters);
        }
    });
};

module.exports = adminBrowserMgr;