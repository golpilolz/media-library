function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }
function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }
// Calls to the bundle's endpoints. They answer {"result": "success", …}; anything else
// (or an HTTP error) rejects with the server message, or the HTTP status.

var send = /*#__PURE__*/function () {
  var _ref = _asyncToGenerator(function* (url, init) {
    var response = yield fetch(url, init);
    var json = yield response.json().catch(() => null);
    if (!response.ok || (json == null ? void 0 : json.result) !== 'success') {
      var _json$message;
      throw new Error((_json$message = json == null ? void 0 : json.message) != null ? _json$message : "HTTP " + response.status);
    }
    return json;
  });
  return function send(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();
export var fetchJson = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator(function* (url) {
    var response = yield fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(response.status + " " + response.statusText);
    }
    return response.json();
  });
  return function fetchJson(_x3) {
    return _ref2.apply(this, arguments);
  };
}();
export var postJson = (url, body) => send(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  body: JSON.stringify(body)
});

// Same request as a Dropzone upload: multipart fields `file` and `folder`.
export var uploadFile = /*#__PURE__*/function () {
  var _ref3 = _asyncToGenerator(function* (url, file, name, folder) {
    var formData = new FormData();
    formData.append('file', file, name);
    formData.append('folder', String(folder));
    var json = yield send(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json'
      },
      body: formData
    });
    return {
      id: json.file.id,
      name: json.file.name,
      url: json.file.url
    };
  });
  return function uploadFile(_x4, _x5, _x6, _x7) {
    return _ref3.apply(this, arguments);
  };
}();