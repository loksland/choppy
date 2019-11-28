#target photoshop

// If layer comp ends in `?` set `placeholder` to true.

(function(){

var doc = app.activeDocument;
for (var i =0; i < doc.layerComps.length; i++){
	var layerComp = doc.layerComps[i];
	
	// Shorthand props and flags in brackets
	
	var flags = [];
	var bPartsIn = layerComp.name.split('(');
	if (bPartsIn.length == 2){
		var bPartsOut = bPartsIn[1].split(')');
		if (bPartsOut.length == 2){
			var commaParts = bPartsOut[0].split(',');
			for (var j = 0; j < commaParts.length; j++){
				var colonParts = commaParts[j].split(':');
				if (colonParts.length == 2){
					setCommentProp(layerComp, trim(colonParts[0]), trim(colonParts[1]));
				} else { // Flag declaration
					flags.push(trim(commaParts[j]));
				}
			}
			bPartsOut.splice(0,1)
			bPartsIn[1] = bPartsOut.join('')
			layerComp.name = bPartsIn.join('');
		}
	}
	if (flags.length > 0){
		setCommentProp(layerComp, 'flags', flags.join(','));
	}
	
	// Extension

	var outputNameExt = getExt(layerComp.name).toLowerCase();
	if (outputNameExt.length > 0){
		if (VALID_OUTPUT_EXTS.indexOf(outputNameExt) > -1){
			setCommentProp(layerComp, 'ext', outputNameExt);						
		} else {
			if (outputNameExt == 'div' || outputNameExt == 'rect'){
				setCommentProp(layerComp, 'placeholder', 'true');		
			}
			setCommentProp(layerComp, 'type', outputNameExt);
		}
		layerComp.name = layerComp.name.substr(0, layerComp.name.length - outputNameExt.length - 1);
	}
	
	// Relative path 
	
	var path = layerComp.name.split('\\').join('/');
	var pathArr = path.split('/');
	if (pathArr.length > 1){		
		pathArr.splice(pathArr.length - 1, 1); 
		var relativePath = pathArr.join('/') + '/';
		setCommentProp(layerComp, 'relativePath', relativePath);
		layerComp.name = layerComp.name.substr(relativePath.length);
	}
	

	
}





})();

