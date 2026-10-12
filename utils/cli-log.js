"use strict";

function createLogger(scope) {
  function write(level, stream, message) {
    stream(`[${scope}] [${level}] ${message}`);
  }

  return {
    info(message) {
      write("info", console.log, message);
    },
    warn(message) {
      write("warn", console.warn, message);
    },
    success(message) {
      write("ok", console.log, message);
    },
    error(message) {
      write("error", console.error, message);
    }
  };
}

module.exports = { createLogger };
