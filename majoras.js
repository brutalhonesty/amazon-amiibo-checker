'use strict';

var request = require('request');
var aws2 = require('aws2');
var nodemailer = require('nodemailer');
var parser = require('xml2json');
var config = require('./config');
var SKULLKID_ASIN = 'B00RUMLPTG';
var THREEDS_ASIN = 'B00S8IGG4U';
var SKULLKID_PARENT_URL = 'http://www.amazon.com/dp/B00RUMLPTG';
var THREEDS_PARENT_URL = 'http://www.amazon.com/dp/B00S8IGG4U';
var options = {
  host: 'webservices.amazon.com',
  path: '/onca/xml?Service=AWSECommerceService&Operation=ItemLookup&Availability=Available&ResponseGroup=Offers&ItemLookup.Shared.IdType=ASIN&ItemLookup.1.ItemId='+SKULLKID_ASIN+'&ItemLookup.2.ItemId='+THREEDS_ASIN+'&AssociateTag=foobar'
};

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
      user: config.gmail.user,
      pass: config.gmail.pass
  }
});

function _email(link, type) {
  var mailOptions = {
    from: type === 'skull' ? config.skullkid.from : config.threeDS.from,
    to: type === 'skull' ? config.skullkid.to : config.threeDS.to,
    subject: type === 'skull' ? config.skullkid.subject : config.threeDS.subject,
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
    var skullKidOffers = body['ItemLookupResponse']['Items'][0]['Item']['Offers']['TotalOffers'];
    var threeDsOffers = body['ItemLookupResponse']['Items'][1]['Item']['Offers']['TotalOffers'];
    if(skullKidOffers > 0) {
      _email(SKULLKID_PARENT_URL, 'skull');
    }
    if(threeDsOffers > 0) {
      _email(THREEDS_PARENT_URL, '3ds');
    }
    if(skullKidOffers === 0 && threeDsOffers === 0) {
      console.log('No offers for Majora\'s Mask 3DS Bundle or 3DS XL System :(');
    }
  });
}, Math.floor(Math.random() * 10000) + 15000);