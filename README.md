# Mobilize

Mobilize is a web optimization server. Currently its main use to to merge all
all of the assets of a given HTML file, producing a working page in one file.

## Installation

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

### imagebase

Optional. If defined, instead of inlining images as data URLs (which is not
supported well, if at all, by older versions of Internet Explorer), image
source URLs will be re-based off of value set with imageroot. Additionally,
a manifest will be provided in the HTML defining a mapping of original
image URLs to re-based image URLs.
