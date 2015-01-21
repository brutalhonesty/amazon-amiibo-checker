'use strict';

var request = require('request');
var aws2 = require('aws2');
var nodemailer = require('nodemailer');
var parser = require('xml2json');
var config = require('./config');
var OCARINA_ASIN = 'B003O6E800';
var OCARINA_URL = 'http://www.amazon.com/dp/B003O6E800';
var options = {
  host: 'webservices.amazon.com',
  path: '/onca/xml?Service=AWSECommerceService&Operation=ItemLookup&Availability=Available&ResponseGroup=Offers&IdType=ASIN&ItemId='+OCARINA_ASIN+'&AssociateTag=foobar'
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
    from: config.ocarina.from,
    to: config.ocarina.to,
    subject: config.ocarina.subject,
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
    var ocarinaOffers = body['ItemLookupResponse']['Items']['Item']['Offers']['TotalOffers'];
    if(ocarinaOffers > 0) {
      _email(OCARINA_URL);
    }
    if(ocarinaOffers === 0) {
      console.log('No offers for Ocarina of Time 3DS :(');
    }
  });
}, Math.floor(Math.random() * 10000) + 15000);