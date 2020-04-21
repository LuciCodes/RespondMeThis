
const fs = require('fs');

const factory = require('./mainFactory.js');

const mainResponder = {
  
  respondFileContent: (req, res, respObj) => {

    try {

      respObj.fileEncoding = respObj.fileEncoding || 'utf8';

      console.log(`Reading response file [${ respObj.filePath }](${ respObj.fileEncoding })...`);
      
      let respFile = fs.readFileSync(respObj.filePath, respObj.fileEncoding);

      if (respFile != null && respFile != '') {

        if (respObj.responseType != null && respObj.responseType.toLowerCase().includes('json')) {
        
          try {
          
            respObj.body = JSON.parse(respFile);

          } catch(errParse) {
          
            console.log('Error parsing response file [' + respObj.filePath + '], sending as text');

            respObj.body = respFile;
          }

        } else {

          respObj.body = respFile;
        }

        console.log('read response file: ' + respObj.filePath);
      
      } else {
        
        console.log(`Empty response file [${ respObj.filePath }]`);
      }

    } catch(exFile) {

        console.log(`Error opening response file [${ respObj.filePath }]`, exFile);
    }

    mainResponder.respondResponseObj(req, res, respObj);
  },
  
  respondResponseObj: (req, res, respObj) => {

    //console.log(`respondResponseObj([${ respObj.path }])`, respObj);

    if (!respObj.code || !respObj.body) {
    
      if (!respObj.body) { respObj = { body: respObj } }; // if we get a plain ojt, then it goes to the response body

      respObj = factory.createResponseObj({ response: respObj });
    }

    // get/validate the responseType for this response
    if (respObj.responseType != null) {

      try {
      
        res.type(respObj.responseType);
        
        console.log(`mainResponder.respondResponseObj()> SET response type to [${ respObj.responseType }]`);
        
      } catch(errType) {
      
        console.log(`mainResponder.respondResponseObj()> Error setting response type to [${ respObj.responseType }]`, errType);
      }
    }
    
    res.status(respObj.code).send(respObj.body);
  },
  
  respondRedirect: (req, res, respObj) => {

    if (!respObj.code || respObj.code < 300 || respObj.code >= 400) { respObj.code = 302; }

    res.redirect(respObj.code, respObj.redirectUrl);
  },
    
  respondPostEndpoint: (req, res) => {

    console.log('respondPostEndpoint> req.body:',  req.body);

    let respObj = factory.createEndpointObj(req.body);

    if (!respObj.path) { 
    
      res.status(500).send('Request must have a path property.');
    }

    console.log('respondPostEndpoint> req.body epoint:',  respObj);

    mainResponder.readEndpoint(respObj);

    mainResponder.myExpressApp.get(respObj.path, (req, res) => { mainResponder.respondResponseObj(req, res, respObj.response); });

    mainResponder.respondResponseObj(req, res, {
      success: true,
      message: `endpoint created at [${ respObj.path }]`
    });
  }, 

  runResponse: (req, res, endpointInfo) => {

    console.log(`mainResponder.runResponse('${ endpointInfo.path }'): ${ endpointInfo.description }, info:`, endpointInfo);

    try {

      if (endpointInfo.responseFunc != null && typeof endpointInfo.responseFunc === 'function') {
      
        // only the response func - not working yet
        endpointInfo.responseFunc(req, res);

      } else {

        // default response; we must have an endpointInfo with a response object OR a description property. 
        // one of those goes on the output.
        // endpointInfo can also have code and responseType properties

        // if response, must have body validation:
        if (endpointInfo.response && !endpointInfo.response.body) { endpointInfo.response.body = 'EMPTY_RESPONSE'; };

        let respObj = factory.createResponseObj(endpointInfo);

        console.log('respObj>>>', respObj);

        // get/validate the responseType for this response
        if (respObj.responseType != null) {

          try {
          
            res.type(respObj.responseType);
            
            console.log(`mainResponder.runResponse()> SET response type to [${ respObj.responseType }]`);
            
          } catch(errType) {
          
            console.log(`mainResponder.runResponse()> Error setting response type to [${ respObj.responseType }]`, errType);
          }
        }

        // if the response object has a redirectUrl property then we'll redirect:
        if (respObj.redirectUrl && respObj.redirectUrl != '') {
        
          mainResponder.respondRedirect(req, res, respObj);

          return;
        }

        // if the response object has a filePath property then we'll send the file instead of the (prob description) body:
        if (respObj.filePath && respObj.filePath != '') {
        
          mainResponder.respondFileContent(req, res, respObj);

          return;
        }
      
        // the default condition, send the configured body:
        mainResponder.respondResponseObj(req, res, respObj);
      }

    } catch(err) {

      console.log(`mainResponder.runResponse> Error running function below; message: ${ err }`, responseFunc);

    }
  }
};

module.exports = mainResponder;