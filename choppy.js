#! /usr/bin/env node

var photoshop = require('photoshop');
var fs = require('fs'); 	
var path = require('path'); 

var Choppy = function() {
	
	this.TEMPLATE_DIR_NAME = 'tpl';	
	this.CONFIG_FILENAME = '.choppy';
	this.TEMPLATE_PARTS = ['header', 'main', 'inter', 'footer']; 
	
	// Get the template data from core	
	this.templateFiles = [];
	var coreTemplateDirPath = __dirname + path.sep + this.TEMPLATE_DIR_NAME + path.sep;
	Choppy.addFilePathsInDirToArray(coreTemplateDirPath, this.templateFiles);
	
	var self = this;
	
	// Get the active doc.
	photoshop.invoke(activeDocumentJSX, function(error, activeDocument){		
	
	  var psdContainingDir = Choppy.ensureDirPathHasTrailingSlash(activeDocument.path, path.sep);
	  var baseConfigData = {};
	   
	  // Check for config
	  var configFilePath = psdContainingDir + self.CONFIG_FILENAME;
	  if (fs.existsSync(configFilePath)) {
				baseConfigData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
		} 
		
		// Check for templates
		var localTemplateDirPath = psdContainingDir + self.TEMPLATE_DIR_NAME + path.sep;
		if (fs.existsSync(localTemplateDirPath)) {
			Choppy.addFilePathsInDirToArray(localTemplateDirPath, self.templateFiles);
		}
		
		var tplData = self.getTemplateDataFromFiles(self.templateFiles);
		
		var responseBuffer = '';
		var processStream = photoshop.createStream(processJSX, {tplData:tplData, pathSep:path.sep, baseConfigData:baseConfigData, TEMPLATE_PARTS:self.TEMPLATE_PARTS}).on('data', function(data) {
  		
  		var dataStr = data.toString();
  		if (dataStr.substr(0,6) === 'debug:'){
  			console.log(dataStr.substr(6));
  		} else {
  			responseBuffer += dataStr;
  		}
  		
		}).on('end', function() {
		
			var responseData = JSON.parse(responseBuffer);
			
			console.log(responseData.outputData);
			console.log('\n\n' + responseData.outputString + '\n\n');
			
			if (responseData.outputFilePath && responseData.outputFilePath.length > 0){
				fs.writeFileSync(psdContainingDir + responseData.outputFilePath, responseData.outputString);
				console.log('Wrote to ' + responseData.outputFilePath + '.\n');
			}
			
 		});		
	});
};

// Given an array of template filepaths, build a data object.
Choppy.prototype.getTemplateDataFromFiles = function(filePathArr) {
	
	var tplData = {};
	for (var k = 0; k < filePathArr.length; k++){
		
		var tplFilePath = filePathArr[k];
		var tplFileName = path.basename(tplFilePath);
		
		var stats = fs.statSync(tplFilePath);
		if (!stats.isDirectory()){
			var tplBaseName = path.basename(tplFilePath, path.extname(tplFilePath));					
			
			if (tplBaseName.charAt(0) !== '.'){				
				var contents = fs.readFileSync(tplFilePath, 'utf8');				
				var part = 'main';
				if (tplBaseName.split('.').length !== 1){
					for (var i = 0; i < this.TEMPLATE_PARTS.length; i++){
						if (this.TEMPLATE_PARTS[i] !== 'main' && (tplBaseName + '.').split('.'+this.TEMPLATE_PARTS[i] + '.').length === 2){							
							tplBaseName = (tplBaseName + '.').split('.'+this.TEMPLATE_PARTS[i] + '.').join('');
							part = this.TEMPLATE_PARTS[i];
							break;
						}
					}
				}
				if (!tplData[tplBaseName]){
					tplData[tplBaseName] = {};
				}
				
				if (!tplData[tplBaseName][part]){
					tplData[tplBaseName][part] = contents;
				} else {
					throw new Error('Template part already defined');
				}
			}
		}
	}
	
	// Check every template has a 'main' part.
	for (var p in tplData){
		if (!tplData[p].main){
			throw new Error('Template missing a main part');
		}
	}
	
	return tplData;
	
};

// Add file paths within dir path to an existing array.
Choppy.addFilePathsInDirToArray = function(dirPath, array) {
	dirPath = Choppy.ensureDirPathHasTrailingSlash(dirPath, path.sep);
	var tplDirList = fs.readdirSync(dirPath);
	for (var pp in tplDirList) {
		var tplFileName = tplDirList[pp];
		var tplFilePath = dirPath + tplFileName;
		array.push(tplFilePath);
	}
};

