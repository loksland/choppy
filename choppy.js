#! /usr/bin/env node

var photoshop = require('photoshop');
var fs = require('fs'); 	
var path = require('path'); 
var spawn = require('child_process').spawn;

var Choppy = function() {
	
	this.TEMPLATE_DIR_NAME = 'tpl';	
	this.CONFIG_FILENAME = '.choppy';
	this.TEMPLATE_PARTS = ['header', 'main', 'inter', 'footer']; 
	
	// Get the template data from core	
	this.templateFiles = [];
	this.templateFilesCore = [];
	var coreTemplateDirPath = __dirname + path.sep + this.TEMPLATE_DIR_NAME + path.sep;
	Choppy.addFilePathsInDirToArray(coreTemplateDirPath, this.templateFilesCore);
	
	// Get arg
	this.dryRun = false;
	this.outputSelected = false;
	this.psdPaths = []; // User wants you to open doc if not already open
	this.verbose = false;
	this.flatten = false;
	this.makecomps = false;
	
	var argv = require('minimist')(process.argv.slice(2));
	
	//console.log(JSON.stringify(argv, null, 2));
	
	for (var k = 0; k < argv._.length; k++){
		if (String(argv._[k]).toLowerCase() === 'dry'){
			this.dryRun = true;			
		} else if (String(argv._[k]).toLowerCase() === 'sel'){
			this.outputSelected = true;
		} else if (String(argv._[k]).toLowerCase() === 'verbose'){
			this.verbose = true;
		} else if (String(argv._[k]).toLowerCase() === 'flatten'){
			this.flatten = true;
		} else if (String(argv._[k]).toLowerCase() === 'makecomps'){
			this.makecomps = true;
		}else if (path.extname(String(argv._[k])).toLowerCase() === '.psd'){
			this.psdPaths.push(argv._[k]);
		}
	}
	
	var self = this;
	//if (psdPaths.length === 0){
	//	psdPaths = ['{active}'];
	//}
	//for (var ddd = 0; ddd < psdPaths.length; ddd++){	
	//}
	
	this.psdIndex = -1;
	this.processNext();
	
};

Choppy.simpleArrDupe = function(arr){
	var dupe = [];
	for (var i = 0; i < arr.length; i++){
		dupe[i] = arr[i];
	}
	return dupe;
}

Choppy.prototype.onPsdDone = function() { 
	this.processNext();
}

