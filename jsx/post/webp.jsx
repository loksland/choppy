#target photoshop


// - Requires `brew install webp`
// - Docs: https://github.com/Intervox/node-webp/blob/latest/methods.json
// - Only applies to PNGs 
// - Uses choppy global `quality` for colour quality
// - Uses `exportDirs` var supplied by choppy
// - PNG is deleted 
// - Works with `template: webp`

(function(){



// Open the given file, and compress with TinyPNG. 
function compressFile(file) {

  var inputPath = file.fsName

  if (endsWith(inputPath, '.png')){

    var outputPath = inputPath.substring(0, inputPath.length - 4) + ".webp"

    var q = getGlobalProp('quality');
    if (!q){
      q = 90;
    }

    var m = 6  // compression method (0=fast, 6=slowest), default=4
    // var alpha_filter = "best" // predictive filtering for alpha plane, one of: none, fast (default) or best
    // var alpha_q = 100   // transparency-compression quality (0..100), default=100

    app.system("/opt/homebrew/bin/cwebp  -q "+String(q)+" -m "+String(m)+" '"+String(inputPath)+"' -o '"+String(outputPath)+"' && rm '"+String(inputPath)+"'")

  } else {
    console.log('(webp) Ignoring non-png image: ' + inputPath)
  }  

}

function convertBitDepth(bitdepth) {
  var id1 = charIDToTypeID("CnvM");
  var convert = new ActionDescriptor();
  var id2 = charIDToTypeID("Dpth");
  convert.putInteger(id2, bitdepth);
  executeAction(id1, convert, DialogModes.NO);
}

// Recursively compress files in the given folder, overwriting the originals. 
function compressFolder(folder) {
  var children = folder.getFiles();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child instanceof Folder) {
      compressFolder(child);
    } else {
      /* Only attempt to compress PNG files. */
      if (child.name.slice(-4).toLowerCase() == ".png") {
        compressFile(child);
      }
    }
  }
}


if (typeof exportDirs === 'undefined'){ // Run in standalone mode
  try {    
    compressFolder(Folder.selectDialog("Compress PNGs folder to WebP (recursive)"));
  } catch(error) {
    alert("Error while processing: " + error);
  }
} else {
  
  if (exportDirs.length == 0){
    throw new Error('(webp) Prop `exportDirs` exists but is empty.');
  }
  
  for (var i = 0; i < exportDirs.length; i++){
    var dir = new Folder(exportDirs[i]);
    if (!dir.exists){
      throw new Error('(webp) Failed to open exportDirs found.');
    }
    compressFolder(dir);
  }
  
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


})();






