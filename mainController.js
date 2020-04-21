
const fs = require('fs');

const factory   = require('./mainFactory.js');
const responder = require('./mainResponder.js');

const mainController = {

  myExpressApp: null,

  config: {
    allowPostEndpoints: false
  },

  initialised: false,

  endpoints: [
    { path: '/', description: 'ROOT', response: { body: 'EMPTY_RESPONSE' } },
    { path: '/help', description: 'Describes all configured endpoints', response: { body: 'EMPTY_RESPONSE' }  }
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

    let epInfo = factory.createEndpointObj(endpointInfo);
    
    mainController.endpoints.push(epInfo);
  },

  configure: function(app) {

    mainController.myExpressApp = app;

    for (let e = 0; e < mainController.endpoints.length; e++) {

      let epInfo = factory.createEndpointObj(mainController.endpoints[e]);

      // if empty description default to: 
      if (!epInfo.description || epInfo.description == '') {  
      
        epInfo.description = `This is the path at [${ epInfo.path }]`;
      }

      let responseFunc = (req, res) => { responder.runResponse(req, res, epInfo); };

      console.log('Setting GET to path ' + epInfo.path);

      app.get(epInfo.path, responseFunc);
    }

    if (mainController.config && mainController.config.allowPostEndpoints) {

      app.post('/respondMeThis', responder.respondPostEndpoint)
      
      console.log('Setting POST to path /respondMeThis');
    }

  }
};

module.exports = mainController;