// Lists the servers in the network

import ws from "ws";

import * as serverCache from "../serverCache";

module.exports = function(ws: ws, message, callback: Function): void {

  // Message is a list of servers, update the cache and the rest is done for us
  // See this method in the serverCache module
  serverCache.updateServerCache(message.servers);

  callback(null);
};
