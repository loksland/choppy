#target photoshop

// - Converts top level layers/layer groups to comps.
// - Needs to be added to `pre` to be queued.
// - Top level `{reg}` layers will be included with top level layer below.
// - Comment prefixed layer names will be ignored 
// - Layer sets supported

(function(){

var doc = app.activeDocument;

if (doc.layerComps.length > 0){
	throw new Error('(layers-to-comps) Cannot convert layers to comps as existing comp/s already exist.')
}

deleteAllNonTopLevelCommentedLayers(doc);

setAllLayerVis(doc, false);

var reg = null;
for (var i = 0; i < doc.layers.length; i++) {
	
	var layer = doc.layers[i];
	
	if (IGNORE_PREFIX_CHARS[layer.name.charAt(0)]) {
		
		// Ignore
		
	} else if (layer.name == REG_LAYER_NAME){
		
		reg = layer;
		
	} else {
	
		if (reg){
			setAllLayerVis(reg, true);
		}
	
		setAllLayerVis(layer, true);
		var comment = '';
		var appearance = false;
		var position = false;
		var visibility = true;
		doc.layerComps.add(layer.name, comment, appearance, position, visibility);
		setAllLayerVis(layer, false);
		
		if (reg){
			setAllLayerVis(reg, false);
		}
		
		reg = null;
		
	}
	
}

function deleteAllNonTopLevelCommentedLayers(ref, _lvl) {
	
	_lvl = typeof _lvl !== 'undefined' ? _lvl : 0;
	
  for (var i = 0; i < ref.layers.length; i++) {
      var layer = ref.layers[i];
      if (layer.typename == 'LayerSet') {
      	if (IGNORE_PREFIX_CHARS[layer.name.charAt(0)]){
      		setSelectedLayer(layer.name);
      		layer.remove();
      		i--;
      	} else {
      		deleteAllNonTopLevelCommentedLayers(layer, _lvl + 1);
      	}
      } else if (_lvl > 0){ // Don't delete top level layers
      	if (IGNORE_PREFIX_CHARS[layer.name.charAt(0)]){
      		setSelectedLayer(layer.name);
      		layer.remove();
      		i--;
      	}
      }
  }

}

function setSelectedLayer( layerIndexOrName ) {
	try {
		var id239 = charIDToTypeID( "slct" );
		var desc45 = new ActionDescriptor();
		var id240 = charIDToTypeID( "null" );
		var ref43 = new ActionReference();
		var id241 = charIDToTypeID( "Lyr " );
		if ( typeof layerIndexOrName == "number" ) {
			ref43.putIndex( id241, layerIndexOrName );
		} else {
			ref43.putName( id241, layerIndexOrName );
		}
		desc45.putReference( id240, ref43 );
		var id242 = charIDToTypeID( "MkVs" );
		desc45.putBoolean( id242, false );
		executeAction( id239, desc45, DialogModes.NO );
	}catch(e) {
		; // do nothing
	}
}

// `ref` can be document, layer group, layer 
function setAllLayerVis(ref, isVisible) {
		
		if (ref.typename == 'ArtLayer') {
			ref.visible = isVisible;
			return;
		} else if (ref.typename == "LayerSet"){
			ref.visible = isVisible;
		}
		
    var len = ref.layers.length;
    for (var i = 0; i < len; i++) {
        var layer = ref.layers[i];
        layer.visible = isVisible;
        if (layer.typename == 'LayerSet') {
        	setAllLayerVis(layer, isVisible);
        }
    }
		
}

})();


