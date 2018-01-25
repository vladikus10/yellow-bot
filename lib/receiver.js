const _ = require('lodash');
const async = require('async');
const config = require('./config');
const bot = require('./bot');
const FormattedEvent = require('./classes/formattedEvent');

module.exports = (event) => {
  bot.getSender(event.sender.id).then((sender) => {
    sender.updateSession();
    sender.resetTimeouts();
    let formatedEvent = formatEvent(event);
    if(config().onNewMessage) config().onNewMessage(sender, formatedEvent, (error) => {
      if(error) throw error;
      emit(sender, formatedEvent);
    });
    else emit(sender, formatedEvent);
  }, (error) => {
    throw error;
  });
};

function formatEvent(event){
  let formatedEvent = null;
  if(_.has(event, 'postback')) formatedEvent = new FormattedEvent('postback', event.postback.payload);
  else if(_.has(event, 'message.attachments[0].payload.coordinates')) formatedEvent = new FormattedEvent('quick_reply_location', event.message.attachments[0].type, event.message.attachments[0].payload.coordinates);
  else if(_.has(event, 'message.quick_reply')) formatedEvent = new FormattedEvent('quick_reply', event.message.quick_reply.payload);
  else formatedEvent = new FormattedEvent('text', event.message.text);
  let split = formatedEvent.message.split('#');
  formatedEvent.message = split[0];
  if(!_.isUndefined(split[1])) formatedEvent.arg = split[1];
  return formatedEvent;
}

function emit(sender, event){
  //Check for stateless actions first
  const statelessReg = /^(\$)\w+\S$/g;
  let statelessCommands = bot._statelessCommands;
  let commands = bot._commands;
  if(config().stateless) statelessCommands = statelessCommands.concat(commands);
  if(event.type === 'text') {
    let result = checkCommands(statelessCommands, event.message);
    if(result) {
      sender.clearAnswer();
      return bot.emit(result, sender, event);
    }
  }
  else if((statelessReg.test(event.response))) {
    sender.clearAnswer();
    return bot.emit(event.message, sender, event);
  }

  //Check if the sender is answering a question
  let answer = sender._answerEvent;
  if(answer) return bot.emit(answer, sender, event);
  //Emit a normal event
  let state = null;
  if(!config().stateless) state = sender.state.toUpperCase();
  let eventName = event.message;
  //Check for commands
  if(event.type === 'text' && !config().stateless) {
    let result = checkCommands(commands, event.message);
    if(result) eventName = result;
    else eventName = 'TEXT';
  }
  else eventName = 'TEXT';
  //Check for registered events
  let index = bot._eventEmitter.eventNames().filter((e) => {
    if(`@${state}_${eventName}` || e === eventName) return true;
    return false;
  });
  if(index < 0) eventName = 'ELSE';
  if(!config().stateless) eventName = `@${state}_${eventName}`;
  bot.emit(eventName, sender, event);
}

function checkCommands(commands, message){
  for(let command of commands){
    for(let keyword of command.keywords){
      let accuracy = similarity(keyword, message);
      if(accuracy >= command.accuracy) return command.event;
    }
  }
  return null;
}

function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = [];
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
