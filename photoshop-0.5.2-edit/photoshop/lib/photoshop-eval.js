#!/usr/bin/env node

var lockFile = require('lockfile')
var Readable = require('readable-stream').Readable
var spawn = require('child_process').spawn
var functionToExtendScript = require('./functionToExtendScript')
function noop(){}

var lockPath = process.env.HOME + '/.evalInPhotoshop.lock'

var lockOptions = {
  wait: 5*1000,
  stale: 30*1000,
}

exports = module.exports = evalInPhotoshop

var UID = 0

evalInPhotoshop.NAME = null;

evalInPhotoshop.getName = function(){

  if (evalInPhotoshop.NAME == null) {
    try {
      ;(function(error, Applications){

      	if (Applications.indexOf('Adobe Photoshop 2025') != -1) evalInPhotoshop.NAME = "Adobe Photoshop 2025"; // LMN
        else if (Applications.indexOf('Adobe Photoshop 2024') != -1) evalInPhotoshop.NAME = "Adobe Photoshop 2024"; // LMN
        else if (Applications.indexOf('Adobe Photoshop 2023') != -1) evalInPhotoshop.NAME = "Adobe Photoshop 2023"; // LMN
        else if (Applications.indexOf('Adobe Photoshop 2022') != -1) evalInPhotoshop.NAME = "Adobe Photoshop 2022"; // LMN
        else if (Applications.indexOf('Adobe Photoshop 2021') != -1) evalInPhotoshop.NAME = "Adobe Photoshop 2021"; // LMN
        else if (Applications.indexOf('Adobe Photoshop 2020') != -1) evalInPhotoshop.NAME = "Adobe Photoshop 2020"; // LMN
        else if (Applications.indexOf('Adobe Photoshop CC 2018') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CC 2019"; // LMN
        else if (Applications.indexOf('Adobe Photoshop CC 2018') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CC 2018"; // LMN
        else if (Applications.indexOf('Adobe Photoshop CC 2017') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CC 2017"; // LMN
        else if (Applications.indexOf('Adobe Photoshop CC 2015') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CC 2015";
        else if (Applications.indexOf('Adobe Photoshop CC 2014') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CC 2014";
        else if (Applications.indexOf('Adobe Photoshop CC') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CC";
        else if (Applications.indexOf('Adobe Photoshop CS6') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CS6";
        else if (Applications.indexOf('Adobe Photoshop CS5') != -1) evalInPhotoshop.NAME = "Adobe Photoshop CS5";
      }(null, require('fs').readdirSync('/Applications')));
    } catch(e){}
  }
  return evalInPhotoshop.NAME;
}

function evalInPhotoshop(fn, args){
  var ID = ++UID
  var debugInfo

  if (exports.debug){
    debugInfo = {
      ID:ID,
    }
    console.warn('evalInPhotoshop', debugInfo, {
      name:evalInPhotoshop,
      fn:fn,
      args:args
    })
  }

  var readable = new Readable
  readable._read = function(size){
    readable._read = noop
    if (exports.debug) console.warn('_read', debugInfo)

    var script = functionToExtendScript(fn, args)
    var cliArgs = []

    cliArgs.push("-e", 'on run argv')
    cliArgs.push("-e", 'with timeout of 600 seconds') // LMN
    cliArgs.push("-e",   'tell application "' + evalInPhotoshop.getName() + '" to do javascript (item 1 of argv)' + (module.exports.debugger ? ' show debugger on runtime error' : ''))
    cliArgs.push("-e", 'end timeout') // LMN
    cliArgs.push("-e", 'end run')

    cliArgs.push(script)

    if (exports.debug) console.warn('WILL LOCK', debugInfo)

    lockFile.lock(lockPath, lockOptions, function(error, fileDescriptor){
      if (error){
        if (exports.debug) {debugInfo.error = error; console.warn('NOT LOCKED', debugInfo)}
        return readable.emit('error', error);
      }
      if (exports.debug) {console.warn('LOCKED', debugInfo)}
      if (exports.debug) {console.warn('spawn', debugInfo)}

      var child = spawn('/usr/bin/osascript', cliArgs)

      child.stdout.on('readable', function(){
        readable.push(this.read())
      })
      var _error = ''
      child.stderr.on('data', function(data){ _error += data })

      child.on('exit', function(code){
        if (exports.debug) {
          debugInfo.exitCode = code
          debugInfo.stderr = _error
          console.warn('spawn exit', debugInfo)
        }
        lockFile.unlock(lockPath, function(error){
          if (exports.debug) {
            debugInfo.exitCode = code
            debugInfo.error = error
            console.warn('UNLOCK', debugInfo)
          }
          readable.push(null)
          if (error) readable.emit('error', error);
          // if (_error && _error.indexOf('(-1750)') != -1) readable.emit('error', Error(_error));
          // else
          if (code) readable.emit('error', Error(_error));
        })
      })

    })
  }
  return readable
}

if (!module.parent){
  if (process.argv[2] == null){
    require('../test/test-photoshop-eval')
  }
  else {
    process.nextTick(function(){
      module.exports.debug = true
      module.exports(process.argv[2]).pipe(process.stdout)
    })
  }
}