Choppy.prototype.processNext = function() { 
	
	this.psdIndex++;
	var targetPsdPath = this.psdPaths[this.psdIndex];
	
	var activeMode;
	if (this.psdPaths.length == 0){		
		activeMode = true;
		if (this.psdIndex == 1){
			return;
		}
	} else {
	
		activeMode = false;
		if (targetPsdPath == null){
			//console.log('Processed ' + this.psdPaths.length + ' docs');
			return;
		}
		var pathSource = targetPsdPath;
		if (targetPsdPath.charAt(0) === '~' || targetPsdPath.charAt(0) === path.sep){
			// Know it's an absolute path
		} else {
			// Attempt relative
			targetPsdPath = process.cwd() + path.sep + targetPsdPath;			
			if (!fs.existsSync(targetPsdPath)){
				// Fallback to abs
				targetPsdPath = pathSource;
			}
		}
	}
	
	var psdLabel = !activeMode ? path.basename(targetPsdPath) : 'Active document';
	console.log('\nPSD ' + String(this.psdIndex + 1) + '/' + (activeMode ? '1' : this.psdPaths.length) + ' '+psdLabel+' ...');
	
	var self = this;
	
	// Get the active doc.
	photoshop.invoke(ensurePsdIsActiveDocumentJSX, [targetPsdPath, path.sep], function(error, activeDocument){
		
		var responseBuffer = '';
		
		if (self.flatten || self.makecomps){
			
			if (self.flatten){
				console.log('Flattening'+(self.outputSelected ? ' selected layers' : '')+'...');
			}
			if (self.makecomps){
				if (self.outputSelected){
					console.log('Making a comp for each selected top-level layer using selected or 1st layer comp as guide...');
				} else {
					console.log('Making a comp for each top-level layer using 1st layer comp as guide...');
				}
			}
			photoshop.createStream(processJSX, {flatten: self.flatten, pathSep:path.sep, makecomps:self.makecomps, outputSelected:self.outputSelected}).on('data', function(data) {
		
				var dataStr = data.toString();
				if (dataStr.substr(0,6) === 'debug:'){
					console.log(dataStr.substr(6));
				} else {
					responseBuffer += dataStr;
				}
		
			}).on('end', function() {
				
				var responseData;
				try {
					responseData = JSON.parse(responseBuffer);
				} catch (e) {
					console.log(responseBuffer.toString());
					return;
				}
				
				console.log(responseData.msg);
				
				self.onPsdDone();
		
			});
			
			return;
		} 
		
		var psdContainingDir = Choppy.ensureDirPathHasTrailingSlash(activeDocument.path, path.sep);
		var baseConfigData = {};
	 
		// Check for config
		var configFilePath = psdContainingDir + self.CONFIG_FILENAME;
		if (fs.existsSync(configFilePath)) {
				baseConfigData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
		} 
	
		baseConfigData.basePath = Choppy.ensureDirPathHasTrailingSlash(baseConfigData.basePath, path.sep);
	
		// Check for templates
		self.templateFiles = Choppy.simpleArrDupe(self.templateFilesCore);
		var localTemplateDirPath = psdContainingDir + self.TEMPLATE_DIR_NAME + path.sep;
		if (fs.existsSync(localTemplateDirPath)) {
			Choppy.addFilePathsInDirToArray(localTemplateDirPath, self.templateFiles);
		}
	
		var tplData = self.getTemplateDataFromFiles(self.templateFiles);
	
		var processStream = photoshop.createStream(processJSX, {tplData:tplData, pathSep:path.sep, baseConfigData:baseConfigData, TEMPLATE_PARTS:self.TEMPLATE_PARTS, dryRun:self.dryRun, outputSelected:self.outputSelected}).on('data', function(data) {
		
			var dataStr = data.toString();
			if (dataStr.substr(0,6) === 'debug:'){
				console.log(dataStr.substr(6));
			} else {
				responseBuffer += dataStr;
			}
		
		}).on('end', function() {
		
			var responseData;
			try {
				responseData = JSON.parse(responseBuffer);
			} catch (e) {
				console.log(responseBuffer.toString());
				return;
			}
			
			if (self.verbose){
				console.log(JSON.stringify(responseData.outputData, null, 2));
			}
			console.log('\n' + responseData.outputString + '\n');
		
			if (responseData.outputFilePath && responseData.outputFilePath.length > 0){
			
				var outputFileContents = responseData.outputString;
			
				if (responseData.outputTags && responseData.outputTags.start && responseData.outputTags.end && responseData.outputTags.start.length > 0 && responseData.outputTags.end.length > 0){
					var existingContents = fs.readFileSync(psdContainingDir + responseData.outputFilePath, 'utf8');
					var searchPattern = new RegExp(responseData.outputTags.start.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(.|[\r\n])*' + responseData.outputTags.end.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
					outputFileContents = existingContents.replace(searchPattern, responseData.outputTags.start+responseData.outputString+responseData.outputTags.end);
					var tagMatch = existingContents.match(searchPattern);
					if (tagMatch === null){
						throw new Error('Output tags not found.');
					} else {
						console.log('Found tags: "'+responseData.outputTags.start+'" and "'+responseData.outputTags.end+'".\n');
					}
				}
			
				fs.writeFileSync(psdContainingDir + responseData.outputFilePath, outputFileContents);
				console.log('Wrote to ' + responseData.outputFilePath + '\n');
			
			}
			
			if (!self.dryRun){
				// Optimize using imageoptim-cli
				var optimizeFilePaths = [];
				for (var j = 0; j < responseData.outputData.length; j++){
					if (responseData.outputData[j].optimize){
						optimizeFilePaths.push(psdContainingDir + baseConfigData.basePath + responseData.outputData[j].src); 
					}
				}
				if (optimizeFilePaths.length > 0){
					var isMac = /^darwin/.test(process.platform);
					if (!isMac){
						console.log('Cannot optimize on non-Mac systems. See https://github.com/JamieMason/ImageOptim-CLI for more info.');
						self.onPsdDone();
					} else {
					
						var imageoptimFilePath = require.resolve('imageoptim-cli');
					
						console.log('Optimizing...\n');
						var optimize = spawn('sh', [__dirname + path.sep + 'optimize.sh', imageoptimFilePath, optimizeFilePaths.join('\n')]);

						optimize.stdout.on('data', function (data) {  
							console.log(data.toString());
						});

						optimize.stderr.on('data', function (data) {
							console.log('stderr: ' + data);
						});

						optimize.on('exit', function (code) {
							if (code !== 0){
								console.log('Error encountered.\n');
							}
							self.onPsdDone();
						});
					}
				} else {
					self.onPsdDone();					
				}
			} else {
				self.onPsdDone();					
			}
			
		});		
	});

}

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

function ensurePsdIsActiveDocumentJSX(targetPath, sep){
	/* jshint ignore:start */
	if (targetPath === null){
		return {path : app.activeDocument.path};
	} else {
		var target = new File(targetPath);
		var activeDoc;
		try{
			activeDoc = app.activeDocument;
		} catch(e){
			activeDoc = null;
		}
		if (activeDoc){	
			var active = new File(app.activeDocument.path + sep + app.activeDocument.name);
			// Path already open
			if (target.absoluteURI === active.absoluteURI){
				return {path : app.activeDocument.path}; 	
			}
			// Is doc in another tab?
			if (app.documents.length > 1){
				for (var i = 0;i < app.documents.length; i++){
					app.activeDocument = app.documents[i];
					var active = new File(app.activeDocument.path + sep + app.activeDocument.name);
					if (target.absoluteURI === active.absoluteURI){
						return {path : app.activeDocument.path}; 	
					}
				}
			}
		} 
		// Open the doc
		app.open(target);
		return {path : app.activeDocument.path};
	}	
  /* jshint ignore:end */
}

function processJSX(stream, props){
	/* jshint ignore:start */
	
	// If a layer comp or layer starts with this char then they will not be included in operatios
	var IGNORE_PREFIX_CHARS = {'`':true};
	
	var flatten = props.flatten;
	var makecomps = props.makecomps;
	var utilMsg = '\n';
	var doc = app.activeDocument;
	var outputSelected = props.outputSelected;
	var selLayerLookup = getSelectedLayerLookup();
	// var isSel = isLayerSelected(layerRef, selLayerLookup);
	if (flatten){
		
		var flattenResult = flattenTopLevelLayers(doc, false, outputSelected, selLayerLookup, IGNORE_PREFIX_CHARS);
		
		utilMsg+= 'Flattened ' + String(flattenResult.flattenedLayers) + ' layers out of ' + String(flattenResult.totalLayers) + ' total.';
		
		if (!makecomps) {
			// If not hanging on to make comps then bail
			stream.writeln(
				JSON.stringify({msg: utilMsg}, null, 2)
			);
			return;
		
		}
	}
	
	// Set args
	var tplData = props.tplData;
	var pathSep = props.pathSep;
	var baseConfigData = props.baseConfigData;
	var TEMPLATE_PARTS = props.TEMPLATE_PARTS;
	var dryRun = props.dryRun;
	
	//stream.writeln('debug:var tplData=' + JSON.stringify(tplData) +';');
	//stream.writeln('debug:var pathSep=' + JSON.stringify(pathSep) +';');
	//stream.writeln('debug:var baseConfigData=' + JSON.stringify(baseConfigData) +';');
	//stream.writeln('debug:var TEMPLATE_PARTS=' + JSON.stringify(TEMPLATE_PARTS) +';');
	//stream.writeln('debug:var dryRun=' + JSON.stringify(dryRun) +';');
	//stream.writeln('debug:var outputSelected=' + JSON.stringify(outputSelected) +';');
	
	// The default image prop fallbacks.
	
	var PROP_DEFAULTS = {alt: '', cropToBounds: false, template: 'img', ext: 'jpg', quality: 80, flipX: false, flipY: false, relativePath: './', basePath: './', matte:null, colors:256, optimize:false, scale:1, sizeFileHandle:'', sizeIndex:-1, sizes:null, reg: 'TL', outputValueFactor: 1, regX:0, regY:0, regPercX:0, regPercY:0};
	// Which props are affected by |outputValueFactor|
	var OUTPUT_VALUE_FACTOR_PROPS = ['width','height','x','y','regX','regY']; 	
	var BOOL_PROPS = ['cropToBounds', 'flipX', 'flipY', 'optimize'];
	var NUM_PROPS = ['quality','scale'];
	// These will have a trailing slash added if needed.
	var DIR_PROPS = ['relativePath', 'basePath'];
	// These will be set to config data if not set.
	var CONFIG_PROP_DEFAULTS = baseConfigData;
	var VALID_OUTPUT_EXTS = ['jpg', 'png', 'gif'];
	var CONFIG_LAYERCOMP_NAME = '{choppy}';
	var SIZE_FILEHANDLE_PLACEHOLDER = '{s}';
	var TEMPLATE_VAR_PRE = '%';
	var TEMPLATE_VAR_POST = '%';
	var REG_LAYER_NAME = '{reg}';
	
	// Get psd info
	
	var psdContainingDir = ensureDirPathHasTrailingSlash(doc.path, pathSep);
	var psdName = doc.name;
	var psdFullName = doc.fullName;
	var psdBounds = new Array(0,0,doc.width.value,doc.height.value);
	
	// Assuming doc has an extension
	
	var psdNameParts = psdName.split('.');	
	psdNameParts.splice(psdNameParts.length - 1, 1);
	var psdBase = psdNameParts.join('.');
	PROP_DEFAULTS['psdBase'] = psdBase;	

	if (!doc){
		throw new Error('No PSD document open.')
	}
	
	var configData = null;
	var outputData = [];
	
	var makecompsGuideComp = null;
	
	for (var i =0; i < doc.layerComps.length; i++){
		
		var layerComp = doc.layerComps[i];
		var compData = {};
		var totalProps = 0;
		
		if (!IGNORE_PREFIX_CHARS[layerComp.name.charAt(0)]){
		
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
							var tmpVarVal = Number(eval(varVal));
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
		
				compData.selected = layerComp.selected;
		
				// Override relative path if defined in layer comp name.
				var layerCompRelativePath = getContainingDirPath(layerComp.name, pathSep);
				if (layerCompRelativePath && layerCompRelativePath.length > 0){		
					compData['relativePath'] = ensureDirPathHasTrailingSlash(getContainingDirPath(layerComp.name, pathSep), pathSep);
				}
			
				if (makecomps){ 			
					if (makecompsGuideComp == null || (outputSelected && layerComp.selected)){
						makecompsGuideComp = compData; // Use first at least
					}
					if (!outputSelected || layerComp.selected){
						break;	
					}							
				} else {
					outputData.push(compData);
				}
			
			}
		}	
	}
	
	// Make comps utility command
	// Waited for first layer comp to process data, as we will base all new comps
	// on |ext| and |relativePath| of this comp
	if (makecomps){
		
		var ext = '';
		var relativePath = '';
		var comment = '';
		var appearance = true;
		var position = true
		var visibility = true;
		if (makecompsGuideComp != null){
		
			utilMsg += 'Using "'+makecompsGuideComp.layerCompRef.name+'" as a guide for config\n';
			
			ext = makecompsGuideComp.ext ? makecompsGuideComp.ext : '';
			relativePath = makecompsGuideComp.relativePath ? makecompsGuideComp.relativePath : '';
			comment = makecompsGuideComp.layerCompRef.comment ? makecompsGuideComp.layerCompRef.comment : '';
			appearance = makecompsGuideComp.layerCompRef.appearance;
			position = makecompsGuideComp.layerCompRef.position;
			visibility = makecompsGuideComp.layerCompRef.visibility;
			
		}
		
		if (ext.length > 0 && ext.charAt(0) != '.'){
			ext = '.' + ext;
		}
		
		for (var i = 0 ; i < doc.layers.length; i++){
			var layer = doc.layers[i];
			layer.visible = false;
		}
		
	
		var totalNewComps = 0;
		for (var i = 0 ; i < doc.layers.length; i++){
			var layer = doc.layers[i];
			if (!IGNORE_PREFIX_CHARS[layer.name.charAt(0)]){
			
				if (!outputSelected || isLayerSelected(layer, selLayerLookup)){
			
					layer.visible = true;
				
					var layerCompName = relativePath + layer.name + ext;
					// http://jongware.mit.edu/pscs5js_html/psjscs5/pc_LayerComps.html
					// LayerComp add (name: string[, comment: string][, appearance: bool=false][, position: bool=false][, visibility: bool=true])		 
					doc.layerComps.add(layerCompName, comment, appearance, position, visibility);
				
					utilMsg+= '- "' + layerCompName + '"'
					utilMsg+= '\n';
					layer.visible = false;		
				
					totalNewComps++;		
				
				}
			}
		}
		
		utilMsg += '\nMade ' + String(totalNewComps) + ' layer comps.\n';
		
		// Write response back to node

		stream.writeln(
			JSON.stringify({msg: utilMsg}, null, 2)
		);
		return;
		
	}
	
	takeSnapshot();
	
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
	
	var p;
	for (p = 0; p < outputData.length; p++){
		
		outputData[p] = extendObjWithDefaults(outputData[p], configData);
		// Enforce own "!" props.
		outputData[p] = extendObjWithDefaults(outputData[p], outputData[p]);
		
		// Look for multiple sizes and create new virtual layerComps for these
		if (outputData[p].sizes) {
			
			// Look for size definitions
			var sizeLookup = {};
			var ppp;
			for (ppp in outputData[p]){		
				var pppOrig = ppp;		
				ppp = ppp.toLowerCase();
				if (ppp.length > 7 && ppp.substr(0,7) === 'sizedef'){
					var sizeKey = ppp.substr(7);
					sizeLookup[sizeKey] = outputData[p][pppOrig];					
				}
			}
			
			// Look for sizeDefs that reference other size defs
			var sizeDefsDefined = {};
			var iii = 0;
			var anyUndef = true;
			// Recurse until all defined (limit 10)
			if (iii < 10 && anyUndef){
				for (ppp in sizeLookup){
					if (!sizeDefsDefined[ppp]){
						anyUndef = true;
						var arrSizesInDef = sizeLookup[ppp].split(',');			
						var arrAltered = false;	
						var totUndefProps = 0;
						for (var ii = 0; ii < arrSizesInDef.length; ii++){
							if (arrSizesInDef[ii].split(':').length === 1){
								totUndefProps++;
								var lookupDef = String(arrSizesInDef[ii]).toLowerCase();
								if (sizeLookup[lookupDef] && sizeDefsDefined[lookupDef]){
									arrSizesInDef[ii] = sizeLookup[lookupDef];
									arrAltered = true;
								} else {
									break;
								}
							}
						}				
						if (totUndefProps === 0 || arrAltered){
							sizeLookup[ppp] = arrSizesInDef.join(',');
							sizeDefsDefined[ppp] = true;
						}
					}
				}
				iii++;	
			}
			
			var tmpVarValArr = String(outputData[p].sizes).split(',');
			outputData[p].sizes = [];
			for (var pp = 0; pp < tmpVarValArr.length; pp++){						
				var strObj = tmpVarValArr[pp];
				if (strObj.split(':').length === 1){
					// Inject size def
					var sizeDef = String(strObj).toLowerCase();
					if (sizeLookup[sizeDef]){						
						var sizePushArr = sizeLookup[sizeDef].split(',');						
						for (var jj = 0; jj < sizePushArr.length; jj++){
							strObj = sizePushArr[jj];
							outputData[p].sizes.push({fileHandle:strObj.split(':')[0], scale: Number(eval(strObj.split(':')[1])), def:sizeDef});
						}						
					} else {
						throw new Error('Size definition "'+ppp+'" not found');
					}					
				} else {
					outputData[p].sizes.push({fileHandle:strObj.split(':')[0], scale: Number(eval(strObj.split(':')[1]))});
				}
			}
			
			if (outputData[p].sizes.length > 0){
			
				// Save the layer comp as the ref will not survive duplicating
				var layerCompRef = outputData[p].layerCompRef;
				delete outputData[p].layerCompRef;
		
				for (var s = 0; s < outputData[p].sizes.length; s++){
			 
					if (!outputData[p].sizes[s]['scale']){
						throw new Error('Invalid size scale ['+s+']');
					}
			
					var dataObj;
					if (s === 0){
						dataObj = outputData[p];
					} else {
						dataObj = dupeObj(outputData[p]);				
					}
					
					dataObj.layerCompRef = layerCompRef;			
					dataObj.sizeIndex = s;
					dataObj.scale = eval(outputData[p].sizes[s]['scale']);
					dataObj.sizeFileHandle = outputData[p].sizes[s]['fileHandle'];
			
					if (s > 0){
						outputData.splice(p + s,0,dataObj);
					}
				}
		
				if (outputData[p].sizes.length > 1){
					p+=outputData[p].sizes.length-1;
				}
			}
		}
	}

	for (p = 0; p < outputData.length; p++){
		
		outputData[p].index = p;
		// Remove ! props that have a double up.
		// Remove ! for those that don't.
		var delProps = [];
		for (var q in outputData[p]){
			if (q.charAt(0) == "!"){
				if (qNoEx == q.substr(1)){ // Was single
					if (!outputData[p][qNoEx]){
						outputData[p][qNoEx] = outputData[p][q];
					}
					delProps.push(q);
				}
			} 
		}	
		for (var qq = 0; qq < delProps.length ; qq++){
			delete outputData[p][delProps[qq]];
		}
	
		// Make sure trailing slashes are present.
		ensureDirPropsHaveTrailingSlash(outputData[p], DIR_PROPS, pathSep);
	
		// If no alt text then clean up base and use as a fallback.		
		if (!outputData[p].alt || outputData[p].alt.length == 0){
			outputData[p].alt = filenameBaseToAltText(outputData[p].base);
		}
	
		outputData[p].base = cleanUpFileNameBase(outputData[p].base);
	
		// Now you have enough to get src
		
		// Inject file size handle into output
		var fileNameSizeHandlePart = '';
		if (outputData[p].sizeIndex >= 0){
			
			var foundFileHandlePlaceholder = false;
			
			if (outputData[p].base.split(SIZE_FILEHANDLE_PLACEHOLDER).length == 2){
				foundFileHandlePlaceholder = true;
				outputData[p].base = outputData[p].base.split(SIZE_FILEHANDLE_PLACEHOLDER).join(outputData[p].sizeFileHandle);
			}
			
			if (outputData[p].relativePath.split(SIZE_FILEHANDLE_PLACEHOLDER).length == 2){
				foundFileHandlePlaceholder = true;
				outputData[p].relativePath = outputData[p].relativePath.split(SIZE_FILEHANDLE_PLACEHOLDER).join(outputData[p].sizeFileHandle);
			}
			
			if (!foundFileHandlePlaceholder){
				fileNameSizeHandlePart = outputData[p].sizeFileHandle;
			}
		}		
		outputData[p].base = outputData[p].base.split(SIZE_FILEHANDLE_PLACEHOLDER).join('');
		outputData[p].relativePath = outputData[p].relativePath.split(SIZE_FILEHANDLE_PLACEHOLDER).join('');
		
		outputData[p].srcFileName = outputData[p].base + fileNameSizeHandlePart + '.' + outputData[p].ext;
		outputData[p].src = outputData[p].relativePath + outputData[p].srcFileName;
		outputData[p].exportPath = psdContainingDir + outputData[p].basePath + outputData[p].relativePath + outputData[p].srcFileName;
		
		// Apply layer comp
		var layerComp = outputData[p].layerCompRef;
		layerComp.apply();
		
		// Look for reg point layer, record position and hide
		var regPt = null;
		for (var r = 0 ; r < doc.layers.length; r++){
			var lyr = doc.layers[r];
			if (lyr.visible && lyr.name && lyr.name === REG_LAYER_NAME){				
				lyr.visible = false;
				regPt = getLayerCenterPoint(lyr);
				outputData[p].reg = '(custom)';
				break;
			}
		}	
		
		var revertRequired = false;
		
		var outputBounds;
		if (outputData[p].cropToBounds){	
			// Only flatten if cropping
			flattenTopLevelLayers(doc, true, false, null, IGNORE_PREFIX_CHARS);
			revertRequired = true; // A revert is required whether a dry-run or not
			outputBounds = getVisibleBounds(doc);
		} else {
			outputBounds = copyBounds(psdBounds);
		}
		outputData[p].outputBounds = outputBounds;
		
		// outputData[p].x = parseInt(outputBounds[0], 10);
		// outputData[p].y = parseInt(outputBounds[1], 10);
		
		if (!regPt && outputData[p].reg !== '(custom)'){
			// Interpret 'reg' data
			regPt = getRegPtFromRegStringAndBounds(outputData[p].reg, outputData[p].outputBounds);
		}
		
		if (!regPt){
			regPt = {x: parseInt(outputBounds[0], 10), y: parseInt(outputBounds[1], 10)};
		}
		
		// Apply reg point data
		outputData[p].x = regPt.x;
		outputData[p].y = regPt.y;
		
		outputData[p].regX = regPt.x - outputData[p].outputBounds[0];
		outputData[p].regY = regPt.y - outputData[p].outputBounds[1];
		
		outputData[p].regPercX = (regPt.x - outputData[p].outputBounds[0]) / (outputData[p].outputBounds[2] - outputData[p].outputBounds[0]);
		outputData[p].regPercY = (regPt.y - outputData[p].outputBounds[1]) / (outputData[p].outputBounds[3] - outputData[p].outputBounds[1])
		
		outputData[p].width = String(parseInt(outputBounds[2],10)-parseInt(outputBounds[0],10)); 
		outputData[p].height = String(parseInt(outputBounds[3],10)-parseInt(outputBounds[1],10));
		
		if (!dryRun && (!outputSelected || outputData[p].selected)){
			
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
			
			if (outputData[p].scale != 1){
				revertRequired = true;
				doc.resizeImage(UnitValue(doc.width.value * outputData[p].scale,"px"),null,null,ResampleMethod.BICUBIC);
				// Update dims
				outputData[p].width = String(doc.width.value); 
				outputData[p].height = String(doc.height.value); 
				
				outputData[p].x = outputData[p].x * outputData[p].scale;
				outputData[p].y = outputData[p].y * outputData[p].scale;
				
				outputData[p].regX = outputData[p].regX * outputData[p].scale;
				outputData[p].regY = outputData[p].regY * outputData[p].scale;
			}
		
			// Ouput image
			var exportOptions = new ExportOptionsSaveForWeb();
			if (outputData[p].ext == 'png'){
				exportOptions.PNG8 = false;
				exportOptions.transparency = true;
				exportOptions.interlaced = false;
				exportOptions.quality = 100;
				exportOptions.includeProfile = false;
				exportOptions.format = SaveDocumentType.PNG;//-8; //SaveDocumentType.PNG; //-24 //JPEG, COMPUSERVEGIF, PNG-8, BMP 
			} else if (outputData[p].ext == 'jpg'){
				exportOptions = new ExportOptionsSaveForWeb();
				exportOptions.format = SaveDocumentType.JPEG;
				exportOptions.quality = outputData[p].quality;
			} else if (outputData[p].ext == 'gif'){
				exportOptions.ditherAmount = 0;
				exportOptions.dither = Dither.NOISE; // Dither.NONE; // 
				exportOptions.palette = Palette.LOCALPERCEPTUAL; //Palette.LOCALADAPTIVE;
				exportOptions.format = SaveDocumentType.COMPUSERVEGIF;
				exportOptions.forced = ForcedColors.BLACKWHITE;
				exportOptions.interlaced = false;
				exportOptions.preserverExactColors = true;			
				if (outputData[p].matte){
					var userMatteColor = hexToRGB(outputData[p].matte);				
					var matteColor = new RGBColor();
					matteColor.red = userMatteColor.r;
					matteColor.green = userMatteColor.g;
					matteColor.blue = userMatteColor.b;
					exportOptions.matteColor = matteColor;
				}			
				exportOptions.colors = outputData[p].colors;
				exportOptions.transparency = true;
							
			} else {
				throw new Error('Export format "'+outputData[p].ext+'" not found.');
			}
	
			doc.exportDocument(new File(outputData[p].exportPath), ExportType.SAVEFORWEB, exportOptions);
	
		} else {
			
			if (outputData[p].scale != 1){
			
				// Update dims
				outputData[p].width = String(Math.round(Number(outputData[p].width) * outputData[p].scale)); 
				outputData[p].height = String(Math.round(Number(outputData[p].height) * outputData[p].scale)); 
				
				outputData[p].x = outputData[p].x * outputData[p].scale;
				outputData[p].y = outputData[p].y * outputData[p].scale;
				
				outputData[p].regX = outputData[p].regX * outputData[p].scale;
				outputData[p].regY = outputData[p].regY * outputData[p].scale;
				
			}
		}
		
		if (revertRequired){
			revertSnapshot(doc);
		}
		
		
		if (outputSelected){
			// Don't optimize if didn't output
			outputData[p].optimize = false;
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
						var mainData = applyVarObjToTemplateString(outputData[p], tplData[outputData[p].template][part], TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, outputData[p].outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS);
						if (tplData[outputData[p].template]['inter'] !== undefined && p > 0){
							mainData = tplData[outputData[p].template]['inter'] + mainData;
						}
						output[part].push(mainData);
					} else if (part != 'inter'){
						// Only output once
						var templatePartID = outputData[p].template + ':' + part;
						if (!templatePartsAdded[templatePartID]){
							var templateContent = tplData[outputData[p].template][part];
							if (configData){
								templateContent = applyVarObjToTemplateString(configData, templateContent, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, 1, []);
							}
							output[part].push(templateContent);	
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
			output['main'].push(applyVarObjToTemplateString(outputData[p], outputData[p].template, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, outputData[p].outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS));
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
	var outputTags = {};
	if (configData && configData.outputFilePath && configData.outputFilePath.length > 0){
		configData.basePath = ensureDirPathHasTrailingSlash(configData.basePath, pathSep);
		
		// You can inject config props into this path
		var injectedOutputFilePath = applyVarObjToTemplateString(configData, configData.outputFilePath, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, 1, []);
		
		outputFilePath = configData.basePath + injectedOutputFilePath; //configData.outputFilePath;
		if (configData.outputTagStart && configData.outputTagEnd && configData.outputTagStart.length > 0 && configData.outputTagEnd.length > 0){
			outputTags = {start:configData.outputTagStart, end:configData.outputTagEnd};
		}
	}
	
	// Write response back to node
	var responseData = {outputData: cleanupOutputDataForOutput(outputData,['layerCompRef']),
											outputString: outputString,
											outputFilePath: outputFilePath,
											outputTags: outputTags}
											
	stream.writeln(
		JSON.stringify(responseData, null, 2)
	);
	
	// JSX functions
	// -------------
	//get the list of multiple selected layers
	//http://www.nekomataya.info/nekojyarashi/wiki.cgi?photoshop%CA%A3%BF%F4%A5%BB%A5%EC%A5%AF%A5%C8
	
	// Usage:
	// var selLayerLookup = getSelectedLayerLookup();
	// var isSel = isLayerSelected(layerRef, selLayerLookup);
	
	function getSelectedLayerLookup(layerRef){
		
		var lookup = {};
		if (outputSelected){
			var selLayers = _getSelectedLayers();
			for (var zzz = 0; zzz < selLayers.length; zzz++){
				lookup['name:' + selLayers[zzz].name + ',parent:' + selLayers[zzz].parent.name] = true
			}
		}
		return lookup;
		
	}
	
	function isLayerSelected(layerRef, lookup){
		
		return lookup['name:' + layerRef.name + ',parent:' + layerRef.parent.name];
		
	}
	
	function _getSelectedLayers(){ 
		var idGrp = stringIDToTypeID( "groupLayersEvent" );
		var descGrp = new ActionDescriptor();
		var refGrp = new ActionReference();
		refGrp.putEnumerated(charIDToTypeID( "Lyr " ),charIDToTypeID( "Ordn" ),charIDToTypeID( "Trgt" ));
		descGrp.putReference(charIDToTypeID( "null" ), refGrp );
		executeAction( idGrp, descGrp, DialogModes.ALL );
		var resultLayers=new Array();
		for (var ix=0;ix<app.activeDocument.activeLayer.layers.length;ix++){resultLayers.push(app.activeDocument.activeLayer.layers[ix])}
		var id8 = charIDToTypeID( "slct" );
			var desc5 = new ActionDescriptor();
			var id9 = charIDToTypeID( "null" );
			var ref2 = new ActionReference();
			var id10 = charIDToTypeID( "HstS" );
			var id11 = charIDToTypeID( "Ordn" );
			var id12 = charIDToTypeID( "Prvs" );  
			ref2.putEnumerated( id10, id11, id12 );
		desc5.putReference( id9, ref2 );
		executeAction( id8, desc5, DialogModes.NO );
		return resultLayers;
	}

	function dupeObj(obj){
		return JSON.parse(JSON.stringify(obj));
	}
	
	function hexToRGB(hex){
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
	
	function cleanUpFileNameBase(base){
		
		//base = base.toLowerCase();
		// Remove spaces
		base = base.split(' ').join('-');
		return base;
		
	}
	
	function cleanupOutputDataForOutput(outputData, hidePropsArr){
	
		var hidePropsLookup = '+++' + hidePropsArr.join('+++') + '+++';
		for (var i = 0;i < outputData.length; i++){
			var obj = outputData[i];
			for (var p in obj){
				if (hidePropsLookup.split('+++' + p + '+++').length > 1){
					outputData[i][p] = '...';
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
			if (boundsA[i] != boundsB[i]){
				return false;
			}
		}
		return true;
	}
	
	function getLayerCenterPoint(layerRef){
	
		return {x : layerRef.bounds[0].value + (layerRef.bounds[2].value - layerRef.bounds[0].value)*0.5, y: layerRef.bounds[1].value + (layerRef.bounds[3].value - layerRef.bounds[1].value)*0.5};
		
	}
	
	function getRegPtFromRegStringAndBounds(regStr, bounds){
		
		// Get bounds
		var x = bounds[0];
		var y = bounds[1];
		var width = bounds[2] - bounds[0];
		var height = bounds[3] - bounds[1];
		
		// Interpret regStr
		
		// Default: top left
		var hozP = 0;
		var vertP = 0;
		
		regStr = regStr.toUpperCase();
		regStr = regStr.split('M').join('C');
		regStr = regStr.split('CC').join('C');
		
		if (regStr == 'C'){
			hozP = vertP = 0.5;
		} else {
		
			var remains = '';
			var hozFound = false;
			var vertFound = false;
			var chars = ['L','R','T','B'];
			for (var i = 0; i < chars.length; i++){
				var c = chars[i];
				if (regStr.split('L').length > 1){
					hozP = 0;
					hozFound = true;					
				} else if (regStr.split('R').length > 1){
					hozP = 1;
					hozFound = true;
				} else if (regStr.split('T').length > 1){
					vertP = 0;
					vertFound = true;
				} else if (regStr.split('B').length > 1){
					vertP = 1;
					vertFound = true;
				}
			}
			
			if (hozFound && !vertFound && regStr.split('C').length > 1){
				vertP = 0.5;
			} else if (!hozFound && vertFound && regStr.split('C').length > 1){
				hozP = 0.5;
			}
		}
		
		return {x: x + width * hozP, y: y + height * vertP};
		
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
			
			if (layer.visible && (layer.bounds[0].value != 0 || layer.bounds[1].value != 0 || layer.bounds[2].value != 0 || layer.bounds[3].value != 0)){			
				
				if (!anyBoundsFound){
					cropBounds = copyBounds([layer.bounds[0].value, layer.bounds[1].value, layer.bounds[2].value, layer.bounds[3].value]);
					anyBoundsFound = true; 
				} else {
					if (layer.bounds[tlXi].value < cropBounds[tlXi]){
						cropBounds[tlXi] = layer.bounds[tlXi].value;						
					}
					if (layer.bounds[tlYi].value < cropBounds[tlYi]){
						cropBounds[tlYi] = layer.bounds[tlYi].value;
					}
					if (layer.bounds[brXi].value > cropBounds[brXi]){
						cropBounds[brXi] = Math.min(doc.width.value,layer.bounds[brXi].value);
					}							
					if (layer.bounds[brYi].value > cropBounds[brYi]){
						cropBounds[brYi] = layer.bounds[brYi].value;
					}
					if (areBoundsEqual(cropBounds, docBounds)){					  
						break;
					}
				}
			}
		}
		
		if (cropBounds[tlXi] < 0){
			cropBounds[tlXi] = 0;
		}
		
		if (cropBounds[tlYi] < 0){
			cropBounds[tlYi] = 0;
		}
		
		if (cropBounds[brXi] > doc.width.value){
			cropBounds[brXi] = doc.width.value;
		}
		
		if (cropBounds[brYi] > doc.height.value){
			cropBounds[brYi] = doc.height.value;
		}
		
		return cropBounds;
		
	}
	
	function applyVarObjToTemplateString(obj,str, pre, post, outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS){		
		
		str = String(str);
		var outputValueFactorPropsLookup = '#' + OUTPUT_VALUE_FACTOR_PROPS.join('#') + '#';
		for (var p in obj) {
			var val = obj[p];
			// Apply value factor to applicable props
			if (outputValueFactorPropsLookup.split('#'+p+ '#').length === 2){
				val = Number(val) * outputValueFactor;
			}
			
			str = str.split(pre+p+post).join(val);
		}
		return str;
	}

	function rasterizeVectorMask() {
		try{ 
			var id488 = stringIDToTypeID( "rasterizeLayer" );
			var desc44 = new ActionDescriptor();
			var id489 = charIDToTypeID( "null" );
				var ref29 = new ActionReference();
				var id490 = charIDToTypeID( "Lyr " );
				var id491 = charIDToTypeID( "Ordn" );
				var id492 = charIDToTypeID( "Trgt" );
				ref29.putEnumerated( id490, id491, id492 );
			desc44.putReference( id489, ref29 );
			var id493 = charIDToTypeID( "What" );
			var id494 = stringIDToTypeID( "rasterizeItem" );
			var id495 = stringIDToTypeID( "vectorMask" );
			desc44.putEnumerated( id493, id494, id495 );
			executeAction( id488, desc44, DialogModes.NO );
		}catch(e) {
			; // do nothing
		}
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
	
	// Flatten
	// -------
	
	function flattenTopLevelLayers(doc, visibleOnly, selectedOnly, selLayerLookup, IGNORE_PREFIX_CHARS){
	
		
		
		var flattenedLayers = 0;
		var totalLayers = doc.layers.length;
		for (var i = 0 ; i < totalLayers; i++){
			var layer = doc.layers[i];
			
			if (!IGNORE_PREFIX_CHARS[layer.name.charAt(0)]){
			
				if (!visibleOnly || layer.visible){
					if (!selectedOnly || isLayerSelected(layer, selLayerLookup)){
				
						doc.activeLayer = layer;
						if (layer.typename === 'LayerSet' ||
								activeLayerHasLayerMask() ||
								activeLayerHasVectorMask() ||
								activeLayerHasFilterMask() ||
								activeLayerHasStyle()){	
								flattenedLayers++;
								createSmartObject(doc, layer);
						}
					}
				}
			
			}
		}
	
		return {flattenedLayers:flattenedLayers, totalLayers:totalLayers};
	}
	
	// create smartobject from specified layer (default is active layer)
	function createSmartObject(doc, layer)
	{
		 
		 var layer = layer != undefined ? layer : doc.activeLayer;
	 
		 if(doc.activeLayer != layer) doc.activeLayer = layer;
	 
		 try
		 {
				var idnewPlacedLayer = stringIDToTypeID( "newPlacedLayer" );
				executeAction( idnewPlacedLayer, undefined, DialogModes.NO );
				return doc.activeLayer;
		 }
		 catch(e)
		 {
				return undefined;
		 }
	}
	
	function activeLayerHasLayerMask() {
		// Source: https://github.com/picwellwisher12pk/Presets/blob/master/Scripts/Flatten%20All%20Masks.jsx
		var hasLayerMask = false;
		try {
			var ref = new ActionReference();
			var keyUserMaskEnabled = app.charIDToTypeID( 'UsrM' );
			ref.putProperty( app.charIDToTypeID( 'Prpr' ), keyUserMaskEnabled );
			ref.putEnumerated( app.charIDToTypeID( 'Lyr ' ), app.charIDToTypeID( 'Ordn' ), app.charIDToTypeID( 'Trgt' ) );
			var desc = executeActionGet( ref );
			if ( desc.hasKey( keyUserMaskEnabled ) ) {
				hasLayerMask = true;
			}
		}catch(e) {
			hasLayerMask = false;
		}
		return hasLayerMask;
	}
	
	function activeLayerHasVectorMask() {
		// Source: https://github.com/picwellwisher12pk/Presets/blob/master/Scripts/Flatten%20All%20Masks.jsx
		var hasVectorMask = false;
		try {
			var ref = new ActionReference();
			var keyVectorMaskEnabled = app.stringIDToTypeID( 'vectorMask' );
			var keyKind = app.charIDToTypeID( 'Knd ' );
			ref.putEnumerated( app.charIDToTypeID( 'Path' ), app.charIDToTypeID( 'Ordn' ), keyVectorMaskEnabled );
			var desc = executeActionGet( ref );
			if ( desc.hasKey( keyKind ) ) {
				var kindValue = desc.getEnumerationValue( keyKind );
				if (kindValue == keyVectorMaskEnabled) {
					hasVectorMask = true;
				}
			}
		}catch(e) {
			hasVectorMask = false;
		}
		return hasVectorMask;
	}
	
	function activeLayerHasFilterMask() {
		// Source: https://github.com/picwellwisher12pk/Presets/blob/master/Scripts/Flatten%20All%20Masks.jsx
		var hasFilterMask = false;
		try {
			var ref = new ActionReference();
			var keyFilterMask = app.stringIDToTypeID("hasFilterMask");
			ref.putProperty( app.charIDToTypeID( 'Prpr' ), keyFilterMask);
			ref.putEnumerated( app.charIDToTypeID( 'Lyr ' ), app.charIDToTypeID( 'Ordn' ), app.charIDToTypeID( 'Trgt' ) );
			var desc = executeActionGet( ref );
			if ( desc.hasKey( keyFilterMask ) && desc.getBoolean( keyFilterMask )) {
				hasFilterMask = true;
			}
		}catch(e) {
			hasFilterMask = false;
		}
		return hasFilterMask;
	}
	
	function activeLayerHasStyle() {
		// Source: https://github.com/LeZuse/photoshop-scripts/blob/master/default/Flatten%20All%20Layer%20Effects.jsx
		var hasLayerStyle = false;
		try {
			var ref = new ActionReference();
			var keyLayerEffects = app.charIDToTypeID( 'Lefx' );
			ref.putProperty( app.charIDToTypeID( 'Prpr' ), keyLayerEffects );
			ref.putEnumerated( app.charIDToTypeID( 'Lyr ' ), app.charIDToTypeID( 'Ordn' ), app.charIDToTypeID( 'Trgt' ) );
			var desc = executeActionGet( ref );
			if ( desc.hasKey( keyLayerEffects ) ) {
				hasLayerStyle = true;
			}
		}catch(e) {
			hasLayerStyle = false;
		}
		return hasLayerStyle;
	}
	
	/* jshint ignore:end */
}

function pr(obj){
	
	console.log(JSON.stringify(obj, null, 2));
	
};

module.exports = new Choppy();
