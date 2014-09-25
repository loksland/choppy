'use strict';

// Grunt is used to validate js.
 
module.exports = function (grunt) {

	grunt.initConfig();
	
	// Watch
	// -----
    
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.config('watch', {
		js: {
			options: {
			event: ['changed'],
			},
			files: '*.js',
			tasks: ['jshint:dev']
		}				
	});
	
	// JS Hint
	// ------- 
	
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.config('jshint', {
		options: {
      'curly': true,
			'eqeqeq': true,
			'undef': true,
			'browser': true,
			'unused': false,
			'quotmark': 'single',
			'noarg': true,
			'nonew': true,
			'newcap': true,
			'latedef': false,
			'freeze': true,
			'immed': true,
			'bitwise': true,
			'camelcase': true,
			'indent': 2,
			'strict': false,
			'devel': true,
			'node': true
    },
    dev: ['*.js'],
    prod: {
      options: {
        'devel': false,
      },
      files: {
        src: ['*.js']
      },
    }
	});
	
  // Tasks
  // -----
	
	grunt.registerTask(
		'dev', 
		['jshint:dev']
	);
	
	grunt.registerTask(
		'prod', 
		['jshint:prod']
	);
	
	grunt.registerTask(
		'default', 
		['watch']
	);
	
};