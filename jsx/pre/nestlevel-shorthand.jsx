#target photoshop

// Set the `nest` prop. Multiple nest levels are also supported (eg. `--`,`---`).

(function(){

var NEST_CHAR = '-'

var doc = app.activeDocument;
var nestLevels = [];
var anyNestingDefined = false;
for (var i = 0; i < doc.layerComps.length; i++){
	var lyrcmp = doc.layerComps[i];
	var nm = lyrcmp.name;
	var nestLevel = 0;
	for (var j = 0; j < nm.length; j++){
		if (nm.charAt(j) == NEST_CHAR){
			nestLevel++;
			anyNestingDefined = true;
		} else {
			break;
		}
	}
	nestLevels.push(nestLevel);
	if (nestLevel > 0){
		lyrcmp.name = lyrcmp.name.substr(nestLevel)
	}
}
if (anyNestingDefined){
	for (var i = 0; i < nestLevels.length; i++){
		setCommentProp(doc.layerComps[i], 'nestlevel', String(nestLevels[i])); // Add temporary nest level prop
	}
}

})();

