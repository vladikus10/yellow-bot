const _ = require('lodash');
const bot = require('../bot');
const messaging = require('../messaging');
const messages = require('../messages');
const config = require('../config');

module.exports = class Sender {
  constructor(id, values = {}){
    this.id = id;
    this.first_name = values.first_name || null;
    this.last_name = values.last_name || null;
    this.profile_pic = values.profile_pic || null;
    this.locale = values.locale || 'en_US';
    this.gender = values.gender || null;
    this.state = values.state || config().defaultState || null;
    this._lastMessage = values.lastMessage || null;
    this._answerEvent = values.answerEvent || null;
    this._answerTime = values.answerTime || null;
    this._answerTimeout = null;
    this._answerTimeoutEvent = values.answerTimeoutEvent;
    this._warningMessage = values.warningMessage || null;
    this._warningTime = values.warningTime || null;
    this._warningTimeout =  null;
    this._sessionEnds = values.sessionEnds || null;
    this.payload = values.payload || null;
  }

  clearAnswer(){
    this._answerEvent = null;
    if(this._answerTimeout){
      clearTimeout(this._answerTimeout);
      this._answerTime = null;
      this._answerTimeoutEvent = null;
    }
    if(this._warningTimeout){
      clearTimeout(this._warningTimeout);
      this._warningMessage = null;
      this._warningTime = null;
    }
  }

  resetTimeouts(){
    if(this._answerTime){
      clearTimeout(this._answerTimeout);
      this._answerTimeout = setTimeout(() => {
        this.clearAnswer();
        bot.emit(this._answerTimeoutEvent, this);
      }, this._answerTime);
    }
    if(this._warningTime){
      clearTimeout(this._warningTimeout);
      this._warningTimeout = setTimeout(() => {
        this.sendTextMessage(this._warningMessage);
      }, this._warningTime);
    }
  }

  updateSession(){
    if(config().session) {
      if(config().onNewSession && !this._sessionEnds) config().onNewSession(this);
      this._sessionEnds = Date.now() + (config().session*60000);
    }
  }

  sendAction(action = 'typing_on'){
    let messageData = {
      recipient: {
        id: this.id
      },
      sender_action: action
    };
    messaging.queue(messageData);
  }

  sendTextMessage(text, options = {}){
    let message = {
      text: messages.get(this.locale, text, options.params)
    };
    this.send(message, options);
  }

  sendButtonTemplate(text, buttons, options = {}){
    let message = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: messages.get(this.locale, text, options.params),
          buttons: buttons
        }
      }
    };
    this.send(message, options);
  }

  sendGenericTemplate(text, elements, options = {}){
    let message = {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements
        }
      }
    };
    this.send(message, options);
  }

  send(message, options = {}){
    let delay = options.delay || 0;
    if(options.answered){
      this.clearAnswer();
    }
    if(options.forget){
      this._lastMessage = null;
    }
    if(options.remember){
      this._lastMessage = message;
    }
    if(options.answer){
      if(!options.answer.event) throw new Error('Answer event must be specified when using answer inside options');
      this._answerEvent = options.answer.event;
      if(options.answer.timeoutEvent){
        this._answerTimeoutEvent = options.answer.timeoutEvent;
        this._answerTime = options.answer.timeout * 1000;
        this._answerTimeout = setTimeout(() => {
          this.answer = null;
          bot.emit(this._answerTimeoutEvent, this);
        }, this._answerTime);
      }
      if(options.answer.warning){
        this._warningMessage = options.answer.warning.message;
        this._warningTime = options.answer.warning.delay * 1000;
        this._warningTimeout = setTimeout(() => {
          this.sendTextMessage(this._warningMessage);
        }, this._warningTime);
      }
    }
    let messageData = {
      recipient: {
        id: this.id
      },
      message: message,
      state: 'pending',
      delay: Date.now() + (delay*1000)
    };
    if(options.tag) messageData.tag = options.tag;
    if(options.quickReplies) messageData.message.quick_replies = options.quickReplies;
    if(_.isFunction(config().beforeSendMessage)){
      config().beforeSendMessage(this, messageData, (error) => {
        if(error) throw error;
        messaging.queue(messageData);
      });
    }
    else messaging.queue(messageData);
  }

  resend(msg){
    if(this._lastMessage){
      let message = this._lastMessage;
      if(msg){
        this.sendTextMessage(msg, {delay: 1});
      }
      this.send(message);
    }
  }
};

let optionsExmaple = {
  delay: 1,
  answer: {
    event: 'HANDLE_ANSWER',
    timeout: 60, //Seconds
    timeoutEvent: 'HANDLE_TIMEOUT',
    warning: {
      message: '#warning',
      delay: 30
    }
  },
  answered: true,
  remember: true,
  forget: false,
  quickReplies: []
};
