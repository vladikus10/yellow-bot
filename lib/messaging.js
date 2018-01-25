const FB = require('./facebook-graph-api');
const _ = require('lodash');
const messages = require('./messages');
const config = require('./config');

var messagesQueue = [];

function sendAction(clientID, action){
  var messageData = {
    recipient: {
      id: clientID
    },
    sender_action: action
  };
  callSendAPI(messageData);
}


module.exports.queue = (messageData) => {
  messagesQueue.push(messageData);
};

module.exports.init = (rate = 1000) => {
  setInterval(() => {
    var messages = _.uniqBy(messagesQueue, 'recipient.id');
    for(let msg of messages) handleMessage(msg);
  }, rate);
};

function handleMessage(msg){
  if(!msg) return;
  if(config().autoTypingAction && (msg.delay - Date.now()) > (config().autoTypingAction*1000) && msg.state === 'pending'){
    msg.state = 'typing';
    sendAction(msg.recipient.id, 'typing_on');
  }
  if(msg.delay < Date.now() &&(msg.state === 'pending' || msg.state === 'typing')){
    msg.state = 'sending';
    callSendAPI(msg);
  }
}

function callSendAPI(msg){
  FB.post('/me/messages', msg).then((result) => {
    removeMessage(msg);
  }, (error) => {
    removeMessage(msg);
    throw new Error(error);
  });
}

function removeMessage(msg) {
  let index = messagesQueue.indexOf(msg);
  if(index > -1) messagesQueue.splice(index, 1);
}
