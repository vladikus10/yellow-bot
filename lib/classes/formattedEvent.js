module.exports = class FormattedEvent{
  constructor(type, message, arg){
    this.type = type || null;
    this.message = message || null;
    this.arg = arg || null;
  }
};
