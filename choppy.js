#! /usr/bin/env node

var photoshop = require('./photoshop-0.5.2-edit/photoshop');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var Choppy = function() {
	
	photoshop.invoke(`function closeIfDupe(){
		var doc = app.activeDocument;
		if (doc.name.substr(-5) == ' copy'){
			doc.close(SaveOptions.DONOTSAVECHANGES);
		}
	}`,[], function(error){		
	})
	
	
	var self = this;
	
	self.TEMPLATE_DIR_NAME = 'tpl';
	self.CONFIG_FILENAME = '.choppy';
	self.TEMPLATE_PARTS = ['header', 'main', 'inter', 'footer'];

	// Get the template data from core
	self.templateFiles = [];
	self.templateFilesCore = [];
	var coreTemplateDirPath = __dirname + path.sep + self.TEMPLATE_DIR_NAME + path.sep;
	Choppy.addFilePathsInDirToArray(coreTemplateDirPath, self.templateFilesCore);
	
	// Jsx
	
	self.JSX_DIR_NAME = 'jsx';
	
	self.jsxPathsCore = {};
	self.jsxPathsCore.pre = loadJsxPaths(path.join(__dirname, 'jsx', 'pre'));
	self.jsxPathsCore.post = loadJsxPaths(path.join(__dirname, 'jsx', 'post'));
	self.jsxPathsCore.standalone = loadJsxPaths(path.join(__dirname, 'jsx', 'standalone'));
	
	// Get args
	
	self.psdPaths = []; // User wants you to open doc if not already open
	self.verbose = false;
	
	var argv = {_:process.argv.slice(2)}; //require('minimist')(process.argv.slice(2));
	
	self.standaloneCmds = [];
	for (var k = 0; k < argv._.length; k++){
		if (String(argv._[k]).toLowerCase() === 'verbose'){
			self.verbose = true;
		} else if (path.extname(String(argv._[k])).toLowerCase() === '.psd'){
			self.psdPaths.push(argv._[k]);
		} else {
			self.standaloneCmds.push(argv._[k]);
		}
	}
	
	
	//if (psdPaths.length === 0){
	//	psdPaths = ['{active}'];
	//}
	//for (var ddd = 0; ddd < psdPaths.length; ddd++){
	//}

	self.psdIndex = -1;
	self.processNext();

};


