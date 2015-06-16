/*
 * Copyright 2015 Paradone
 *
 * This file is part of Paradone <https://paradone.github.io>
 *
 * Paradone is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Paradone is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public
 * License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Paradone.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @flow weak
 */
'use strict'

export default Signal

/**
 * Client-side implementation of Signal working with the ParadoneServer.
 *
 * @class Signal
 * @param {Peer} peer
 * @param {Object} options
 *
 * @property {WebSocket} socket - Connection to the signaling system
 * @property {string} url - Url of the WebSocket
 * @property {RTCDataChannelState} readyState - State of the connection with the
 *           socket server mapped as a RTCDataChannelState (strings insteand of
 *           constant integer)
 */
function Signal(peer, options) {
  if(typeof options === 'undefined' ||
     typeof options.url === 'undefined') {
    throw new Error('Signal\'s options argument malformed')
  }
  let url = options.url
  let socket = new WebSocket(url)

  socket.addEventListener('error', error => console.error(error))
  socket.addEventListener('message', event => {
    let message = JSON.parse(event.data)
    peer.dispatchMessage(message)
  })

  this.socket = socket
  this.url = url

  // If the signal is connected to a Heroku instance the connection will be
  // closed by the server after 30 seconds of inactivity
  if(url.indexOf('herokuapp') !== -1) {
    activateKeepAlive(socket, peer.id)
  }

}

// Bind readyState to the readyState of the socket
Object.defineProperty(Signal.prototype, 'readyState', {
  get: function() {
    switch(this.socket.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting'
    case WebSocket.OPEN:
      return 'open'
    case WebSocket.CLOSING:
      return 'closing'
    case WebSocket.CLOSED:
      return 'closed'
    default:
      throw new Error('Unknown `readyState` for the WebSocket')
    }
  }
})

/**
 * Sends message to the signaling system
 *
 * @function Signal#send
 * @param {Message} message
 */
Signal.prototype.send = function(message) {
  message.ttl = 0
  message = JSON.stringify(message)
  this.socket.send(message)
}

/**
 * Contact the signaling server every now and then to ensure the communication
 * is not closed due to inactivity
 *
 * @param {WebSocket} socket - The socket we need to keep open
 * @param {string} id - Id of the peer
 */
var activateKeepAlive = function(socket, id) {
  let keepalive = window.setInterval(() => {
    socket.send(JSON.stringify({
      type: 'signal:keepalive',
      from: id,
      to: 'signal',
      data: ''
    }))
  }, 30000)
  socket.addEventListener('close', () => window.clearInterval(keepalive))
}
