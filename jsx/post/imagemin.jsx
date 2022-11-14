#target photoshop

(function(){

// - Only applies to PNGs
// - Uses `exportDirs` var supplied by Chopppy
// - Can alternatively be run in stand alone mode.

var compressDirs = {};
// Open the given file, and compress with TinyPNG.
function compressFile(file) {

  compressDirs[file.path] = true;

}



// Recursively compress files in the given folder, overwriting the originals.
function compressFolder(folder) {

  var children = folder.getFiles();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child instanceof Folder) {
      compressFolder(child);
    } else {
      compressFile(child)
    }
  }

  //app.system('bash '+psdContainingDir.split('%20').join(' ').split(' ').join('\\ ')+'jsx/post/publish_spritesheet.sh "'+spritesheetPath.split('%20').join(' ')+'"');

}

if (typeof exportDirs === 'undefined'){ // Run in standalone mode
  try {

    // Build list of output paths
    compressFolder(Folder.selectDialog("Compress PNGs folder with ImageMin (recursive)"));

  } catch(error) {
    alert("Error while processing: " + error);
  }
} else {

  if (exportDirs.length == 0){
    throw new Error('(imagemin) Prop `exportDirs` exists but is empty.');
  }

  for (var i = 0; i < exportDirs.length; i++){
    var dir = new Folder(exportDirs[i]);
    if (!dir.exists){
      throw new Error('(imagemin) Failed to open exportDirs found.');
    }
    compressFolder(dir);
  }

}

function cleanUnescapedPath(pathStr){
  pathStr = pathStr.split('/./').join('/')
  pathStr = pathStr.split('%20').join(' ')
  pathStr = pathStr.split(' ').join('\\ ')
  return pathStr;
}

function cleanEscapedPath(pathStr){
  pathStr = pathStr.split('/./').join('/')
  pathStr = pathStr.split('%20').join(' ')
  pathStr = pathStr.split(' ').join('__SPACE__')
  pathStr = pathStr.split('~/').join('__HOME__/')
  return pathStr; // '"' + pathStr + '"';
}

function writeTextFile( filePath, textContent, dontCreateFile ) {

  var file = new File( filePath );
  var fileExists = file.exists;
  if ( fileExists || !fileExists && dontCreateFile !== true ) {

    file.open('w'); // Opens a file for writing. If the file exists, its contents are destroyed. If the file does not exist, creates a new, empty file.
    file.encoding = 'UTF8';
    file.write( textContent );
    file.close();

  }
  else {
    return false;
  }

}

for (var compressDir in compressDirs){
  var _compressDir = cleanEscapedPath(compressDir)
  writeTextFile(cleanUnescapedPath(File($.fileName).path) + '/imagemin_exportdir.txt', _compressDir, false)
  var f = new File(File($.fileName).path + '/' + 'imagemin.sh');
  f.execute();
  $.sleep(500);

}


})();