Choppy.simpleObjDupe = function(obj){
	var dupe = {};
	for (var p in obj){
		dupe[p] = obj[p];
	}
	return dupe;
}
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
		
		self.jsxPaths = Choppy.simpleObjDupe(self.jsxPathsCore);
		// Bypass initial checks if calling standalone JSX without an open PSD
		if (activeDocument || self.standaloneCmds.length == 0){ 
			
			var responseBuffer = '';
			
			if (!activeDocument){
				throw new Error('Active document seems to be a dupe');
			}

			var psdContainingDir = Choppy.ensureDirPathHasTrailingSlash(activeDocument.path, path.sep);
			var baseConfigData = {};

			// Check for config
			var configFilePath = psdContainingDir + self.CONFIG_FILENAME;

			if (fs.existsSync(configFilePath)) {
					baseConfigData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
					if (baseConfigData.basePath && baseConfigData.basePath.length > 0){
						baseConfigData.basePath = Choppy.ensureDirPathHasTrailingSlash(baseConfigData.basePath, path.sep);
					}
			}	 else {
					baseConfigData = {};
			}

			// Check for scripts 
			
			var localJSXDir = path.join(psdContainingDir, self.JSX_DIR_NAME);
			if (fs.existsSync(localJSXDir)) {
				// Will not fail if subdir not exists.
				self.jsxPaths.pre = loadJsxPaths(path.join(localJSXDir, 'pre'), self.jsxPaths.pre);
				self.jsxPaths.post = loadJsxPaths(path.join(localJSXDir, 'post'), self.jsxPaths.post);
				self.jsxPaths.standalone = loadJsxPaths(path.join(localJSXDir, 'standalone'), self.jsxPaths.standalone);
			}
			
		}
		
		// Call `standalone` commands and exit.
		
		console.log('\n');
		for (var i = 0; i < self.standaloneCmds.length; i++){
			// self.jsxPaths.standalone
			var jsxScriptName = self.standaloneCmds[i];
			var extParts = jsxScriptName.split('.');
			if (extParts.length > 1 && extParts[1].toLowerCase() == 'jsx'){ // Remove ext if set
				jsxScriptName = jsxScriptName.substr(0, jsxScriptName.length-1);
			}
			if (!self.jsxPaths.standalone[jsxScriptName]){
				throw new Error('JSX `standalone` script not found `'+jsxScriptName+'`');
			}
			var jsxPath = self.jsxPaths.standalone[jsxScriptName];
			console.log('Running *standalone* cmd `'+jsxScriptName+'`...');   
			photoshop.invoke(`function (jsxPath){
				var jsxFile = new File(jsxPath);
				if (!jsxFile.exists){
					throw new Error('JSX standalone file not found '+jsxScriptName+'');
				}
				var halt = false;
				$.evalFile(jsxFile);
			}`, [jsxPath], function(err){
				if (err){
					throw err;
				}
			});
		}
		if (self.standaloneCmds.length > 0){
			console.log('Standalone cmd/s complete.\n')
			return;
		}
		
		// Check for templates
		
		self.templateFiles = Choppy.simpleArrDupe(self.templateFilesCore);
		var localTemplateDirPath = psdContainingDir + self.TEMPLATE_DIR_NAME + path.sep;
		if (fs.existsSync(localTemplateDirPath)) {
			Choppy.addFilePathsInDirToArray(localTemplateDirPath, self.templateFiles);
		}

		var tplData = self.getTemplateDataFromFiles(self.templateFiles);
			
		var processStream = photoshop.createStream(processJSX, {tplData:tplData, pathSep:path.sep, baseConfigData:baseConfigData, TEMPLATE_PARTS:self.TEMPLATE_PARTS, jsxPaths:self.jsxPaths}).on('data', function(data) {

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

			if (!responseData.push){
				responseData = [responseData];
			}


			var responseDataArr = responseData;


			for (var rd = 0; rd < responseDataArr.length; rd++){

				responseData = responseDataArr[rd];

				//console.log(responseData);
				//return;

				if (self.verbose){
					console.log(JSON.stringify(responseData.outputData, null, 2));
				}
				console.log('\n' + responseData.outputString + '\n');

				if (responseData.outputFilePath && responseData.outputFilePath.length > 0){

					var outputFileContents = responseData.outputString;

					if (responseData.outputTags && responseData.outputTags.start && responseData.outputTags.end && responseData.outputTags.start.length > 0 && responseData.outputTags.end.length > 0){


						for (var ps = 0; ps < 2; ps++){

							var existingContents = fs.readFileSync(psdContainingDir + responseData.outputFilePath, 'utf8');
							var searchPattern = new RegExp(responseData.outputTags.start.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(.|[\r\n])*' + responseData.outputTags.end.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
							outputFileContents = existingContents.replace(searchPattern, responseData.outputTags.start+responseData.outputString+responseData.outputTags.end);
							var tagMatch = existingContents.match(searchPattern);

							if (tagMatch === null){
								if (ps == 1){
									throw new Error('Output tags not found.');
								} else {

									responseData.outputTags.start = responseData.outputTags.start.split('\\-').join('-');
									responseData.outputTags.end = responseData.outputTags.end.split('\\-').join('-');

									//console.log(responseData.outputTags.start);
								}
							} else {
								console.log('Found tags: "'+responseData.outputTags.start+'" and "'+responseData.outputTags.end+'".\n');
								break;
							}

						}

					}

					fs.writeFileSync(psdContainingDir + responseData.outputFilePath, outputFileContents);
					console.log('Wrote to ' + responseData.outputFilePath + '\n');

				}

				if (rd == responseDataArr.length - 1){ // Last loop only
					
						self.onPsdDone();
				
				}
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

}



function processJSX(stream, props){
	

	// If a layer comp or layer starts with this char then they will not be included in operatios
	var IGNORE_PREFIX_CHARS = {'`':true};


	var utilMsg = '\n';
	var doc = app.activeDocument;
	
	//var selLayerLookup = {};

	var originalDoc = doc;
	doc = doc.duplicate();
	
	// Set args
	var tplData = props.tplData;
	var pathSep = props.pathSep;
	var baseConfigData = props.baseConfigData;
	var TEMPLATE_PARTS = props.TEMPLATE_PARTS;
	var jsxPaths = props.jsxPaths;
	
	


	//stream.writeln('debug:var tplData=' + JSON.stringify(tplData) +';');
	//stream.writeln('debug:var pathSep=' + JSON.stringify(pathSep) +';');
	//stream.writeln('debug:var baseConfigData=' + JSON.stringify(baseConfigData) +';');
	//stream.writeln('debug:var TEMPLATE_PARTS=' + JSON.stringify(TEMPLATE_PARTS) +';');


	// The default image prop fallbacks.

	var PROP_DEFAULTS = {alt: '', cropToBounds: false, template: 'img', ext: 'jpg', quality: 80, flipX: false, flipY: false, relativePath: './', basePath: './', matte:null, colors:256, scale:1, sizeFileHandle:'', sizeIndex:-1, sizes:null, reg: 'TL', outputValueFactor: 1, regX:0, regY:0, regPercX:0, regPercY:0, forceW:-1, forceH:-1, roundOutputValues:false, boundsComp:'', outputOriginX: 0, outputOriginY: 0, outputOriginLayer:null, placeholder:false, reverseOrder: false, tlX:0, tlY:0, wipeRelativePath: '', pre: '', post:'', parent:'', type:'', tfParams: ''};
	// Which props are affected by |outputValueFactor|
	var OUTPUT_VALUE_FACTOR_PROPS = ['width','height','x','y','regX','regY', 'tlX', 'tlY'];
	var BOOL_PROPS = ['cropToBounds', 'flipX', 'flipY', 'roundOutputValues', 'placeholder', 'reverseOrder'];
	var NUM_PROPS = ['quality','scale','forceW','forceH', 'outputOriginX', 'outputOriginX', 'tlX', 'tlY', 'nestlevel'];
	var NEWLINE_PROPS = ['template'];
	// These will have a trailing slash added if needed.
	var DIR_PROPS = ['relativePath', 'basePath'];
	// These will be set to config data if not set.
	var CONFIG_PROP_DEFAULTS = baseConfigData;
	var VALID_OUTPUT_EXTS = ['jpg', 'png', 'gif'];
	var CONFIG_LAYERCOMP_NAME = '{choppy}';
	var SIZE_FILEHANDLE_PLACEHOLDER = '{s}';
	var TEMPLATE_VAR_PRE = '%';
	var TEMPLATE_VAR_POST = '%';
	// What chars separate multiple templates when defined with |template| var
	var TEMPLATE_MULTI_SEP = ',';
	var REG_LAYER_NAME = '{reg}';
	var BOUNDS_COMP_NEXT_KEYWORD = '{next}'
	var BOUNDS_COMP_PREV_KEYWORD = '{prev}'
	
	var DEFAULT_PRE = ['cleanup-comps','nestlevel-shorthand','core-shorthand','parent-from-nestlevel','tf']; 
	var DEFAULT_POST = []; 
	

	// Get psd info

	var psdContainingDir = ensureDirPathHasTrailingSlash(originalDoc.path, pathSep);
	var psdName = originalDoc.name;
	var psdFullName = originalDoc.fullName;
	var psdBounds = new Array(0,0,doc.width.value,doc.height.value);
	
	// Assuming doc has an extension

	var psdNameParts = psdName.split('.');
	psdNameParts.splice(psdNameParts.length - 1, 1);
	var psdBase = psdNameParts.join('.');

	PROP_DEFAULTS['psdBase'] = psdBase;
	PROP_DEFAULTS['psdWidth'] = doc.width.value;
	PROP_DEFAULTS['psdHeight'] = doc.height.value;
	
	
	if (!doc){
		throw new Error('No PSD document open.')
	}
	

	var configData = null;
	var outputData = [];

	var compNameCheck = {}
	var dupeCompNamesPresent = false;
	
	var delLayerComps = [];
	
	var processLayerComps = function(configMode){
		
		var _configData = null;
		
		for (var i =0; i < doc.layerComps.length; i++){

			var layerComp = doc.layerComps[i];
			if (dupeCompNamesPresent){
				// Do nothing
			} else if (compNameCheck[layerComp.name]){
				dupeCompNamesPresent = true;
			} else {
				compNameCheck[layerComp.name] = true;
			}
			var compData = {};
			var totalProps = 0;

			compData._nextLayerCompName = '';
			if (i > 0){
				compData._prevLayerCompName = doc.layerComps[i-1].name;
			}
			if (i < doc.layerComps.length-1){
				compData._nextLayerCompName = doc.layerComps[i+1].name;
			}

			if (IGNORE_PREFIX_CHARS[layerComp.name.charAt(0)]){
				
				delLayerComps.push(layerComp);
				
			} else if ((configMode && layerComp.name === CONFIG_LAYERCOMP_NAME) || (!configMode && layerComp.name !== CONFIG_LAYERCOMP_NAME)){

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
							} else if (NEWLINE_PROPS.indexOf(varName) >= 0){
								varVal =  String(varVal).split('\\n').join('\n');
								varVal =  String(varVal).split('\\t').join('\t');
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
		
				// Check relative path 
				
				if (compData['relativePath']){
					compData['relativePath'] = ensureDirPathHasTrailingSlash(compData['relativePath'].split('/').join(pathSep), pathSep);
				}
				
				
				
				// The `name` should be the base
				compData['base'] = layerComp.name; 
				
				compData.layerCompRef = layerComp;

				if (layerComp.name === CONFIG_LAYERCOMP_NAME){
					if (configMode){
						delete compData['base'];
						_configData = compData;
						delLayerComps.push(layerComp); 
					}
				} else {

					compData.selected = layerComp.selected;

					outputData.push(compData);

				}
			}
		}
		
		
		if (configMode){
			
			// Delete comment comps
			for (var i = 0; i < delLayerComps.length; i++){
				delLayerComps[i].remove();
			}
			
			return _configData;
		}
		
	}
		
	// Config data
	// -----------
	
	// Load config data only
	configData = processLayerComps(true);
	
	// Extend config data
	if (configData === null){
		configData = extendObjWithDefaults({}, CONFIG_PROP_DEFAULTS);
	} else {
		configData = extendObjWithDefaults(configData, CONFIG_PROP_DEFAULTS);
	}
	// Apply defaults to config so they can extend each output img.
	configData = extendObjWithDefaults(configData, PROP_DEFAULTS);
	
	// Read local pre/post JSX script names (based on {choppy} layer (and .choppy json))  
	
	var pre = DEFAULT_PRE; 
	if (configData.pre && typeof configData.pre === 'string' && configData.pre.length > 0){		
		pre = pre.concat(configData.pre.split(','));		
		// Push certain scripts to the start.
		var index = pre.indexOf('layers-to-comps')
		if (index > 0) {
		    pre.splice(index, 1);
		    pre.unshift('layers-to-comps');
		}
	}
	
	var post = DEFAULT_POST; 
	if (configData.post && typeof configData.post === 'string' && configData.post.length > 0){		
		post = post.concat(configData.post.split(','));		
	}
	
	// Call `pre` hooks
	var anyDebugOutput = false;
	for (var i = 0; i < pre.length; i++){
		
		var jsxScriptName = pre[i];
		var extParts = jsxScriptName.split('.');
		if (extParts.length > 1 && extParts[1].toLowerCase() == 'jsx'){ // Remove ext if set
			jsxScriptName = jsxScriptName.substr(0, jsxScriptName.length-1);
		}
		if (!jsxPaths.pre[jsxScriptName]){
			throw new Error('JSX `pre` script not found `'+jsxScriptName+'`');
		}
		var jsxPath = jsxPaths.pre[jsxScriptName];
		var jsxFile = new File(jsxPath);
		if (!jsxFile.exists){
			throw new Error('JSX `pre` file not found `'+jsxScriptName+'`');
		}
		var halt = false;
		var outputDebug = DEFAULT_PRE.indexOf(jsxScriptName) == -1;
		if (outputDebug){
			anyDebugOutput=true;
			stream.writeln('debug:Running *pre* hook `'+jsxScriptName+'`...');
		}
		$.evalFile(jsxFile);
		if (halt){
			return;
		}
	}
	if (anyDebugOutput){
		stream.writeln('debug:*pre* hooks complete OK.');
	}
	
	// Load layercomps w/comments into outputData
	processLayerComps();
	
	takeSnapshot();
	
	// Flip order of output
	if (configData.reverseOrder){
		outputData.reverse();
	}
	
	if (configData.wipeRelativePath.length > 0 ){		
		var wipeRelativePaths = configData.wipeRelativePath.split(',');
		for (var i = 0; i < wipeRelativePaths.length; i++){		
			var wipeRelativePath = wipeRelativePaths[i];
			wipeRelativePath = applyVarObjToTemplateString(configData, wipeRelativePath, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, 1, []);		
			wipeRelativePath = ensureDirPathHasTrailingSlash(wipeRelativePath, pathSep);		
			configData.basePath = ensureDirPathHasTrailingSlash(configData.basePath, pathSep);		
			var wipeDir = new Folder(psdContainingDir + configData.basePath + wipeRelativePath);
			deleteImgsFromDir(wipeDir); 
		}
	}
	
	// The number of templates must be defined in {choppy} or base config file.
	var outputTemplates = configData.template.split(TEMPLATE_MULTI_SEP);

	var splitProps = ['outputFilePath', 'outputTagStart', 'outputTagEnd'];

	for (var s1 = 0; s1 < splitProps.length; s1++){
		var splitPropName = splitProps[s1];
		if (configData[splitPropName]){
			configData[splitPropName] = configData[splitPropName].split(TEMPLATE_MULTI_SEP);
			if (configData[splitPropName].length < outputTemplates.length){
				for (var s2 = 0; s2 < outputTemplates.length; s2++){
					if (s2 >= configData[splitPropName].length){
						configData[splitPropName][s2] = configData[splitPropName][0];
					}
				}
			}
		}
	}

	// These are declared here because they need to be accessed after the loop
	// Track which parts you've added so you don't add stuff like '.header.' more than once
	var output = [];
	var templatePartsAdded = [];
	for (var oct = 0; oct < outputTemplates.length; oct++){
		output.push({});
		templatePartsAdded.push({});
	}


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

	var layerBoundsCacheLayers = {};

	var cacheLayerCompBounds = !dupeCompNamesPresent;
	var layerCompBoundsCache = {};
	var exportDirs = [];
	var exportDirsTaken = {};

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

		// applyVarObjToTemplateString(obj,str, pre, post, outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS, roundOutputValues){
		

		outputData[p].relativePath = applyVarObjToTemplateString(outputData[p], outputData[p].relativePath, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, outputData[p].outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS, outputData[p].roundOutputValues)
		
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
		outputData[p].base = outputData[p].base + fileNameSizeHandlePart

		outputData[p].relativePath = outputData[p].relativePath.split(SIZE_FILEHANDLE_PLACEHOLDER).join('');

		outputData[p].srcFileName = outputData[p].base + '.' + outputData[p].ext;
		outputData[p].src = outputData[p].relativePath + outputData[p].srcFileName;
		outputData[p].exportPath = psdContainingDir + outputData[p].basePath + outputData[p].relativePath + outputData[p].srcFileName;
		
		// Save a running list of all export directory paths
		var exportDirPath = psdContainingDir + outputData[p].basePath + outputData[p].relativePath;
		if (!exportDirsTaken[exportDirPath]){
			exportDirs.push(exportDirPath);
			exportDirsTaken[exportDirPath] = true;
		}
		

		// outputOriginLayer
		// -----------------

		if (outputData[p].outputOriginLayer != null && outputData[p].outputOriginLayer.length > 0){
			if (layerBoundsCacheLayers[outputData[p].outputOriginLayer]){

				outputData[p].outputOriginX = layerBoundsCacheLayers[outputData[p].outputOriginLayer][0];
				outputData[p].outputOriginY = layerBoundsCacheLayers[outputData[p].outputOriginLayer][1];

			} else {

				var alteredDoc = false;
				var foundLayer = false;

				for (var i = 0 ; i < doc.layers.length; i++){

					var lyr = doc.layers[i];
					if (lyr.name == outputData[p].outputOriginLayer){

						if (foundLayer){
							throw new Error('|outputOriginLayer| "'+outputData[p].outputOriginLayer+'" is not unique');
						}
						lyr.visible = true;
						foundLayer = true;
						alteredDoc = flattenTopLevelLayerAtIndex(i);

					} else {

						lyr.visible = false;

					}
				}

				if (!foundLayer){

					throw new Error('|outputOriginLayer| "'+outputData[p].outputOriginLayer+'" not found');

				} else {

					var layerBounds = getVisibleBounds(doc);
					outputData[p].outputOriginX = layerBounds[0];
					outputData[p].outputOriginY = layerBounds[1];
					layerBoundsCacheLayers[outputData[p].outputOriginLayer] = layerBounds;

					revertSnapshot(doc);

				}
			}
		}


		// boundsComp
		// ----------

		var boundsCompBounds = null;
		if (outputData[p].boundsComp && outputData[p].boundsComp.length > 0){

			var targetLayerCompName;
			if (outputData[p].boundsComp == BOUNDS_COMP_PREV_KEYWORD){
				targetLayerCompName = outputData[p]._prevLayerCompName
			} else if (outputData[p].boundsComp == BOUNDS_COMP_NEXT_KEYWORD){
				targetLayerCompName = outputData[p]._nextLayerCompName
			} else {
				targetLayerCompName = outputData[p].boundsComp
			}

			var cropToBoundsTarget = doc.layerComps.getByName(targetLayerCompName);
			if (cropToBoundsTarget){

				if (!outputData[p].cropToBounds){
					outputData[p].cropToBounds = true;
				}

				if (cacheLayerCompBounds && layerCompBoundsCache[cropToBoundsTarget.name]){

					boundsCompBounds = copyBounds(layerCompBoundsCache[cropToBoundsTarget.name]);

				} else {

					cropToBoundsTarget.apply();

					// Hide reg layer so it's not included in bounds
					for (var r = 0 ; r < doc.layers.length; r++){
						var lyr = doc.layers[r];
						if (lyr.visible && lyr.name && lyr.name.length >= REG_LAYER_NAME.length && lyr.name.substr(0,REG_LAYER_NAME.length) === REG_LAYER_NAME){
							lyr.visible = false;
						}
					}

					flattenTopLevelLayers(doc, true, false, null, IGNORE_PREFIX_CHARS);
					boundsCompBounds = getVisibleBounds(doc);
					revertSnapshot(doc);

					layerCompBoundsCache[cropToBoundsTarget.name] = copyBounds(boundsCompBounds);

				}
			}
		}

		// Apply layer comp
		var layerComp = outputData[p].layerCompRef;
		layerComp.apply();

		// Look for reg point layer, record position and hide
		var regPt = null;
		for (var r = 0 ; r < doc.layers.length; r++){
			var lyr = doc.layers[r];
			if (lyr.visible && lyr.name && lyr.name.length >= REG_LAYER_NAME.length && lyr.name.substr(0,REG_LAYER_NAME.length) === REG_LAYER_NAME){
				lyr.visible = false;
				regPt = getLayerCenterPoint(lyr);
				outputData[p].reg = '(custom)';
				break;
			}
		}

		var revertRequired = false;

		var outputBounds;
		if (outputData[p].cropToBounds){

			if (boundsCompBounds){
				outputBounds = boundsCompBounds;
			} else {

				if (cacheLayerCompBounds && layerCompBoundsCache[layerComp.name]){
						boundsCompBounds = copyBounds(layerCompBoundsCache[layerComp.name]);
				} else {
					// Only flatten if cropping
					flattenTopLevelLayers(doc, true, false, null, IGNORE_PREFIX_CHARS);
					revertRequired = true; // A revert is required whether a dry-run or not
					outputBounds = getVisibleBounds(doc);
				}
			}


		} else {
			outputBounds = copyBounds(psdBounds);
		}

		var cropBounds = copyBounds(outputBounds)
		outputData[p].outputBounds = outputBounds;

		// Resize bounds to accomodate cropping - this way reg point will be correct

		var forceW;
		var forceH;
		if (outputData[p].forceW > 0 || outputData[p].forceH > 0){

			var cropW = getBoundsWidth(cropBounds);
			var cropH = getBoundsHeight(cropBounds);

			forceW = outputData[p].forceW > 0 ? outputData[p].forceW : cropW;
			forceH = outputData[p].forceH > 0 ? outputData[p].forceH : cropH;

			// Assuming canvas resize will be middle center
			outputBounds[0] = Math.round(outputBounds[0] - (forceW - cropW) * 0.5);
			outputBounds[1] = Math.round(outputBounds[1] - (forceH - cropH) * 0.5);
			outputBounds[2] = Math.round(outputBounds[2] + (forceW - cropW) * 0.5);
			outputBounds[3] = Math.round(outputBounds[3] + (forceH - cropH) * 0.5);

		}

		if (!regPt && outputData[p].reg !== '(custom)'){
			// Interpret 'reg' data
			regPt = getRegPtFromRegStringAndBounds(outputData[p].reg, outputData[p].outputBounds);
		}

		if (!regPt){
			regPt = {x: parseInt(outputBounds[0], 10), y: parseInt(outputBounds[1], 10)};
		}

		outputData[p].tlX = outputData[p].outputBounds[0] - outputData[p].outputOriginX;
		outputData[p].tlY = outputData[p].outputBounds[1] - outputData[p].outputOriginY;

		// Apply reg point data
		outputData[p].x = regPt.x - outputData[p].outputOriginX;
		outputData[p].y = regPt.y - outputData[p].outputOriginY;

		outputData[p].regX = regPt.x - outputData[p].outputBounds[0];
		outputData[p].regY = regPt.y - outputData[p].outputBounds[1];

		outputData[p].regPercX = (regPt.x - outputData[p].outputBounds[0]) / (outputData[p].outputBounds[2] - outputData[p].outputBounds[0]);
		outputData[p].regPercY = (regPt.y - outputData[p].outputBounds[1]) / (outputData[p].outputBounds[3] - outputData[p].outputBounds[1])

		outputData[p].width = outputBounds[2]-outputBounds[0]; //String(parseInt(outputBounds[2],10)-parseInt(outputBounds[0],10));
		outputData[p].height = outputBounds[3]-outputBounds[1]; //String(parseInt(outputBounds[3],10)-parseInt(outputBounds[1],10));

		if (!outputData[p].placeholder){

			if (!areBoundsEqual(psdBounds, outputData[p].outputBounds)){
				revertRequired = true;
				doc.crop(cropBounds);
			}

			if (outputData[p].forceW > 0 || outputData[p].forceH > 0){
				doc.resizeCanvas(UnitValue(forceW,"px"),UnitValue(forceH,"px"), AnchorPosition.MIDDLECENTER);
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

				outputData[p].tlX = outputData[p].tlX * outputData[p].scale;
				outputData[p].tlY = outputData[p].tlY * outputData[p].scale;

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

		var compTemplateSplit = outputData[p].template.split(TEMPLATE_MULTI_SEP);
		if (compTemplateSplit.length != outputTemplates.length){
			throw new Error('Layer comp template list must be same length as config comp');
		}


		for (var ote = 0; ote < compTemplateSplit.length; ote++){

			var template = compTemplateSplit[ote]; // from config
			var templateIsRawString = template.split(TEMPLATE_VAR_PRE).length > 1 && template.split(TEMPLATE_VAR_POST).length > 1;

			var templateFound = false;

			if (tplData[template] !== undefined){
				for (var t = 0; t < TEMPLATE_PARTS.length; t++){
					var part = TEMPLATE_PARTS[t];
					if (tplData[template][part] !== undefined){
						if (output[ote][part] === undefined){
							output[ote][part] = [];
						}
						templateFound = true;
						if (part == 'main'){
							var mainData = applyVarObjToTemplateString(outputData[p], tplData[template][part], TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, outputData[p].outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS, outputData[p].roundOutputValues);
							if (tplData[template]['inter'] !== undefined && p > 0){
								mainData = tplData[template]['inter'] + mainData;
							}
							output[ote][part].push(mainData);
						} else if (part != 'inter'){
							// Only output once
							var templatePartID = template + ':' + part;
							if (!templatePartsAdded[ote][templatePartID]){
								var templateContent = tplData[template][part];
								if (configData){
									templateContent = applyVarObjToTemplateString(configData, templateContent, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, 1, []);
								}
								output[ote][part].push(templateContent);
								templatePartsAdded[ote][templatePartID] = true;
							}
						}
					}
				}
			}
			
		
			if (!templateFound && templateIsRawString){
				if (output[ote]['main'] === undefined){
					output[ote]['main'] = [];
				}
				output[ote]['main'].push(applyVarObjToTemplateString(outputData[p], template, TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, outputData[p].outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS, outputData[p].roundOutputValues));
			}

		}

	}


	// Revert doc
	revertSnapshot(doc);
	
	
	doc.close(SaveOptions.DONOTSAVECHANGES); // Close dupe doc
	doc = originalDoc;

	var responseDataAll = [];

	// Loop templates

	for (var ote = 0; ote < outputTemplates.length; ote++){

		// Make output out of template data
		var outputString = '';
		for (var t = 0; t < TEMPLATE_PARTS.length; t++){
			if (output[ote][TEMPLATE_PARTS[t]] !== undefined){
				outputString += output[ote][TEMPLATE_PARTS[t]].join('');
			}
		}

		// Look for output file path
		var outputFilePath = '';
		var outputTags = {};
		if (configData && configData.outputFilePath && configData.outputFilePath[ote].length > 0){

			configData.basePath = ensureDirPathHasTrailingSlash(configData.basePath, pathSep);

			// You can inject config props into this path
			var injectedOutputFilePath = applyVarObjToTemplateString(configData, configData.outputFilePath[ote], TEMPLATE_VAR_PRE, TEMPLATE_VAR_POST, 1, []);

			outputFilePath = configData.basePath + injectedOutputFilePath; //configData.outputFilePath;
			if (configData.outputTagStart && configData.outputTagEnd && configData.outputTagStart[ote].length > 0 && configData.outputTagEnd[ote].length > 0){
				outputTags = {start:configData.outputTagStart[ote], end:configData.outputTagEnd[ote]};
			}
		}

		// Write response back to node
		var responseData = {outputData: cleanupOutputDataForOutput(outputData,['layerCompRef']),
												outputString: outputString,
												outputFilePath: outputFilePath,
												outputTags: outputTags}


		responseDataAll.push(responseData);

	}
	
	// Call `post` hooks
	var anyDebugOutput = false;
	for (var i = 0; i < post.length; i++){
		var jsxScriptName = post[i];
		var extParts = jsxScriptName.split('.');
		if (extParts.length > 1 && extParts[1].toLowerCase() == 'jsx'){ // Remove ext if set
			jsxScriptName = jsxScriptName.substr(0, jsxScriptName.length-1);
		}
		if (!jsxPaths.post[jsxScriptName]){
			throw new Error('JSX `post` script not found `'+jsxScriptName+'`');
		}
		var jsxPath = jsxPaths.post[jsxScriptName];
		var jsxFile = new File(jsxPath);
		if (!jsxFile.exists){
			throw new Error('JSX `post` file not found `'+jsxScriptName+'`');
		}
		// No halt: script concluding anyway.
		var outputDebug = DEFAULT_POST.indexOf(jsxScriptName) == -1;
		if (outputDebug){
			anyDebugOutput = true;
			stream.writeln('debug:Running *post* hook `'+jsxScriptName+'`...');
		}
		$.evalFile(jsxFile);
	}
	if (anyDebugOutput){
		stream.writeln('debug:*post* hooks complete OK.');
	}
	
	stream.writeln(
		JSON.stringify(responseDataAll)
	);

	// JSX functions
	// -------------

	
	
	
	// folderRef = Folder(pathDocSrc.fullName.parent + '/' + docBaseName + '/' + IMG_FOLDER_NAME);
	function deleteImgsFromDir(dir){
	    if (!dir.exists){
	        alert('Img dir not found: `'+dir.fullName+'`');
	    }
	    var files = dir.getFiles(/.+\.(?:gif|jpg|jpeg|bmp|png)$/i);
	    for (var i = 0; i < files.length; i++){
	        files[i].remove()
	    }
	}

	function getSelectedLayerLookup(layerRef){

		var lookup = {};
	
		//		var selLayers = _getSelectedLayers();
		//		for (var zzz = 0; zzz < selLayers.length; zzz++){
		//			lookup['name:' + selLayers[zzz].name + ',parent:' + selLayers[zzz].parent.name] = true
		//		}

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

	function getBoundsWidth(bounds){
		var width = bounds[2] - bounds[0];
		return width;
	}

	function getBoundsHeight(bounds){
		var height = bounds[3] - bounds[1];
		return height;
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

		if (regStr.split(',').length == 2) {

			var coords = regStr.split(',');
			var rx = Number(coords[0]);
			var ry = Number(coords[1]);

			return {x: rx, y: ry};

		} else {

			regStr = regStr.toUpperCase();
			regStr = regStr.split('M').join('C');
			regStr = regStr.split('CC').join('C');

			if (regStr == 'C'){
				hozP = vertP = 0.5;
			} else {

				var remains = '';
				var hozFound = false;
				var vertFound = false;
				//var chars = ['L','R','T','B'];
				//for (var i = 0; i < chars.length; i++){
				// var c = chars[i];

				if (regStr.split('L').length > 1){
					hozP = 0;
					hozFound = true;
				} else if (regStr.split('R').length > 1){
					hozP = 1;
					hozFound = true;
				}

				if (regStr.split('T').length > 1){
					vertP = 0;
					vertFound = true;
				} else if (regStr.split('B').length > 1){
					vertP = 1;
					vertFound = true;
				}
				//}

				if (hozFound && !vertFound && regStr.split('C').length > 1){
					vertP = 0.5;
				} else if (!hozFound && vertFound && regStr.split('C').length > 1){
					hozP = 0.5;
				}
			}

			return {x: x + width * hozP, y: y + height * vertP};

		}
	}
	
	// This function assumes `cleanup-comps` has been run
	// Props are case sensitive
	function setCommentProp(layerComp, propName, propVal) {
		propName = String(propName)
		propVal = String(propVal)
		var commentParts = layerComp.comment ? layerComp.comment.split('\n') : [];
		var propDec = propName+': ' + propVal;
		var foundProp = false;
		for (var j = 0; j < commentParts.length; j++){			
			if (commentParts[j].split(propName)[0].length == 0){
				commentParts[j] = propDec;	
				foundProp = true;		
			}
		}
		if (!foundProp){
			commentParts.push(propDec);
		}
		layerComp.comment = commentParts.join('\n');
	}

	// This function assumes `cleanup-comps` has been run
	// Props are case sensitive
	function getCommentProp(layerComp, propName) {
		
		propName = String(propName);
		var propParts = layerComp.comment ? layerComp.comment.split(propName+':') : [];
		if (propParts.length > 1 && (propParts[0].length == 0 || propParts[0].charAt(propParts[0].length-1) == '\n')){			
			return trim(propParts[1].split('\n')[0]);			
		}
		
		return null;
		
	}

	// This function assumes `cleanup-comps` has been run
	function deleteCommentProp(layerComp, propName) {
		
		propName = String(propName);
		var propParts = layerComp.comment ? layerComp.comment.split(propName+':') : [];
		if (propParts.length > 1 && (propParts[0].length == 0 || propParts[0].charAt(propParts[0].length-1) == '\n')){
			if (propParts[0].length > 0){
				propParts[0] = propParts[0].substr(0, propParts[0].length-1); // Remove preceeding line break
			}
			var linebreakParts = propParts[1].split('\n');
			linebreakParts.splice(0, 1);
			propParts[1] = linebreakParts.join('\n')
			if (propParts[0].length == 0){
				propParts.splice(0,1);  
			}
			layerComp.comment = propParts.join('\n');			
		}	
		
	}

	function trim(str){
		return trimEnd(trimStart(str))
	}

	function trimStart(str){
		var trimLen = 0;
		for (var i = 0; i < str.length; i++){
			var chr = str.charAt(i)
			if (chr == ' ' || chr == '\t' || chr == '\n'){
				trimLen++;
			} else {
				break;
			}
		}
		return str.substr(trimLen);	
	}

	function trimEnd(str){
		var trimLen = 0;
		for (var i = 0; i < str.length; i++){
			var chr = str.charAt(str.length-1-i)
			if (chr == ' ' || chr == '\t' || chr == '\n'){
				trimLen++;
			} else {
				break;
			}
		}
		return str.substr(0, str.length-trimLen);	
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

	function applyVarObjToTemplateString(obj,str, pre, post, outputValueFactor, OUTPUT_VALUE_FACTOR_PROPS, roundOutputValues){

		str = String(str);
		var outputValueFactorPropsLookup = '#' + OUTPUT_VALUE_FACTOR_PROPS.join('#') + '#';
		for (var p in obj) {
			var val = obj[p];
			// Apply value factor to applicable props
			if (outputValueFactorPropsLookup.split('#'+p+ '#').length === 2){
				val = Number(val) * outputValueFactor;
				if (roundOutputValues){
					val = Math.round(val);
				}
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

	/*
	function getContainingDirPath(strPath, pathSep){

		strPath = strPath.split('\\').join('/');
		var arr = strPath.split('/');
		arr.splice(arr.length - 1, 1);
		return arr.join(pathSep);
		
	}
	*/

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

	function flattenTopLevelLayerAtIndex(index){

			var layer = doc.layers[index];
			var wasAltered = false;
			doc.activeLayer = layer;
			if (layer.typename === 'LayerSet' ||
					activeLayerHasLayerMask() ||
					activeLayerHasVectorMask() ||
					activeLayerHasFilterMask() ||
					activeLayerHasStyle()){
					wasAltered = true;
					createSmartObject(doc, layer);
			}

			return wasAltered;
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
	
	function debug(obj){
		alert(JSON.stringify(obj, null, 2))
	}
	
	
}

function pr(obj){

	console.log(JSON.stringify(obj, null, 2));

};

module.exports = new Choppy();



function getFilesWithExts(srcpath, exts) {

  return fs.readdirSync(srcpath).filter(function(file) {
    return !fs.statSync(path.join(srcpath, file)).isDirectory() && isFileOfExtension(path.join(srcpath, file), exts);
  });

}

function isFileOfExtension(fsPath, extList){

	return isExtofExtensions(path.extname(fsPath), extList);

}

function isExtofExtensions(ext, extList){

	var ext = ext.toLowerCase();
	ext = ext.charAt(0) == '.' ? ext : '.'+ext;

	extList = Array.isArray(extList) ? extList : [String(extList)];

  for (var i = 0; i < extList.length; i++){
    var listExt = extList[i].toLowerCase();
    if (listExt == '*'){
      return true;
    }
    listExt = listExt.charAt(0) == '.' ? listExt : '.'+listExt;
    if (ext == listExt){
      return true;
    }
  }

	return false;

}

function loadJsxPaths(containingDir, overwriteExisting = {}){ 
	var jsxPaths = overwriteExisting;
	if (fs.existsSync(containingDir) && fs.statSync(containingDir).isDirectory()){
		var jsxFilenames = getFilesWithExts(containingDir, ['.jsx']);
		for (var i = 0; i < jsxFilenames.length; i++){
				var scriptID = path.basename(jsxFilenames[i], path.extname(jsxFilenames[i]))
				var jsxFilepath = path.join(containingDir, jsxFilenames[i]);
				jsxPaths[scriptID] = jsxFilepath;
		}
	}
	return jsxPaths;
}
