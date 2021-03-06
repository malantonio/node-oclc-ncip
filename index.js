module.exports = NCIP;

var WSKey = require('oclc-wskey');
var util = require('./xml-util');
var noop = function(){};

var STAFF_URL = 'https://circ.sd00.worldcat.org/ncip';

function NCIP (agencyID, wskey) {

  if ( !(this instanceof NCIP) ) return new NCIP(agencyID, wskey);
  
  if ( !(wskey instanceof WSKey) ) {
    if ( typeof wskey === 'object' && wskey.public && wskey.secret ) {
      wskey = new WSKey(wskey.public, wskey.secret, wskey.user || {});
    }
  }

  this.agencyID = agencyID;
  this.wskey = wskey;
}

NCIP.prototype.cancelRequestBibItem = function(bibNumber, userID, cb) {
  var opt = {};
  if ( typeof bibNumber === 'object' ) {
    opt = bibNumber;
    cb = userID;

    bibNumber = opt.bibNumber || opt.requestID;
    userID = opt.userID
  }

  return this.cancelRequestItem(bibNumber, userID, 'Bibliographic Item', cb);
}

NCIP.prototype.cancelRequestItem = function(requestID, userBarcode, requestScope, cb) {
  var opt = {}, data;

  // cancelRequestItem({/* ... */}, cb(err, resp){});
  if ( typeof reqID === 'object' ) {
    opt = reqID;
    userBarcode = opt.userBarcode || opt.userID;
    requestID = opt.requestID || opt.itemBarcode || opt.oclcNumber;
    requestScope = opt.requestScope;

    if ( !requestID ) {
      throw Error(
        'When passing an object to cancelRequestItem, ' +
        '\'requestID\' or \'itemBarcode\' must be present '
      );
    }
  } 

  // cancelRequestItem(reqID, userBarcode, cb(){})
  else if ( typeof requestScope === 'function' ) {
    // default RequestScope to 'Item' if it's not provided
    cb = requestScope;
    requestScope = 'Item';
  }

  var agencyID = opt.agencyID || this.agencyID
    , wskey = opt.wskey || this.wskey
    , cb = cb || noop
    , requestType = opt.requestType || 'Hold'
    , url = STAFF_URL + '?inst=' + agencyID
    ;

  if ( !wskey.hasUser() ) {
    throw Error('WSKey must have a user with a principalID and principalIDNS to request an item');
  } else {
    url += '&principalID=' + wskey.user.principalID
        +  '&principalIDNS=' + wskey.user.principalIDNS
        ;
  }

  data = [
    util.xmlHeader(),
    '<NCIPMessage xmlns="http://www.niso.org/2008/ncip" xmlns:ncip="http://www.niso.org/2008/ncip" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ncip:version="http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd" xsi:schemaLocation="http://www.niso.org/2008/ncip http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd">',
      '<CancelRequestItem>',
      util.initiationHeader(agencyID),
      util.userID(userBarcode, agencyID),
      util.tag('RequestType', requestType),
      util.tag('RequestScopeType', requestScope)
  ];

  var requestIDregex = /\w{8}-\w{4}-\w{4}-\w{12}/i;
  var isReqID = requestIDregex.test(requestID || itemBarcode);

  if ( isReqID ) {
    data.push('<RequestId>');
      data.push(util.tag('AgencyId', agencyID));
      data.push(util.tag('RequestIdentifierValue', requestID));
    data.push('</RequestId>');
  } else {
    if ( requestType === 'Item' ) {
      data.push(util.itemID(requestID, agencyID));
    } else if ( requestType === 'Bibliographic Item' ) {
      data.push(util.bibID(requestID));
    }
  }

    data.push('</CancelRequestItem>');
  data.push('</NCIPMessage>');

  return sendRequest({
    url: url,
    method: 'POST',
    wskey: wskey,
    data: data.join(''),
    ignoreTags: ['CancelRequestItemResponse'],
    callback: cb
  })
}

