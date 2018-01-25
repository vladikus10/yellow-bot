const _ = require('lodash');

String.prototype.interpolate = function(params) {
  const names = _.keys(params);
  const vals = _.values(params);
  return new Function(...names, `return \`${this}\`;`)(...vals);
};

var messages = {};

exports.get = (locale, name, params = null) => {
  if(!/^(\#)\w+\S$/g.test(name)) return name;
  if(!messages[locale]) locale = 'default';
  let message = messages[locale][name.replace('#', '')];
  if(!message) return name;
  if(_.isArray(message)){
    message = message[getRandomIndex(message.length)];
  }
  if(params){
    message = message.interpolate(params);
  }
  if(!message) message = 'Woops! I don\'t know what to say.';
  return message;
};

function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
}

exports.add = (locale, name, message) => {
  messages[locale][name] = message;
};

exports.set = (messagesObject) => {
  messages = messagesObject;
};
