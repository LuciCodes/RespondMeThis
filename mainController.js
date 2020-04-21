
const fs = require('fs');


const mainController = {

  myExpressApp: null,

  config: {
    allowPostEndpoints: false
  },

  initialised: false,

  endpoints: [
    { path: '/', description: 'ROOT'  },
    { path: '/help', description: 'Describes all configured endpoints'  }
  ],

  init: () => {
  
    if (!mainController.initialised) {

      console.log('Initializing mainController');

      mainController.readConfig();

      mainController.readEndpoints();

      mainController.initialised = true;
    }
  },

  readConfig: () => {
  
    try {

      let cfgFile = fs.readFileSync('config.json', 'utf8');

      if (cfgFile != null && cfgFile != '') {

        let cfg = JSON.parse(cfgFile);

        Object.assign(mainController.config, cfg);

        console.log('read config:', mainController.config);
      
      } else {
        
        console.log('Empty ./config.json, skipping.');
      }
      //console.log('Read endpoints: ', epFile);

    } catch(err) {

      console.log('Could not read ./config.json, skipping.');
    }
  },

  readEndpoints: () => {
  
    try {

      let epFile = fs.readFileSync('endpoints.json', 'utf8');

      if (epFile != null && epFile != '') {

        let cnt = 0;
        let epoints = JSON.parse(epFile);

        console.log('read epoints', epoints.length);

        if (epoints && epoints.length > 0) {
        
          for (let e = 0; e < epoints.length; e++) {
          
            mainController.readEndpoint(epoints[e]);

            cnt++;
          }
        }
        
        console.log(`Read [${ cnt }] endpoints on ./endpoints.json.`);

        console.log('mainController endpoints:', mainController.endpoints);
      
      } else {
        
        console.log('Empty ./endpoints.json, skipping.');
      }
      //console.log('Read endpoints: ', epFile);

    } catch(err) {

      console.log('Could not read ./endpoints.json, skipping.');
    }
  },

  readEndpoint: (endpointInfo) => {

    let epInfo = mainController.createEndpointObj(endpointInfo);
    
    mainController.endpoints.push(epInfo);
  },

  configure: function(app) {

    mainController.myExpressApp = app;

    for (let e = 0; e < mainController.endpoints.length; e++) {

      let epInfo = mainController.createEndpointObj(mainController.endpoints[e]);

      // if empty description default to: 
      if (!epInfo.description || epInfo.description == '') {  
      
        epInfo.description = `This is the path at [${ epInfo.path }]`;
      }

      let responseFunc = (req, res) => { mainController.runResponse(req, res, epInfo); };

      console.log('Setting GET to path ' + epInfo.path);

      app.get(epInfo.path, responseFunc);
    }

    if (mainController.config && mainController.config.allowPostEndpoints) {

      app.post('/respondMeThis', mainController.respondPostEndpoint)
      
      console.log('Setting POST to path /respondMeThis');
    }

  },
  
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

    mainController.respondResponseObj(req, res, respObj);
  },
  
  respondResponseObj: (req, res, respObj) => {

    console.log(`respondResponseObj([${ respObj.path }])`, respObj);

    if (!respObj.code || !respObj.body) {
    
      if (!respObj.body) { respObj = { body: respObj } }; // if we get a plain ojt, then it goes to the response body

      respObj = mainController.createResponseObj({ response: respObj });
    }

    res.status(respObj.code).send(respObj.body);
  },
  
  respondRedirect: (req, res, respObj) => {

    if (!respObj.code || respObj.code < 300 || respObj.code >= 400) { respObj.code = 302; }

    res.redirect(respObj.code, respObj.redirectUrl);
  },
    
  respondPostEndpoint: (req, res) => {

    console.log('respondPostEndpoint> req.body:',  req.body);

    let respObj = mainController.createEndpointObj(req.body);

    if (!respObj.path) { 
    
      res.status(500).send('Request must have a path property.');
    }

    console.log('respondPostEndpoint> req.body epoint:',  respObj);

    mainController.readEndpoint(respObj);

    mainController.myExpressApp.get(respObj.path, (req, res) => { mainController.respondResponseObj(req, res, respObj.response); });

    mainController.respondResponseObj(req, res, {
      success: true,
      message: `endpoint created at [${ respObj.path }]`
    });
  }, 

  createEndpointObj: (reqObj) => {
  
    // this object holds the data about the endpoints we respond to:
    /*
      {
        path: '', //mandatory
        response: responseObj
      }
      */

    //console.log('READ OBJ::', reqObj);

    let endpointObj = { path: '', response: {} };

    Object.assign(endpointObj, reqObj);

    if (reqObj.response) {
    
      endpointObj.response = mainController.createResponseObj({ response: reqObj.response });  // validates that .response is a cool ojb like we need
    }

    if (!endpointObj.path || endpointObj.path == '') { endpointObj.path = '/'; }                 // if empty default to root
    if (endpointObj.path[0] != '/')                  { endpointObj.path = '/' + endpointObj.path; }   // if doesn't start with / then add it

    //console.log('RETURN OBJ::', endpointObj);

    return endpointObj;
  },

  createResponseObj: (reqObj) => {
  
    // this object holds the final data we need to send back;
    /*
      {
        body: {} // object or string
        code: number, // defaults to 200
        filePath: '', // optional, if included then we respond with a file
        fileEncoding: '', // optional, if filePath then may open with this encoding
        redirectUrl: '', // optional, if present, redirects
        redirectIfNoTokenUrl: '', // optional, if present and no auth token present, redirects
      }
      */
    let respObj = { code: 200 };
    
    Object.assign(respObj, (reqObj.response || { body: reqObj.description || 'EMPTY_RESPONSE' }));

    return respObj;
  },

  runResponse: (req, res, endpointInfo) => {

    console.log(`mainController.runResponse('${ endpointInfo.path }'): ${ endpointInfo.description }, info:`, endpointInfo);

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

        let respObj = mainController.createResponseObj(endpointInfo);

        console.log('respObj>>>', respObj);

        // get/validate the responseType for this response
        if (respObj.responseType != null) {

          try {
          
            res.type(respObj.responseType);
            
            console.log(`mainController.runResponse()> SET response type to [${ respObj.responseType }]`);
            
          } catch(errType) {
          
            console.log(`mainController.runResponse()> Error setting response type to [${ respObj.responseType }]`, errType);
          }
        }

        // if the response object has a redirectUrl property then we'll redirect:
        if (respObj.redirectUrl && respObj.redirectUrl != '') {
        
          mainController.respondRedirect(req, res, respObj);

          return;
        }

        // if the response object has a filePath property then we'll send the file instead of the (prob description) body:
        if (respObj.filePath && respObj.filePath != '') {
        
          mainController.respondFileContent(req, res, respObj);

          return;
        }
      
        // the default condition, send the configured body:
        mainController.respondResponseObj(req, res, respObj);
      }

    } catch(err) {

      console.log(`mainController.runResponse> Error running function below; message: ${ err }`, responseFunc);

    }
  }
};

module.exports = mainController;