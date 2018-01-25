const request = require('request-promise-native');
const config = require('./config');
const _ = require('lodash');

module.exports.get = (path, query = {}) => {
  return callAPI(path, query);
};

module.exports.post = (path, data, query = {}) => {
  return callAPI(path, query, 'POST', data);
};

function callAPI(path, query, method = 'GET', data = null){
  if(!query.access_token) query.access_token = config().tokens.access;
  let options = {
    uri: config().apiURL + path,
    qs: query,
    method: method
  };
  if(data) options.json = data;
  return new Promise((resolve, reject) => {
    request(options).then((result) => {
      resolve(convertToJSON(result));
    }, (error) => {
      reject(convertToJSON(error));
    });
  });
}

function convertToJSON(string){
  if(_.isString(string)) string = JSON.parse(string);
  return string;
}
