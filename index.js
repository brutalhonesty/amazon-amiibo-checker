'use strict';

var request = require('request');
var aws2 = require('aws2');
var nodemailer = require('nodemailer');
var parser = require('xml2json');
var config = require('./config');
var ASIN = 'B00N49RAXO'; // Amiibo Parent ASIN
var PARENT_URL = 'http://www.amazon.com/dp/B00N49RAXO';
var options = {
  host: 'webservices.amazon.com',
  path: '/onca/xml?Service=AWSECommerceService&Operation=ItemLookup&Availability=Available&ResponseGroup=VariationMatrix&IdType=ASIN&ItemId='+ASIN+'&AssociateTag=foobar'
};

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
      user: config.gmail.user,
      pass: config.gmail.pass
  }
});

function _email(link) {
  var mailOptions = {
    from: config.gmail.from,
    to: config.gmail.to,
    subject: config.gmail.subject,
    text: link
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if(error) {
      console.log(error);
    }
    console.log(info);
    clearInterval(checkInterval);
  });
}

var checkInterval = setInterval(function () {
  aws2.sign(options, {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  });
  request("https://" + options.host + options.path, function (error, resp, body) {
    if(error) {
      console.log(error);
    }
    if(resp.statusCode !== 200) {
      console.log(body);
    }
    body = parser.toJson(body);
    body = JSON.parse(body);
    var amiiboCount = body['ItemLookupResponse']['Items']['Item']['Variations']['TotalVariations'];
    if(amiiboCount !== 18) {
      _email(PARENT_URL);
    } else {
      console.log('Nothing new :(');
    }
  });
}, Math.floor(Math.random() * 7000) + 20000);