NCIP.prototype.checkInItem = function(branchID, itemBarcode, cb) {
  var opts = {};

  if ( typeof branchID === 'object' ) {
    opts = branchID;
    cb = itemBarcode;
    branchID = opts.branchID;
    itemBarcode = opts.itemBarcode;
  }

  var agencyID = opts.agencyID || this.agencyID
    , wskey = opts.wskey || this.wskey
    , url = STAFF_URL + '?inst=' + agencyID
    , data
    ;

  if ( !wskey.hasUser() ) {
    throw Error('WSKey must have a user with a principalID and principalIDNS to request an item');
  } else {
    url += '&principalID=' + wskey.user.principalID
        +  '&principalIDNS=' + wskey.user.principalIDNS
        ;
  }

  data = [
    util.xmlHeader(),
      '<NCIPMessage xmlns="http://www.niso.org/2008/ncip" xmlns:ncip="http://www.niso.org/2008/ncip" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ncip:version="http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd" xsi:schemaLocation="http://www.niso.org/2008/ncip http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd">',
        '<CheckInItem>',
          util.initiationHeader(branchID),
          util.itemID(itemBarcode, agencyID),
        '</CheckInItem>',
      '</NCIPMessage>'
  ];

  return sendRequest({
    url: url,
    method: 'POST',
    wskey: wskey,
    data: data.join(''),
    ignoreTags: ['CheckInItemResponse'],
    callback: cb
  });

};

NCIP.prototype.checkOutItem = function(branchID, itemBarcode, userBarcode, dueDate, cb) {

  // checkOutItem({/* ... */}, function(){})
  if ( typeof branchID === 'object' ) {
     opts = branchID;
     cb = itemBarcode;
     branchID = opts.branchID;
     itemBarcode = opts.itemBarcode;
     userBarcode = opts.userBarcode;
     dueDate = opts.dueDate;
  } 

  // checkOutItem(itemBarcode, userBarcode, function(){})
  else if ( typeof dueDate === 'function' ) {
    cb = dueDate;
    dueDate = null;
  }

  var opts = opts || {}
    , agencyID = opts.agencyID || this.agencyID
    , wskey = opts.wskey || this.wskey
    , dueDate = opts.dueDate || dueDate
    , url = STAFF_URL + '?inst=' + agencyID
    , data
    ;

  if ( !wskey.hasUser() ) {
    throw Error('WSKey must have a user with a principalID and principalIDNS to request an item');
  } else {
    url += '&principalID=' + wskey.user.principalID
        +  '&principalIDNS=' + wskey.user.principalIDNS
        ;
  }

  data = [
    util.xmlHeader(),
      '<NCIPMessage xmlns="http://www.niso.org/2008/ncip" xmlns:ncip="http://www.niso.org/2008/ncip" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ncip:version="http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd" xsi:schemaLocation="http://www.niso.org/2008/ncip http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd">',
        '<CheckOutItem>',
          util.initiationHeader(branchID),
          util.userID(userBarcode, agencyID),
          util.itemID(itemBarcode, agencyID),
          util.tag('ItemElementType', 'Bibliographic Description'),
          util.tag('ItemElementType', 'Circulation Status'),
          util.tag('ItemElementType', 'Item Description'),
          util.tag('ItemElementType', 'Location')
  ];

  if ( dueDate ) {
    if ( !(dueDate instanceof Date) ) {
      dueDate = new Date(Date.parse(dueDate));
      if ( isNaN(dueDate) ) throw Error('dueDate must be a Date object or a parseable date string');
    }

    data.push(util.tag('DesiredDueDate', dueDate.toISOString()));
  }

    data.push('</CheckOutItem>');
  data.push('</NCIPMessage>');

  return sendRequest({
    url: url,
    method: 'POST',
    wskey: wskey,
    data: data.join(''),
    ignoreTags: ['CheckOutItemResponse'],
    callback: cb
  });
};

NCIP.prototype.requestBibItem = function(oclcNumber, userBarcode, pickupLocation, cb) {
  var opt;

  if ( typeof oclcNumber === 'object' ) {
    opt = oclcNumber;
    cb = typeof userBarcode === 'function' ? userBarcode : noop;
    
    opt.requestScope = 'Bibliographic Item';

  } else {
    opt = {
      oclcNumber: oclcNumber,
      userBarcode: userBarcode,
      pickupLocation: pickupLocation,
      requestScope: 'Bibliographic Item'
    }
  }

  return this.requestItem(opt, cb);
}

