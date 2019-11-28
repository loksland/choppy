#target photoshop

/*


Newline is replaced with \n
Tab is replaced with \t
Double quote is replaced with \"

*/
parse = function(propName, propVal){
	
	if (typeof propVal !== 'string'){
		return propVal;
	}
	
	// These require double escape char
	
	propVal = propVal.split('\\'+'\\t').join('\t');
	propVal = propVal.split('\\'+'\\n').join('\n');
	propVal = propVal.split('\\'+'\\r').join('\r');
	
	propVal = propVal.split('\\t').join('\t');
	propVal = propVal.split('\\n').join('\n');
	propVal = propVal.split('\\r').join('\r');
	
	propVal = propVal.split('\t').join('\\'+'\\t');
	propVal = propVal.split('\n').join('\\'+'\\n');
	propVal = propVal.split('\r').join('\\'+'\\r');
	
	return propVal;
	
}

