Choppy
======

Choppy is a command line node script to perform image slicing and exporting from Photoshop 
using layer comp configuration. It runs on the PSD currently open in Photoshop.

Install choppy
--------------

```bash
$ npm install choppy -g
```

Instructions
------------

Open a PSD and add a layer comp for each image to be outputted.  
Eg. 'output/mypic.png'

Run choppy:
```bash
$ choppy
```

PSD config
----------

Configuration variables are set in the layer comp description in the following format:  

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
- **alt**  
If the description area hasn't got variables then the text will be assumed as alt text.
- **cropToBounds**  
If true then the output image dimensions will be informed by the bounds of the layer comp 
rather than the PSD dimensions.
- **template**  
Either custom template string or the slug of a template file. Default is "img".
- **ext**  
Optional extension to be applied. This will only apply if there is no extension in the 
layer comp name.
- **quality**
Image output quality. 0-100.
- **flipX**, **flipY**
Flip the output horizontally / vertically.
- **relativePath**
Optional output path relative to |basePath|. This will only apply if there is no path
defined in the image layer comp itself.
-- **basePath**  
The relative path from the PSD to the output directory. 
It's recommended to use .choppy instead for defining this variable.

###{choppy} Layer comp###

Optionally define the default settings for all output images in the current PSD. 

All image vars can be set and will be used as defaults if they are not set in the image
layer comps.

###Output layers###

A special variable called |outputLayers| is available to the {choppy} layer comp. If set to true
then all layers associated with the {choppy} layercomp will be outputted 
individually without creating layer comps for each. Any other layer comps are ignored.

It's recommended to define global |relativePath| and |ext| as well with this setting.
{choppy} Layer comp comment:
```
outputLayers: true
relativePath: pics/
ext: png
```

In layer mode the layer name is taken as the alt text, and the file name will be derived 
from this data.

###Output file path###

A special variable called |outputFilePath| is available to the {choppy} layer comp. If 
set the string result will be saved to the specified file path, relative to the base path.

Any existing contents will be deleted.

Base config file
----------------

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

Any other layer comp props can be defined here, though is not recommended.

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

###Template vars###
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
