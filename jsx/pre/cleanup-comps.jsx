#target photoshop

// - Trim layercomp names 
// - Trim layercomp comment prop declarations
// - Remove empty layercomp comment lines 
// - Remove duplicate layaercomp props 

(function(){

var doc = app.activeDocument;
for (var i =0; i < doc.layerComps.length; i++){
	var lyrcmp = doc.layerComps[i];
	lyrcmp.name = trim(lyrcmp.name);
	var propLines = lyrcmp.comment ? lyrcmp.comment.split('\n') : [];
	var resultLines = [];
	var takenProps = {}
	for (var j = 0; j < propLines.length; j++){		
		var line = trim(propLines[j]);
		if (line.length > 0){
				var varParts = line.split(':');
				if (varParts.length == 1){
					resultLines.push(line); // May be alt declaration
				} else {
					varParts[0] = trim(varParts[0])
					if (varParts[0].length > 0){
						if (!takenProps[varParts[0]]){
							takenProps[varParts[0]] = true;
							varParts[1] = ' ' + trim(varParts[1]);
							resultLines.push(varParts.join(':'));
						}
					}
				}
		}
	}
	lyrcmp.comment = resultLines.join('\n')
	
}





})();

