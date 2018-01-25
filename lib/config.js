const _ = require('lodash');

var config = null;

module.exports = (options) => {
  if(!options) return config;
  if(!_.isObject(options)) throw new Error('Options must be an object');
  if(!options.express) throw new Error('Express object is not defined');
  if(!options.express.app) throw new Error('Express app object is not defined');
  if(!options.appSecret && !_.isString(options.appSecret)) throw new Error('App secret is not defined or is not a string');
  if(!options.tokens) throw new Error('Tokens object is not defined');
  if(!options.tokens.verify || !options.tokens.access) throw new Error('Access or verify tokens were not set');
  if(!options.session || options.session <= 0) throw new Error('Session is required and must be a positive number');
  let apiURL = 'https://graph.facebook.com/v2.6/';
  if(options.apiVersion) apiURL = `https://graph.facebook.com/v${options.apiVersion}/`;
  options.apiURL = apiURL;
  config = options;
  return config;
};

var example = {
  express: {
    app: 'app', //REQUIRED
    secret: 'dsfsf23fwf3', //REQUIRED
    path: '/webhook' //OPTIONAL, DEFAULT: /webhook
  },
  appSecret: 'dfsfsdfsdf',
  tokens: {
    verify: 'adasd',
    access: 'asdasda'
  },
  session: { //OPTIONAL
    duration: 12
  },
  interval: 1000,
  stateless: false,
  defaultState: 'idle',
  apiVersion: 2.6
};
