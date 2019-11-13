#target photoshop

// If layer comp ends in `?` set `placeholder` to true.

(function(){

var doc = app.activeDocument;
for (var i =0; i < doc.layerComps.length; i++){
	var layerComp = doc.layerComps[i];
	
	// Extension

	var outputNameExt = getExt(layerComp.name).toLowerCase();
	if (outputNameExt.length > 0){
		if (outputNameExt == 'div'){
			setCommentProp(layerComp, 'placeholder', 'true');		
		}
		if (VALID_OUTPUT_EXTS.indexOf(outputNameExt) > -1){
			setCommentProp(layerComp, 'ext', outputNameExt);			
		} else {
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



function getExt(strPathOrFileName){
	var ext = '';
	strPathOrFileName = String(strPathOrFileName);
	var arr = strPathOrFileName.split('.');
	if (arr.length > 1){
		ext = arr[arr.length - 1];
	}
	return ext;
}


})();

