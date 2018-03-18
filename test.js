#! /usr/bin/env node

var photoshop = require('photoshop');
var fs = require('fs'); 	
var path = require('path');


/*

function recentFilesThatExist_jsx(){

  return 'hola'; // app.recentFiles.map(File).filter(function(file){return file.exists})
}

require('photoshop').invoke(recentFilesThatExist_jsx, function(error, recentFiles){
  console.log(arguments);
})

*/

/*



function streamColorChanges_jsx(writeStream, setColor_jsx, color){
  writeStream.write(setColor_jsx(color));
  alert("Photoshop won't return until this window is closed, but the stream already sent its data!");
}

var readStream = require('photoshop').createStream(streamColorChanges_jsx, [setColor_jsx, color]);

readStream.pipe(process.stdout);

readStream.on('end', function(){
  console.log('Done!')
});

*/

var color = {
  red: Math.random() * 255,
  green: Math.random() * 255,
  blue: Math.random() * 255
}

require('photoshop').invoke(setColor_jsx, [color], function(error, foregroundColor){
  console.log('#' + foregroundColor)
})

function setColor_jsx(color){
  app.foregroundColor.rgb.red = color.red
  app.foregroundColor.rgb.green = color.green
  app.foregroundColor.rgb.blue = color.blue
  return app.foregroundColor.rgb.hexValue
}