// Make sure there's a trailing slash on a dir path.
Choppy.ensureDirPathHasTrailingSlash = function(path, sep){	
	path = String(path);
	if (path.charAt(path.length - 1) !== sep){
		path = path + sep;			
	}
	return path;		
};

// JSX 
// ---

function activeDocumentJSX(){
	/* jshint ignore:start */
  return app.activeDocument;
  /* jshint ignore:end */
}

function processJSX(stream, props){
	/* jshint ignore:start */
	
	// Set args
	var tplData = props.tplData;
	var pathSep = props.pathSep;
	var baseConfigData = props.baseConfigData;
	var TEMPLATE_PARTS = props.TEMPLATE_PARTS;
	
	// The default image prop fallbacks.
	var PROP_DEFAULTS = {alt: '', cropToBounds: false, template: 'img', ext: 'jpg', quality: 80, flipX: false, flipY: false, relativePath: './', basePath: './'};
	var BOOL_PROPS = ['cropToBounds', 'flipX', 'flipY'];
	var NUM_PROPS = ['quality'];
	// These will have a trailing slash added if needed.
	var DIR_PROPS = ['relativePath', 'basePath'];
	// These will be set to config data if not set.
	var CONFIG_PROP_DEFAULTS = baseConfigData;
	var VALID_OUTPUT_EXTS = ['jpg', 'png'];
	var CONFIG_LAYERCOMP_NAME = '{choppy}';
	var TEMPLATE_VAR_PRE = '%';
	var TEMPLATE_VAR_POST = '%';
	
	// Get psd info
	var doc = app.activeDocument;
	var psdContainingDir = ensureDirPathHasTrailingSlash(doc.path, pathSep);
	var psdName = doc.name;
	var psdFullName = doc.fullName;
	var psdBounds = new Array(0,0,doc.width.value,doc.height.value);
	
	if (!doc){
		throw new Error('No PSD document open.')
	}
	
	var configData = null;
	var outputData = [];
	
	for (var i =0; i < doc.layerComps.length; i++){
		
		var layerComp = doc.layerComps[i];
		var compData = {};
		var totalProps = 0;
		
		// Parse comment vars
		if (layerComp.comment){
			var arr = layerComp.comment.split('\n');
			for (var j = 0; j < arr.length; j++){
				var chunk = arr[j];
				var chunkArr = chunk.split(':');
				if (chunkArr.length > 1){
					var varName = chunkArr[0].split(' ').join('');
					chunkArr.splice(0,1);
					var varVal = chunkArr.join(':');				
					while(varVal.charAt(0) === ' '){
						varVal = varVal.substr(1);
					}								
					// Boolean
					if (BOOL_PROPS.indexOf(varName) >= 0){
						var tmpVarVal = varVal.toLowerCase(0);
						varVal = false;
						if (tmpVarVal.charAt(0) === 't' || tmpVarVal.charAt(0) === 'y' || tmpVarVal.charAt(0) === '1'){
							varVal = true;
						}
					}	else if (NUM_PROPS.indexOf(varName) >= 0){
						var tmpVarVal = Number(varVal);
						if (!isNaN(tmpVarVal)){
							varVal = tmpVarVal;
						}
					}
					compData[varName] = varVal;
					totalProps++;
				}
			}
		}
		
		// Default prop-less comment to alt text
		if (totalProps == 0){
			compData = {alt: layerComp.comment};
		}
		
		// Detect extension in filename and overwrite 'ext' prop if it is valud
		var outputNameExt = getExt(layerComp.name).toLowerCase();
		var outputNameExtOK = false;
		for (var k = 0; k < VALID_OUTPUT_EXTS.length; k++){
			if (outputNameExt === VALID_OUTPUT_EXTS[k]){
				outputNameExtOK = true;
				break;
			}
		}
		if (outputNameExtOK){
			compData['ext'] = outputNameExt;
			compData['base'] = getFileBaseName(layerComp.name, outputNameExt);
		} else {
			compData['base'] = getFileBaseName(layerComp.name, '');
		}
		
		compData.layerCompRef = layerComp;
		
		if (layerComp.name === CONFIG_LAYERCOMP_NAME){
			delete compData['base'];
			configData = compData;
		} else {
			// Override relative path if defined in layer comp name.
			var layerCompRelativePath = getContainingDirPath(layerComp.name, pathSep);
			if (layerCompRelativePath && layerCompRelativePath.length > 0){		
				compData['relativePath'] = ensureDirPathHasTrailingSlash(getContainingDirPath(layerComp.name, pathSep), pathSep);
			}
			outputData.push(compData);
		}
		
	}
	
	takeSnapshot();
	
	var layerMode = false;
	if (configData && configData.outputLayers){
		// Layer mode - loop through layers applied with {choppy} layer comp and 
		// add their name as |base| to output data.
		layerMode = true;
		var outputData = [];
		// Apply layer comp
		configData.layerCompRef.apply();
		
		/*
		stream.writeln(
			'debug:' + JSON.stringify(doc.layers, null, 2)
		);
		*/
		
		for(var i = 0 ; i < doc.layers.length; i++){
			
			var layer = doc.layers[i];
		
			if (layer.visible){			
				var compData = {};			
				compData.base = layer.name;
				compData.alt = layer.name;
				compData.layerRef = layer;
				outputData.push(compData);
				layer.visible = false;
			}
		}
	}
	
	// Extend config data
	if (configData === null){
		configData = extendObjWithDefaults({}, CONFIG_PROP_DEFAULTS);
	} else {
		configData = extendObjWithDefaults(configData, CONFIG_PROP_DEFAULTS);
	}
	// Apply defaults to config so they can extend each output img.
	configData = extendObjWithDefaults(configData, PROP_DEFAULTS);
	
	var output = {};
	var templatePartsAdded = {};
	
	for (var p = 0; p < outputData.length; p++){
		
		outputData[p] = extendObjWithDefaults(outputData[p], configData);
		// Enforce own "!" props.
		outputData[p] = extendObjWithDefaults(outputData[p], outputData[p]);
		
		// Remove ! props that have a double up.
		// Remove ! for those that don't.
		var delProps = [];
		for (var q in outputData[p]){
			if (q.charAt(0) == "!"){
				if (qNoEx = q.substr(1)){
					if (!outputData[p][qNoEx]){
						outputData[p][qNoEx] = outputData[p][q];
					}
					delProps.push(q);
				}
			}
		}	
		for (var qq = 0; qq < delProps.length ; qq++){
			delete outputData[p][delProps[qq]]
		}
		
		// Make sure trailing slashes are present.
		ensureDirPropsHaveTrailingSlash(outputData[p], DIR_PROPS, pathSep);
		
		// If no alt text then clean up base and use as a fallback.		
		if (!outputData[p].alt || outputData[p].alt.length =0){
			outputData[p].alt = filenameBaseToAltText(outputData[p].base);
		}
		
		// Disable uppercase file output.
		outputData[p].base = cleanUpFileNameBase(outputData[p].base);
		
		// Now you have enough to get src
		outputData[p].srcFileName = outputData[p].base + '.' + outputData[p].ext;
		outputData[p].src = outputData[p].relativePath + outputData[p].srcFileName;
		outputData[p].exportPath = psdContainingDir + outputData[p].basePath + outputData[p].relativePath + outputData[p].srcFileName;
		
		if (layerMode){
			// Apply layer
			configData.layerCompRef.apply();
			for(var i = 0 ; i < doc.layers.length; i++){
				var layer = doc.layers[i];
				if (layer.visible && layer != outputData[p].layerRef){			
					layer.visible = false;
				}
			}
		} else {		
			// Apply layer comp
			var layerComp = outputData[p].layerCompRef;
			layerComp.apply();
		}
		
		var outputBounds;
		if (outputData[p].cropToBounds){
			outputBounds = getVisibleBounds(doc);
		} else {
			outputBounds = copyBounds(psdBounds);
		}
		outputData[p].outputBounds = outputBounds;
		
		var revertRequired = false;
		if (!areBoundsEqual(psdBounds, outputData[p].outputBounds)){
			revertRequired = true;
			doc.crop(outputData[p].outputBounds); 			
		}
		
		if (outputData[p].flipX){
			revertRequired = true;
			doc.flipCanvas(Direction.HORIZONTAL);
		} 
		
		if (outputData[p].flipY){
			revertRequired = true;
			doc.flipCanvas(Direction.VERTICAL);
		}
		
		// Ouput image
		
		outputData[p].width = String(doc.width.value);
		outputData[p].height = String(doc.height.value);
		
		var exportOptions = new ExportOptionsSaveForWeb();
		if (outputData[p].ext == 'png'){
			exportOptions.PNG8 = false;
			exportOptions.transparency = true;
			exportOptions.interlaced = false;
			exportOptions.quality = 100;
			exportOptions.includeProfile = false;
			exportOptions.format = SaveDocumentType.PNG; //-24 //JPEG, COMPUSERVEGIF, PNG-8, BMP 
		} else if (outputData[p].ext == 'jpg'){
			exportOptions = new ExportOptionsSaveForWeb();
			exportOptions.format = SaveDocumentType.JPEG;
			exportOptions.quality = outputData[p].quality;
		} else {
			throw new Error('Export format "'+outputData[p].ext+'" not found.');
		}
		
		doc.exportDocument(new File(outputData[p].exportPath), ExportType.SAVEFORWEB, exportOptions);
		
		if (revertRequired){
			revertSnapshot(doc);
		}
		
		var templateFound = false;
		
		if (tplData[outputData[p].template] !== undefined){
			for (var t = 0; t < TEMPLATE_PARTS.length; t++){			
				var part = TEMPLATE_PARTS[t];
				if (tplData[outputData[p].template][part] !== undefined){
					if (output[part] === undefined){
						output[part] = [];
					} 
					templateFound = true;
					if (part == 'main'){
						var mainData = applyVarObjToTemplateString(outputData[p], tplData[outputData[p].template][part], TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST);
						if (tplData[outputData[p].template]['inter'] !== undefined && p > 0){
							mainData = tplData[outputData[p].template]['inter'] + mainData;
						}
						output[part].push(mainData);
					} else if (part != 'inter'){
						// Only output once
						var templatePartID = outputData[p].template + ':' + part;
						if (!templatePartsAdded[templatePartID]){
							output[part].push(tplData[outputData[p].template][part]);	
							templatePartsAdded[templatePartID] = true;
						}
					}
				}
			}
		}
		
		if (!templateFound && outputData[p].template.split(TEMPLATE_VAR_PRE).length > 1 && outputData[p].template.split(TEMPLATE_VAR_POST).length > 1){
			if (output['main'] === undefined){
				output['main'] = [];
			}
			output['main'].push(applyVarObjToTemplateString(outputData[p], outputData[p].template, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST));
		}
		
	}
	
	// Revert doc
	revertSnapshot(doc);
		
	// Make output out of template data
	var outputString = '';
	for (var t = 0; t < TEMPLATE_PARTS.length; t++){	
		if (output[TEMPLATE_PARTS[t]] !== undefined){
			outputString += output[TEMPLATE_PARTS[t]].join('');
		}
	}
		
	// Look for output file path
	var outputFilePath = '';
	if (configData && configData.outputFilePath && configData.outputFilePath.length > 0){
		configData.basePath = ensureDirPathHasTrailingSlash(configData.basePath, pathSep);
		outputFilePath = configData.basePath + configData.outputFilePath;
	}
	
	// Write response back to node
	var responseData = {outputData: cleanupOutputDataForOutput(outputData,['layerCompRef', 'layerRef']),
											outputString: outputString,
											outputFilePath: outputFilePath}
											
	stream.writeln(
		JSON.stringify(responseData, null, 2)
	);
	
	// JSX functions
	// -------------
	
	function cleanUpFileNameBase(base){
	
		base = base.toLowerCase();
		base = base.split(' ').join('-');
		return base;
		
	}
	
	function cleanupOutputDataForOutput(outputData, hidePropsArr){
		
		for (var i = 0;i < outputData.length; i++){
			var obj = outputData[i];
			for (var p in obj){
				if (hidePropsArr.indexOf(p) >= 0){
					outputData[i][p] = '(...)';
				}
			}
		}	
		
		return outputData;
	
	}
	
	function filenameBaseToAltText(base){
		
		if (base.length > 0){
			base = base.charAt(0).toUpperCase() + base.substr(1).toLowerCase();
		}
	
		base = base.split('-').join(' ');
		base = base.split('_').join(' ');
		
		return base;
		
	}
	
	function ensureDirPropsHaveTrailingSlash(obj, dirProps, sep){
	
		for (var i = 0; i < dirProps.length; i++){
			var prop = dirProps[i];
			if (obj[prop] && obj[prop].length > 0){
				obj[prop] = ensureDirPathHasTrailingSlash(obj[prop], sep);
			}
		}
	}
	
	function ensureDirPathHasTrailingSlash(path, sep){	
		path = String(path);
		if (path.charAt(path.length - 1) != sep){
			path = path + sep;			
		}
		return path;		
	}
	
	function copyBounds(bounds){
		var result = new Array();
		for(var i = 0; i < 4; i++){
			result[i] = bounds[i];
		}
		return result;
	}

	function areBoundsEqual(boundsA, boundsB){
		for(var i = 0; i < 4; i++){
			if (boundsA[i].value != boundsB[i].value){
				return false;
			}
		}
		return true;
	}
	
	function getVisibleBounds(doc){
	
		var tlXi = 0;
		var tlYi = 1;
		var brXi = 2;
		var brYi = 3;
		
		var docBounds = new Array(0,0,doc.width.value,doc.height.value);
		var cropBounds = copyBounds(docBounds);
		var anyBoundsFound = false;
		for(var i = 0 ; i < doc.layers.length; i++){
			var layer = doc.layers[i];
			if (layer.visible){						
				if (!anyBoundsFound){
					cropBounds = copyBounds(layer.bounds);  
				} else {
					if (layer.bounds[tlXi].value < cropBounds[tlXi].value){
						cropBounds[tlXi] = layer.bounds[tlXi];
					}
					if (layer.bounds[tlYi].value < cropBounds[tlYi].value){
						cropBounds[tlYi] = layer.bounds[tlYi];
					}
					if (layer.bounds[brXi].value > cropBounds[brXi].value){
						cropBounds[brXi] = layer.bounds[brXi];
					}							
					if (layer.bounds[brYi].value > cropBounds[brYi].value){
						cropBounds[brYi] = layer.bounds[brYi];
					}
					if (areBoundsEqual(cropBounds, docBounds)){
						break;
					}
				}
			}
		}		
		return cropBounds;		
	}
	
	function applyVarObjToTemplateString(obj,str, pre, post){		
		str = String(str);
		for (var p in obj) {
			str = str.split(pre+p+post).join(obj[p]);
		}
		return str;
	}
	
	function takeSnapshot(){
		var id686 = charIDToTypeID( 'Mk  ' );
		var desc153 = new ActionDescriptor();
		var id687 = charIDToTypeID( 'null' );
		var ref119 = new ActionReference();
		var id688 = charIDToTypeID( 'SnpS' );
		ref119.putClass( id688 );
		desc153.putReference( id687, ref119 );
		var id689 = charIDToTypeID( 'From' );
		var ref120 = new ActionReference();
		var id690 = charIDToTypeID( 'HstS' );
		var id691 = charIDToTypeID( 'CrnH' );
		ref120.putProperty( id690, id691 );
		desc153.putReference( id689, ref120 );
		executeAction( id686, desc153, DialogModes.NO );
	}

	function revertSnapshot(doc){
		var hsObj = doc.historyStates;
		var hsLength = hsObj.length;
		for (var i=hsLength - 1;i>-1;i--)
		{
			if(hsObj[i].snapshot) {
				 doc.activeHistoryState = hsObj.getByName('Snapshot ' + i);
				 break; 
			}      
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
	
	function getFileBaseName(strPathOrFileName, ext){
	
		// Remove extension
		if (ext && ext.length > 0 && strPathOrFileName.substr(-ext.length).toLowerCase() === ext.toLowerCase()){
			strPathOrFileName = strPathOrFileName.substr(0, strPathOrFileName.length - ext.length);
			if (strPathOrFileName.charAt(strPathOrFileName.length - 1) === '.'){
				strPathOrFileName = strPathOrFileName.substr(0, strPathOrFileName.length - 1);
			}
		}
		
		strPathOrFileName = strPathOrFileName.split('\\').join('/');
		var arr = strPathOrFileName.split('/');
		return arr[arr.length - 1];
		
	}
	
	function getContainingDirPath(strPath, pathSep){
		
		strPath = strPath.split('\\').join('/');
		var arr = strPath.split('/');
		arr.splice(arr.length - 1, 1);		
		return arr.join(pathSep);
		
	}
	
	// If |defaultsObjs| has a key that |obj| doesn't, obj will have that key added.
	// A prop with "!" at start will override even if key exists.
	function extendObjWithDefaults(obj, defaultsObjs, arrIgnoreProps){
	
		var strIgnoreProps = arrIgnoreProps ? '~'+arrIgnoreProps.join('~')+'~' : '';
		for (var p in defaultsObjs){
			var override = false;
			var defaultVal = defaultsObjs[p];
			if (p.charAt(0) == '!'){
				override = true;
				p = p.substr(1);
			}			
			if (strIgnoreProps.split('~'+p+'~').length === 1){
				if (override || obj[p] === undefined){
					obj[p] = defaultVal;
				}
			}
		}
		return obj;
	}
	/* jshint ignore:end */
}

module.exports = new Choppy();
