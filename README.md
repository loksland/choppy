Choppy
======

Choppy is a command line node script to perform image slicing and exporting from Photoshop 
using layer comp configuration. It runs on the PSD currently open in Photoshop.

Install choppy
--------------

```bash
$ npm install choppy -g
```

Getting started
---------------

Open a PSD and add a layer comp for each image to be outputted.  
Eg. 'output/mypic.png'

Run choppy in command line:
```bash
$ choppy
```

An image called 'mypic.png' will be saved to the 'output/' directory.

Why?
----

- Website images and game sprite assets can usually be broken up into separate psds that 
follow logical groupings. Eg. "share-icons.psd", "player-sprites.psd".  
This way you aren't left with a giant psd with 100s of slices, often hidden or only 
applicable to one layer comp in the design psd. You also avoid the opposite problem, where
you have a separate PSD for every asset.
- Slices in Photoshop are combersome to make, difficult to maintain and often hidden. 
Being able to output layer comps by their bounds means you don't have to drag dimension 
handles ever again.
- Design psds tend to messy and bloated with the process of design. An output-specific psd
can still include site / game context while still focusing on assets at hand. These lean 
psds can then be added to source control without wasting space.
- The ability to output html / json / or custom wrapping text as well as images means alt 
text and dimension data can be configured in one place and updated automatically on 
output. 

Requirements
------------

- Node + npm
- Photoshop (tested for Photoshop CC 2014)

Documentation
-------------

**<em>Check out the PSD files in /examples/ to see choppy in action.</em>**

Configuration variables are set in the layer comp comment in the following format:  

Eg. Layer comp called  
"img/mypic.png" with comment:
```
alt: A pic I took
cropToBounds: true
```

###Image layer comp###

Each output image is represented by a layer comp named as the output filepath relative
to the global |basePath|. Eg. "img/mypic.jpg" 

The extension, if set, will define the file format of the outputted file.

Variables:
- **alt** (string)
The alternate text to be outputted for the image. If the comment area hasn't got variables 
then the text will be assumed as alt text.
- **cropToBounds** (boolean)
If true then the output image dimensions will be informed by the bounds of the layer comp 
rather than the PSD dimensions.
- **template** (string)
Either custom template string or the slug of a template file. Default is "img".
- **ext** (string) 
Optional extension to be applied. This will only apply if there is no extension in the 
layer comp name. Valid entries are jpg, gif or png.
- **flipX**, **flipY** (boolean)
Flip the output horizontally / vertically. Default is false.
- **relativePath** (string)
Optional output path relative to |basePath|. This will only apply if there is no path
defined in the image layer comp itself.
-- **basePath**  (string)
The relative path from the PSD to the output directory. 
It's recommended to use .choppy instead for defining this variable.
- **quality** (integer)
Image output quality for jpgs only. 0-100. Default is 80.
- **matte** (string)
Set the matte color for gif as a hex string. Eg. #FF3300. Hash optional, case insensitive.
- **colors** (integer)
Set the number of colors for a gif. 1-256.
- **optimize** (boolean)
Utilizes the amazing [ImageOptim-CLI](https://github.com/JamieMason/ImageOptim-CLI) to compress the outputted image. Mac only. 
Requires free software [ImageAlpha](http://pngmini.com/) and [ImageOptim](http://imageoptim.com/) installed. 

###{choppy} Layer comp###

Optionally define the default settings for all output images in the current PSD. 

All image vars above can be set and will be used as defaults if they are not set in the image
layer comps.

The {choppy} layer comp also supports the following variables:
- **outputFilePath** (string)  
If set the string result will be saved to the specified file path, relative to the base path.
- **outputTagStart**, **outputTagEnd** (string)
When |outputFilePath| is true, the result string will be inserted between
these tags if found in the output file. 
<!--
- **outputLayers** (boolean)  
Experimental. If set to true then all layers associated with the {choppy} layercomp will 
be outputted individually without creating layer comps for each. Any other layer comps are ignored.
It's recommended to define global |relativePath| and |ext| as well with this setting. 
The layer name is taken as the alt text, and the file name will be derived 
from this data.
-->

###Base config file###

Optionally place a file called '.choppy' in the same dir as your PSDs to direct to the base
url for all. 

```
{
  "basePath": "../_source/"
}
```
This is better than defining basePath in the PSD documents as if the source dir is 
moved the basePath will need to be updated in each PSD. This way it only needs to be 
updated in the one place.

Any other layer comp props can be defined here, though is not usually necessary.

###Overriding###

A config var with an important "!" at start will override descendants and also prevent ancestors from
overriding. Eg.
```
!cropToBounds: true
```

Templates
---------

- Templates reside in ./tpl/ directory.
- Custom templates can be defined in a ./tpl/ dir in the same folder as the PSD.
- Default template is "img".
- Templates can be of any extension.

###Vars###
- src  
The output image source path relative to config settings.
- width
The output image width.
- height
The output image height.
- base  
The base filename of the image without extension.
- alt  
Alt tag.
- ext  
File extension without a preceeding ".".
- index
The layer comp index.
- x & y
The position of the pic relative to the containing doc, useful for for `cropToBounds` output. 
- Any other unreserved vars set anywhere in the config chain.

###Format###
- %varname%
```
<img src="%src%" width="%width%" >
```

###File parts###
- mytemplate.txt  
Required. The main template, used for each image outputted, where mytemplate is the 
name of the template.
- mytemplate.header.txt  
Optional. Will be added to the top of the output text. Suitable for instructions, global
styles etc. Does not swap out variables.
- mytemplate.footer.txt   
Optional. Will be added to the bottom of the output text. Does not swap out variables.
- mytemplate.inter.txt  
Optional. Will be added between items. Does not swap out variables.

Command line
------------

Add the arg `dry` to run the choppy script in dry-run mode without outputting any images:
```bash
$ choppy dry
```
Template and text output will still perform.

Add the arg `sel` to output the selected layer comp/s only
```bash
$ choppy sel
```
Template and text output will still perform.


## Release History
- v1.0.3 – Added template fields |x| and |y|
- v1.0.4 – Injecting into output file tags
- v1.0.5 - Dry run mode
- v1.0.6 - Export gifs with matte and color options
- v1.0.7 - Image optimisation added (for Mac)
- v1.0.8 - Sel command line arg to output selected comps only, multiple layer bounds bugfix
- v1.1.0 - Dependency fix
- v1.1.1 - Width result bugfix
- v1.1.2 - More descriptive error messages
