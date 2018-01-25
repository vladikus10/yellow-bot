const xhub = require('express-x-hub');
const bodyParser = require('body-parser');
const receiver = require('./receiver');

module.exports = (config) => {
  const app = config.express.app;
  app.use(xhub({ algorithm: 'sha1', secret: config.appSecret }));
  app.use(bodyParser.json());
  //Webhook validation
  app.get(config.express.path, (req, res) => {
      if (req.query['hub.mode'] === 'subscribe' &&
  		req.query['hub.verify_token'] === config.tokens.verify) {
    		console.log("Validating webhook");
    		res.status(200).send(req.query['hub.challenge']);
      }
      else {
    		console.error("Failed validation. Make sure the validation tokens match.");
    		res.sendStatus(403);
      }
  });

  //Webhook for receiving FaceBook messages
  app.post(config.express.path, verifySingnature, (req, res) => {
  	var data = req.body;
  	// Make sure this is a page subscription
  	if (data.object === 'page') {
      // Iterate over each entry - there may be multiple if batched
      data.entry.forEach((entry) => {
        var pageID = entry.id;
        var timeOfEvent = entry.time;
        // Iterate over each messaging event
        entry.messaging.forEach((event) => {
    			if (event.message || event.postback) {
    				//console.log("Received message from: " + event.sender.id + " message: " + JSON.stringify(event));
    				receiver(event);
    			}
    			else {
    				console.log("Webhook received unknown message: ", JSON.stringify(message));
    			}
        });
      });
      res.sendStatus(200);
    }
  });
};

// Verify the signature of the webhook
function verifySingnature(req, res, next){
  let contains = req.isXHub;
  if(contains){
    let isValid = req.isXHubValid();
    if(isValid) next();
    else res.status(400).send({error: 'Signature is not valid'});
  }
  else res.status(400).send({error: 'Signature is not present'});
}
