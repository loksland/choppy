#target photoshop

(function(){

// - Only applies to PNGs 
// - Uses `exportDirs` var supplied by Chopppy
// - Can alternatively be run in stand alone mode.

// Open the given file, and compress with TinyPNG. 
function compressFile(file) {
  var document = open(file);

  if (document.mode == DocumentMode.INDEXEDCOLOR) {
    document.changeMode(ChangeMode.RGB);
  }

  if (document.bitsPerChannel == BitsPerChannelType.SIXTEEN) {
    convertBitDepth(8);
  }

  var type = charIDToTypeID("tyPN"); // tyJP for JPEG 
  var percentage = 100;

  var tinypng = new ActionDescriptor();
  tinypng.putPath(charIDToTypeID("In  "), file); // Overwrite original! 
  tinypng.putEnumerated(charIDToTypeID("FlTy"), charIDToTypeID("tyFT"), type);
  tinypng.putUnitDouble(charIDToTypeID("Scl "), charIDToTypeID("#Prc"), percentage );

  var compress = new ActionDescriptor();
  compress.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);
  executeAction(charIDToTypeID("Expr"), compress, DialogModes.NO);

  document.close(SaveOptions.DONOTSAVECHANGES);
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
    compressFolder(Folder.selectDialog("Compress PNGs folder with TinyPNG (recursive)"));
  } catch(error) {
    alert("Error while processing: " + error);
  }
} else {
  
  if (exportDirs.length == 0){
    throw new Error('(tinypng) Prop `exportDirs` exists but is empty.');
  }
  
  for (var i = 0; i < exportDirs.length; i++){
    var dir = new Folder(exportDirs[i]);
    if (!dir.exists){
      throw new Error('(tinypng) Failed to open exportDirs found.');
    }
    compressFolder(dir);
  }
  
}


})();






