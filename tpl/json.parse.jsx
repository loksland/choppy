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
	
	propVal = propVal.split('"').join('\\"');
	propVal = propVal.split('\t').join('\\t');
	propVal = propVal.split('\n').join('\\n');
	
	return propVal;
	
}

