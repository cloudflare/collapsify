# mobilize

Mobilize is a server that exposes a very basic service. Point it at an HTML 
page on the web, and it will respond with the same page with all JavaScripts,
stylesheets and images merged into the page.

In other words, Mobilize attempts to convert arbitrary html pages into a
single file.

## Installing

    sudo npm install -g mobilize

## Usage

Start the server with the 'mobilize' command:

    $ mobilize

### --verbose

Enable verbose output from the server.

### --workers

Configure the number of workers spawned by the server. The default is 4.

### --port

Set the default port that Mobilize should listen on. The default is 80.

## API

Mobilize accepts the following query parameters.

### url

Required. Defines the path to the HTML page to "mobilize."

### imageroot

Optional. If defined, instead of inlining images as data URLs (which is not
supported well, if at all, by older versions of Internet Explorer), image
source URLs will be re-based off of value set with imageroot. Additionally,
a manifest will be provided in the HTML defining a mapping of original
image URLs to re-based image URLs.
