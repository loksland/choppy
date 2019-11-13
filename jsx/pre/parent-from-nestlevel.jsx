#target photoshop

// Set the `parent` prop to be the `base`, based on `nest` level prop. 

(function(){

var doc = app.activeDocument;
var lastBaseByNestLevel = [];

for (var i = 0; i < doc.layerComps.length; i++){
	
	var lyrcmp = doc.layerComps[doc.layerComps.length - 1 - i];
	var nestlevel = getCommentProp(lyrcmp, 'nestlevel');
	var nestlevelSet = nestlevel !== null
	nestlevel = !nestlevelSet ? 0 : Number(nestlevel);
	
	lastBaseByNestLevel[nestlevel] = lyrcmp.name;
	
	if (nestlevel > 0){
		setCommentProp(lyrcmp, 'parent', lastBaseByNestLevel[nestlevel-1]);
	}

}

//halt=true;

})();


