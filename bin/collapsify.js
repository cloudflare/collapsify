#!/usr/bin/env node

var yargs = require( 'yargs' ),
	cluster = require( 'cluster' ),
	utility = require( '../lib/utility' ),
	argv = yargs.usage( 'Usage: $0 <options>' )
	.alias( {
		'?' : 'help',
		'p' : 'port',
		'h' : 'host',
		'H' : 'headers',
		'd' : 'depth',
		'v' : 'verbose',
		'a' : 'all',
		'c' : 'css',
		'j' : 'js',
		'I' : 'images',
		'i' : 'htmlimages',
		'u' : 'cssimages',
		'F' : 'fonts',
		'f' : 'favicons',
		'w' : 'workers',
		'D' : 'listenfd',
		's'  : 'systemd'
	} ).default( {
		'p' : 8020,
		'd' : 10,
		'v' : 0,
		'w' : 4
	} ).describe( {
		'?' : 'Show this usage information.',
		'p' : 'The port for Collapsify to listen on.',
		'h' : 'The hostname that Collapsify should respond to.',
		'H' : 'Custom headers (curl style) to set on all requests.',
		'd' : 'Specify the maximum depth of linked assets to insert.',
		'w' : 'Specify the number of works to spawn.',
		'v' : 'Verbosity of logging output. 1 is errors, 2 is all.',
		'a' : 'Collapse all assets found in the document.',
		'c' : 'Collapse stylesheets.',
		'j' : 'Collapse JavaScripts.',
		'I' : 'Collapse all images.',
		'i' : 'Collapse images in the HTML.',
		'u' : 'Collapse images within stylesheets.',
		'F' : 'Collapse fonts within stylesheets.',
		'f' : 'Collapse favicons and mobile device icons.',
		'D' : 'The file descriptor {number} to listen on',
		's' : 'Start with systemd'
	} ).boolean( [ 'a', 'c', 'j', 'I', 'i', 'u', 'F', 'f' ] ).argv;

if ( argv['?'] ) {
	yargs.showHelp();
	process.exit( 1 );
}

if ( argv.H ) {
	argv.H = [].concat( argv.H ).reduce( function( headers, header ) {

		header = header.trim().split( ':' );
		headers[header[0].trim()] = header[1].trim();

		return headers;
	}, {} );
}

utility.verbosity = argv.v;

if ( cluster.isMaster && argv.w > 0 ) {

	var worker;

	cluster.on( 'fork', function( worker ) {

		worker.on( 'exit', function() {

			utility.error( 'Worker ' + worker.pid + ' died. Attempting to respawn..' );
			cluster.fork();
		} );
	} );

	for (var i = 0; i < argv.w; i++) {
		cluster.fork();
	}
} else {
	require( '../index' ).startServer( argv );
}