NCIP.prototype.requestItem = function(itemBarcode, userBarcode, pickupLocation, cb) {
  var url = STAFF_URL;
  var opt = {};

  if ( typeof itemBarcode === 'object' ) {
    opt = itemBarcode;
    cb = userBarcode || noop;

    itemBarcode = opt.itemBarcode || opt.oclcNumber;
    userBarcode = opt.userBarcode;
    pickupLocation = opt.pickupLocation;
  }

  var agencyID = opt.agencyID || this.agencyID
    , wskey = opt.wskey || this.wskey
    , requestType = opt.requestType || 'Hold'
    , requestScope = opt.requestScope || 'Item'
    , earliestDateNeeded = opt.earliestDateNeeded
    , needBeforeDate = opt.needBeforeDate
    , data 
    ;

  if ( !pickupLocation || typeof pickupLocation === 'function' ) {
    throw Error('requestItem and requestBibItem require a pickupLocation (branch identifier)');
  }

  url += '?inst=' + agencyID;

  if ( !wskey.hasUser() ) {
    throw Error('WSKey must have a user with a principalID and principalIDNS to request an item');
  } else {
    url += '&principalID=' + wskey.user.principalID
        +  '&principalIDNS=' + wskey.user.principalIDNS
        ;
  }

  data = [
    util.xmlHeader(),
    '<NCIPMessage xmlns="http://www.niso.org/2008/ncip" xmlns:ncip="http://www.niso.org/2008/ncip" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ncip:version="http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd" xsi:schemaLocation="http://www.niso.org/2008/ncip http://www.niso.org/schemas/ncip/v2_01/ncip_v2_01.xsd">',
      '<RequestItem>',
        util.initiationHeader(agencyID),
        util.userID(userBarcode, agencyID),
        util.tag('RequestType', requestType),
        util.tag('RequestScopeType', requestScope),
        util.tag('PickupLocation', pickupLocation),
        util.tag('ItemElementType', 'Location')
  ];

  if ( requestScope === 'Item' ) {
    data.push(util.itemID(itemBarcode, agencyID));
  } else if ( requestScope === 'Bibliographic Item' ) {
    data.push(util.bibID(itemBarcode));
  } else {
    throw Error('RequestItem requires a requestScope of either \'Item\' or \'Bibliographic Item\'');
  }

  if ( earliestDateNeeded ) {
    if ( !(earliestDateNeeded instanceof Date) ) {
      earliestDateNeeded = new Date(Date.parse(earliestDateNeeded));
      if ( isNaN(earliestDateNeeded) ) {
        throw Error('earliestDateNeeded must be a Date object or a parseable date string');
      }
    }
    data.push(util.tag('EarliestDateNeeded', earliestDateNeeded.toISOString()));
  }

  if ( needBeforeDate ) {
    if ( !(needBeforeDate instanceof Date) ) {
      needBeforeDate = new Date(Date.parse(needBeforeDate));
      if ( isNaN(needBeforeDate) ) {
        throw Error('needBeforeDate must be a Date object or a parseable date string'); 
      }
    }
    data.push(util.tag('NeedBeforeDate', needBeforeDate.toISOString()));
  }

    data.push('</RequestItem>');
  data.push('</NCIPMessage>');

  return sendRequest({
    url: url,
    method: 'POST',
    wskey: wskey,
    data: data.join(''),
    ignoreTags: ['RequestItemResponse'],
    callback: cb
  });
}

/**
 *  wrapper for `request` to handle responses in a repeatable way
 *
 *
 */

function sendRequest(opt, cb) {
  var request = require('request')
    , method = opt.method
    , url = opt.url
    , wskey = opt.wskey
    , data = opt.data
    , cb = opt.callback || cb || noop
    , ignore = opt.ignoreTags || []
    ;

  request({
    uri: url,
    method: method,
    headers: {
      'Authorization': wskey.HMACSignature(method, url),
      'Accept': 'application/json',
      'Content-type': 'application/xml'
    },
    body: data
  }, function(err, resp, body) {
    if ( err ) return cb(err, null);

    if (resp.statusCode === 401) {
      return cb({
        'code': {
          'value': 401,
          'type': null
        },
        'message': 'Unauthorized',
        'detail': 'This request requires HTTP authentication (Unauthorized)'
      }, null);
    } else if (resp.statusCode === 404) {
      return cb({
        'code': {
          'value': 404,
          'type': null
        },
        'message': 'Not Found',
        'detail': 'The requested resource () is not available.'
      }, null);
    } else {
      var parsed = util.parseXMLResponse(body, ignore);
      if ( parsed.problem ) {
        return cb({
          'code': {
            'value': 400,
            'type': null
          },
          'message': parsed.problem.problemType,
          'detail': parsed.problem.problemDetail || parsed.problem.problemType
          }, null);
      } else return cb(null, parsed);
    }
  });
}
