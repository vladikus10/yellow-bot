const EventEmitter = require('event-emitter-extra');
const ee = new EventEmitter();
const _ = require('lodash');
const messages = require('./messages');
const messaging = require('./messaging');
const Sender = require('./classes/sender');
const routes = require('./routes');
const FB = require('./facebook-graph-api');
var config = require('./config');
var onModuleSetup = null;

var senders = [];
var statelessCommands = [];
var commands = [];

module.exports.setup = (options, done) => {
  config = config(options); //Setup the config file;
  routes(config); //Set up the routes;
  messaging.init(config.interval); //Start the messaging queueing;
  initSessionChecker(); //Start checking for sessio nends

  if(_.isFunction(done)) done(); //Must be at the very end;
};

module.exports._eventEmitter = ee;

module.exports.on = (eventName, callback) => {
  ee.on(eventName, callback);
};

module.exports.emit = (eventName, ...args) => {
  console.log(`EMITTING: ${eventName}`);
  ee.emit(eventName, ...args);
};

module.exports.onNewMessage = (func) => {
  if(!_.isFunction(func)) throw new Error('onNewMessage requires a function/functions to be passed as paramater');
  config.onNewMessage = func;
};

module.exports.beforeSendMessage = (func) => {
  if(!_.isFunction(func)) throw new Error('beforeSendMessage requires a function/functions to be passed as paramater');
  config.beforeSendMessage = func;
};

module.exports.onSessionEnd = (func) => {
  if(!_.isFunction(func)) throw new Error('onSessionEnd requires a function/functions to be passed as paramater');
  config.onSessionEnd = func;
};

module.exports.onNewSession = (func) => {
  if(!_.isFunction(func)) throw new Error('onNewSession requires a function/functions to be passed as paramater');
  config.onNewSession = func;
};

module.exports._Sender = Sender;

module.exports.getSenders = () => {
  return senders;
};

module.exports.getSender = (id) => {
  return new Promise((resolve, reject) => {
    console.log(`There are ${senders.length} senders`);
    let sender = _.find(senders, (sender) => {return sender.id == id;}) || null;
    if(sender) return resolve(sender);
    let query = {
      fields: 'first_name,last_name,profile_pic,locale,timezone,gender'
    };
    FB.get(id, query).then((result) => {
      sender = new Sender(id, result);
      senders.push(sender);
      resolve(sender);
    }, (error) => {
      reject(error);
    });
  });
};

module.exports.senderExists = (id) => {
  let sender = _.find(senders, (sender) => {return sender.id == id;}) || null;
  if(sender) return true;
  else return false;
};

module.exports.addSender = (sender) => {
  if(!(sender instanceof Sender)) throw new Error('param must be an instace of class Sender');
  senders.push(sender);
};

module.exports.removeSender = (sender) => {
  if(!(sender instanceof Sender)) throw new Error('param must be an instace of class Sender');
  let index = sender.indexOf(sender);
  if(index > -1) sender.splice(index, 1);
};

module.exports._commands = commands;
module.exports._statelessCommands = statelessCommands;

module.exports.addCommand = (command) => {
  commands.push(command);
};

module.exports.addStatelessCommand = (command) => {
  statelessCommands.push(command);
};

module.exports.addMessage = (name, message, locale = 'default') => {
  messages.add(locale, name, message);
};

module.exports.setMessages = (messagesObject) => {
  messages.set(messagesObject);
};

module.exports.whitelist = (urls) => {
  let body = {
    whitelisted_domains: urls
  };
  return FB.post('me/messenger_profile', body);
};

module.exports.getStarted = (payload) => {
  let body = {
    get_started: {
      payload: payload
    }
  };
  return FB.post('me/messenger_profile', body);
};

module.exports.persistentMenu = (locale, input, actions) => {
  let body = {
    persistent_menu: [
      {
        locale: locale,
        composer_input_disabled: input,
        call_to_actions: actions
      }
    ]
  };
  return FB.post('me/messenger_profile', body);
};

module.exports.Button = (type, payload, title, height = 'tall', extension = false, fallback = null) => {
  let button = {
    type: type
  };
  switch(type){
    case 'web_url':
      button.url = payload;
      button.title = title;
      button.webview_height_ratio = height;
      button.messenger_extensions = false;
      if(fallback) button.fallback_url = fallback;
    break;
    case 'postback':
      button.payload = payload;
      button.title = title;
    break;
    case 'phone_number':
      button.payload = payload;
      button.title = title;
    break;
    case 'account_link':
      button.url = payload;
    break;
  }
  return button;
};

function initSessionChecker(){
  setInterval(() => {
    let expired = senders.filter((s) => {return s._sessionEnds < Date.now();});
    for(let ex of expired){
      let index = senders.indexOf(ex);
      if(index > -1) senders.splice(index, 1);
      if(config.onSessionEnd) config.onSessionEnd(ex);
    }
  }, 60000);
}
