
const fs = require('fs');

const mainFactory = {

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
    
      endpointObj.response = mainFactory.createResponseObj({ response: reqObj.response });  // validates that .response is a cool ojb like we need
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
  }
};

module.exports = mainFactory;