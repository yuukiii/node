// Flags: --expose-internals
'use strict';
require('../common');
const assert = require('assert');
const { internalBinding } = require('internal/test/binding');
const {
  TCP,
  constants: TCPConstants,
  TCPConnectWrap
} = internalBinding('tcp_wrap');
const { ShutdownWrap } = internalBinding('stream_wrap');

function makeConnection() {
  const client = new TCP(TCPConstants.SOCKET);

  const req = new TCPConnectWrap();
  const err = client.connect(req, '127.0.0.1', this.address().port);
  assert.strictEqual(err, 0);

  req.oncomplete = function(status, client_, req_, readable, writable) {
    assert.strictEqual(0, status);
    assert.strictEqual(client, client_);
    assert.strictEqual(req, req_);
    assert.strictEqual(true, readable);
    assert.strictEqual(true, writable);

    const shutdownReq = new ShutdownWrap();
    const err = client.shutdown(shutdownReq);
    assert.strictEqual(err, 0);

    shutdownReq.oncomplete = function(status, client_, error) {
      assert.strictEqual(0, status);
      assert.strictEqual(client, client_);
      assert.strictEqual(error, undefined);
      shutdownCount++;
      client.close();
    };
  };
}

let connectCount = 0;
let endCount = 0;
let shutdownCount = 0;

const server = require('net').Server(function(s) {
  connectCount++;
  s.resume();
  s.on('end', function() {
    endCount++;
    s.destroy();
    server.close();
  });
});

server.listen(0, makeConnection);

process.on('exit', function() {
  assert.strictEqual(1, shutdownCount);
  assert.strictEqual(1, connectCount);
  assert.strictEqual(1, endCount);
});
