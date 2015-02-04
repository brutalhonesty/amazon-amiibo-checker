'use strict';

var request = require('request');
var aws2 = require('aws2');
var nodemailer = require('nodemailer');
var parser = require('xml2json');
var cheerio = require('cheerio');
var config = require('./config');
var PARENT_ASIN = 'B00N49RAXO'; // Amiibo Parent ASIN
var PARENT_URL = 'http://www.amazon.com/dp/B00N49RAXO';
var recentlySent = false;
var recentTime = 0;
var recentCount = 0;
var options = {
  host: 'webservices.amazon.com',
  path: '/onca/xml?Service=AWSECommerceService&Operation=ItemLookup&Condition=All&ResponseGroup=Variations&IdType=ASIN&ItemId='+PARENT_ASIN+'&AssociateTag=foobar'
};

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: config.gmail.user,
    pass: config.gmail.pass
  }
});


function _createBody(amiiboList, callback) {
  var $ = cheerio.load('<table></table>');
  $('table').append('<tr><th>Name</th><th>ASIN</th><th>Type</th><th>EAN</th><th>UPC</th><th>Amazon Offer?</th><th>Merchant</th><th>Offer Type</th><th>Link</th></tr>');
  for(var i = 0; i < amiiboList.length; i++) {
    amiiboList[i].hasAmazonOffer = amiiboList[i].hasAmazonOffer ? ('<b>' + amiiboList[i].hasAmazonOffer + '</b>') : amiiboList[i].hasAmazonOffer;
    amiiboList[i].merchant = amiiboList[i].hasAmazonOffer ? ('<b>' + amiiboList[i].merchant + '</b>') : amiiboList[i].merchant;
    $('table').append('<tr><td>'+ amiiboList[i].name + '</td><td>' + amiiboList[i].asin + '</td><td>'+ amiiboList[i].type + '</td><td>'+ amiiboList[i].ean + '</td><td>'+ amiiboList[i].upc + '</td><td>'+ amiiboList[i].hasAmazonOffer + '</td><td>' + amiiboList[i].merchant + '</td><td>'+ amiiboList[i].offerType + '</td><td>'+ 'http://www.amazon.com/dp/' + amiiboList[i].asin + '</td></tr>')
  }
  return callback(null, $.html());
}

function _email(body) {
  var mailOptions = {
    from: config.amiibo.from,
    to: config.amiibo.to,
    subject: config.amiibo.subject,
    html: body
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if(error) {
      console.log(error);
    }
    console.log(info);
    // clearInterval(checkInterval);
  });
}

var checkInterval = setInterval(function () {
  var now = Date.now(Date.UTC());
  if(now - recentTime > 1200000) {
    recentlySent = false;
  }
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
    if(body['ItemLookupResponse']['Items']['Request']['IsValid']) {
      var totalVariations = body['ItemLookupResponse']['Items']['Item']['Variations']['TotalVariations'];
      var amiibos =  body['ItemLookupResponse']['Items']['Item']['Variations']['Item'];
      var amiiboList = [];
      for (var i = 0; i < amiibos.length; i++) {
        var amiibo = amiibos[i];
        var asin = amiibo['ASIN'];
        var type = amiibo['ItemAttributes']['Edition'];
        var name = amiibo['ItemAttributes']['Color'];
        var ean = amiibo['ItemAttributes']['EAN'];
        var upc = amiibo['ItemAttributes']['UPC'];
        var hasAmazonOffer = null;
        var offerType = null;
        var merchant = null;
        if(amiibo['Offers']['Offer'] instanceof Array) {
          merchant = amiibo['Offers']['Offer'][0]['Merchant']['Name'];
          hasAmazonOffer = (merchant === 'Amazon.com');
          if(amiibo['Offers']['Offer'][0]['OfferListing']['AvailabilityAttributes']['IsPreorder']) {
            offerType = 'PREORDER';
          } else if(amiibo['Offers']['Offer'][0]['OfferListing']['AvailabilityAttributes']['AvailabilityType'] === 'now' && !amiibo['Offers']['Offer'][0]['OfferListing']['AvailabilityAttributes']['IsPreorder']) {
            offerType = 'AVAILABLE';
          }
        } else {
          merchant = amiibo['Offers']['Offer']['Merchant']['Name'];
           hasAmazonOffer = (merchant === 'Amazon.com');
          if(amiibo['Offers']['Offer']['OfferListing']['AvailabilityAttributes']['IsPreorder']) {
            offerType = 'PREORDER';
          } else if(amiibo['Offers']['Offer']['OfferListing']['AvailabilityAttributes']['AvailabilityType'] === 'now' && !amiibo['Offers']['Offer']['OfferListing']['AvailabilityAttributes']['IsPreorder']) {
            offerType = 'AVAILABLE';
          }
         }
         amiiboList.push({
           asin: asin,
           name: name,
           type: type,
           ean: ean,
           upc: upc,
           hasAmazonOffer: hasAmazonOffer,
           offerType: offerType,
           merchant: merchant
         });
      };
      if(!recentlySent && recentCount !== amiiboList.length) {
        _createBody(amiiboList, function (error, emailBody) {
          _email(emailBody);
          recentlySent = true;
          recentTime = Date.now(Date.UTC());
          recentCount = amiiboList.length;
        });
      } else {
        console.log('No new Amiibo :(');
      }
    }
  });
}, Math.floor(Math.random() * 7000) + 20000);