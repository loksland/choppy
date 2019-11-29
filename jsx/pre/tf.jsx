#target photoshop

// - If and layer comps with `type` set to `tf`:
// - Will find first text field and try to extract info to `tfParams`.

(function(){

	
var processTFs = function(){

	var doc = app.activeDocument;
	for (var i =0; i < doc.layerComps.length; i++){
		var layerComp = doc.layerComps[i];	
		var type = getCommentProp(layerComp, 'type');
		if (type == 'tf' || type == 'btn'){
			
			setCommentProp(layerComp, 'placeholder', 'true');
			layerComp.apply();
			var tf = getFirstVisibleTextField(doc);
			if (!tf){
				//if (type != 'btn'){ // Buttons may not have a text field.
				throw new Error('(tf) Text field not found.');
				//}
			} else {
				
				// 1/3)
				// See: _2_CSS.jsx `cssToClip.getTextLayerCSS = function(` ...
				
				var tfParams = {};
				
				// Save the visible bounds 
				
				var tfVisBounds = getLayerBoundsRect(tf);
				
				tfParams.visBoundsTLX = tfVisBounds.x;
				tfParams.visBoundsTLY = tfVisBounds.y;
				tfParams.visBoundsW = tfVisBounds.width;
				tfParams.visBoundsH = tfVisBounds.height;
				
				
				tfParams.text = tf.textItem.contents
				tfParams.font = tf.textItem.font
				
				//tfParams.fontSize = tf.textItem.size
				tfParams.alpha = Math.round((tf.opacity*tf.fillOpacity)/100.0)/100.0;
				tfParams.color = '#' + tf.textItem.color.rgb.hexValue
				// NOTE: background layers will break indexing
							
				// 2/3) Get deeper font info.
				// See: https://github.com/hecht-software/psd-to-html-exporter/blob/master/psd-to-html-exporter.jsx
				
		    app.activeDocument.activeLayer = tf;
					
				var ref = new ActionReference();
				ref.putEnumerated(sTID("layer"), cTID("Ordn"), cTID("Trgt"));
				var desc = executeActionGet(ref);
				
				var list = desc.getObjectValue(cTID("Txt ")) ;
		    var tsr = list.getList(cTID("Txtt"));
			
				var   tsr0 = tsr.getObjectValue(0)
		               , pts = cTID("#Pnt")
		               , textStyle = tsr0.getObjectValue(cTID("TxtS"))
		               , font = textStyle.getString(cTID("FntN" ))
		               , style = textStyle.getString(cTID("FntS"))
									 , size = textStyle.getUnitDoubleValue(cTID("Sz  ", pts))
				
				tfParams.fontStyle = style;
				tfParams.fontName = font;
				tfParams.fontSize = size; //*configData.outputValueFactor;
				
				// 3/3) Get paragraph alignment
				
				var keyString = "textKey.paragraphStyleRange.paragraphStyle.align"
				var keyList = keyString.split('.');
				
				tfParams.align = desc.getVal(keyList);
				if (tfParams.align === null){
					tfParams.align = 'left'; // Default
				}
				setCommentProp(layerComp, 'tfParams', JSON.stringify(tfParams));
			
			}
		}
		
	}

}

// Util methods 
// ------------

function getFlatType( desc, ID )
{
	switch (desc.getType( ID ))
	{
	case DescValueType.BOOLEANTYPE:	return desc.getBoolean( ID );
	case DescValueType.STRINGTYPE:		return desc.getString( ID );
	case DescValueType.INTEGERTYPE:	return desc.getInteger( ID );
	case DescValueType.DOUBLETYPE:	return desc.getDouble( ID );
	case DescValueType.UNITDOUBLE:	return getPSUnitValue( desc, ID );
	case DescValueType.ENUMERATEDTYPE: return typeIDToStringID( desc.getEnumerationValue(ID) );
	case DescValueType.REFERENCETYPE: return getReference( desc.getReference( ID ) );
	case DescValueType.RAWTYPE: 	return desc.getData( ID );
	case DescValueType.ALIASTYPE:	return desc.getPath( ID );
	case DescValueType.CLASSTYPE:	return typeIDToStringID( desc.getClass( ID ) );
	default: return desc.getType(ID).toString();
	}
}

function cTID(s) { return app.charIDToTypeID(s); };
function sTID(s) { return app.stringIDToTypeID(s); };

var makeID = function( keyStr )
{
	if (keyStr[0] == "'")	// Keys with single quotes 'ABCD' are charIDs.
		return app.charIDToTypeID( eval(keyStr) );
	else
		return app.stringIDToTypeID( keyStr );
}

ActionDescriptor.prototype.getVal = function( keyList, firstListItemOnly  )
{
	if (typeof(keyList) == 'string')	// Make keyList an array if not already
		keyList = keyList.split('.');
		
	if (typeof( firstListItemOnly ) == "undefined")
		firstListItemOnly = true;

	// If there are no more keys to traverse, just return this object.
	if (keyList.length == 0)
		return this;
	
	keyStr = keyList.shift();
	keyID = makeID(keyStr);
	
	if (this.hasKey( keyID))
		switch (this.getType( keyID ))
		{
		case DescValueType.OBJECTTYPE:
			return this.getObjectValue( keyID ).getVal( keyList, firstListItemOnly );
		case DescValueType.LISTTYPE:
			var xx = this.getList( keyID );  // THIS IS CREEPY - original code below fails in random places on the same document.
			return /*this.getList( keyID )*/xx.getVal( keyList, firstListItemOnly );
		default: return this.getFlatType( keyID );
		}
	else
		return null;
}

// Traverse the actionList using the keyList (see below)
ActionList.prototype.getVal = function( keyList, firstListItemOnly )
{
	if (typeof(keyList) == 'string')	// Make keyList an array if not already
		keyList = keyList.split('.');
		
	if (typeof( firstListItemOnly ) == "undefined")
		firstListItemOnly = true;

	// Instead of ID, pass list item #.  Duck typing.
	if (firstListItemOnly)
		switch (this.getType( 0 ))
		{
		case DescValueType.OBJECTTYPE:
			return this.getObjectValue( 0 ).getVal( keyList, firstListItemOnly );
		case DescValueType.LISTTYPE:
			return this.getList( 0 ).getVal( keyList, firstListItemOnly );
		default: return this.getFlatType( 0 );	
		}
	else
	{
		var i, result = [];
		for (i = 0; i < this.count; ++i)
			switch (this.getType(i))
			{
			case DescValueType.OBJECTTYPE:
				result.push( this.getObjectValue( i ).getVal( keyList, firstListItemOnly  ));
				break;
			case DescValueType.LISTTYPE:
				result.push( this.getList( i ).getVal( keyList, firstListItemOnly ));
				break;
			default:
				result.push( this.getFlatType( i ) );
			}
		return result;
	}
}

ActionDescriptor.prototype.getFlatType = function( ID )
{
	return getFlatType( this, ID );
}

ActionList.prototype.getFlatType = function( index )
{
	// Share the ActionDesciptor code via duck typing
	return getFlatType( this, index );
}

// `ref` can be document or layer group
// Will return null if not found.

function getFirstVisibleTextField(ref) {
		
    var len = ref.layers.length;
    for (var i = 0; i < len; i++) {
        var layer = ref.layers[i];
        if (layer.typename == 'LayerSet') {
        	var result = getFirstVisibleTextField(layer);
					if (result){ // If found return otherwise keep searching
						return result;
					}
        } else if (layer.visible && layer.kind == LayerKind.TEXT) {
						return layer;
				}
    }
		
		return null;
		
}

function getLayerBoundsRect(layer){
	
	var tlXi = 0;
	var tlYi = 1;
	var brXi = 2;
	var brYi = 3;
	
	return {
		x: layer.bounds[tlXi].value,
		y: layer.bounds[tlYi].value,
		width: layer.bounds[brXi].value-layer.bounds[tlXi].value,
		height: layer.bounds[brYi].value-layer.bounds[tlYi].value
	}
	
}

processTFs();


})();


