// Singleton to store EventEmitter for the module

import { EventEmitter } from "events";

const ee = new EventEmitter();

export default ee;
