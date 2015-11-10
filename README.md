![alt tag](/choppy-icon.png)

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

Advantages
----------

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

### Image layer comp ###

Each output image is represented by a layer comp named as the output filepath relative
to the global |basePath|. Eg. "img/mypic.jpg" 

The extension, if set, will define the file format of the outputted file.

If the layer comp begins with a backtick char (`` ` ``) it will be ignored.

Variables:
- **alt** (string)  
The alternate text to be outputted for the image. If the comment area hasn't got variables 
then the text will be assumed as alt text.
- **cropToBounds** (boolean)  
If true then the output image dimensions will be informed by the bounds of the layer comp 
rather than the PSD dimensions.
- **boundsComp** (string)
Default blank. Specify another layer comp, by name, to be used for the bounds of this 
clip. May be a comment comp (beginning with a backtick) or another comp. Will 
automatically enable |cropToBounds| if set. Also accepts `{prev}` and `{next}` to reference
previous/next layer comps. This is preferable as it doesn't break if layer comps are 
renamed.
- **ext** (string)  
Optional extension to be applied. This will only apply if there is no extension in the 
layer comp name. Valid entries are jpg, gif or png.
- **flipX**, **flipY** (boolean)  
Flip the output horizontally / vertically. Default is false.
- **relativePath** (string)  
Optional output path relative to |basePath|. This will only apply if there is no path
defined in the image layer comp itself.
- **basePath**  (string)  
The relative path from the PSD to the output directory. 
It's recommended to use .choppy instead for defining this variable.
- **quality** (integer)  
Image output quality for jpgs only. 0-100. Default is 80.
- **matte** (string)  
Set the matte color for gif as a hex string. Eg. #FF3300. Hash optional, case insensitive.
- **colors** (integer)  
Set the number of colors for a gif. 1-256.
- **forceW** and **forceH** (integer)
After being cropped to bounds and before applying scaling, the canvas will be resized to
these pixel dimensions. Default is -1 which will not be applied.
- **scale**  (float)
Scale the output. Default 1.0. Eg 0.5 will output 50% size.  
Optionally enter simple expressions to be evaluated. Eg. 2/3
- **sizes** (string)  
Output multiple sizes of the same image.  
Format: filename:scale,filename:scale
Eg. '@2x:1,sd:.5' will output 2 files and inject '@2x' and 'sd' into the filename before
the extension.  
Optionally put {s} in your file name / path to customize where the file size is placed in the output.  
If size set then any scale props will be overwritten and ignored.
All sizes will be added to the output as if additional layercomps were created for each
size.
- **sizeDef%Name%** (string)  
Optionally define individual sizes or groups of sizes by shorthand name. These can reference
other sizes. Eg:  
sizeDefSD: sd:1/2  
sizeDefRETINA: @2x:1,SD   
sizes: RETINA  
Although this example uses uppercase the shorthand name is case insensitive.  
Size definitions can be placed in the .choppy config file for use across multiple files.
- **optimize** (boolean)  
Utilizes the amazing [ImageOptim-CLI](https://github.com/JamieMason/ImageOptim-CLI) to compress the outputted image. Mac only. 
Requires free software [ImageAlpha](http://pngmini.com/) and [ImageOptim](http://imageoptim.com/) installed. 
- **reg** (string)  
Override the reg point for the image. Default is top left. Input values are 2 characters: 
the first represents vertical space, the second horizontal. Eg. "TL" = top left, 
"BR" = bottom right, "C" = centered both dimensions, "CR" = centered vert + right aligned,
"TC" = top aligned + centered horizontally. Alternatively enter coords relative to 
document origin - eg "100,33".
- **outputValueFactor** (float)  
Default 1. All values sent to output templates will be multiplied by this factor. It 
doesn't affect the size of images exported, just the values written for |x|, |y|, |regX|, 
|regY|, |width| and |height| in the template output. 
- **roundOutputValues** (boolean)  
Default false. All values sent to output templates will be rounded to integer values. It 
doesn't affect the size of images exported, just the values written for |x|, |y|, |regX|, 
|regY|, |width| and |height| in the template output.
- **outputOriginX** and **outputOriginX** (integer)  
Default 0. Sets the virtual origin point of the document fo output. These values will be
removed from the |x| and |y| properties supplied to the output template. Will not affect 
images exported, just the |x| and |y| values displayed.
- **outputOriginLayer** (string) Layer name  
Default null. Optionally provide a layer name whose top left bounds will be set to the 
|outputOriginX| and |outputOriginY|. It's assumed the layer name is unique to the document
and on the top level.
- **placeholder**  (boolean)
Default false. If set to true will not output an image though all other processing will
occur.

### {reg} Layer ###

If a layer named {reg} is visible in a layer comp it will be hidden and used as a marker
for the registration point. Will override **reg** value if present.

### {choppy} Layer comp ###

Optionally define the default settings for all output images in the current PSD. 

All image vars above can be set and will be used as defaults if they are not set in the image
layer comps.

The {choppy} layer comp also supports the following variables:
- **template** (string)  
Either custom raw template string or the slug of a template file. Default is "img".  
This can also be defined per comp.
Comma separate template slugs for multiple output.
Also requires comma-separation of 
{choppy} comp vars |outputFilePath|, |outputTagStart| and |outputTagEnd| if present.
- **outputFilePath** (string)  
If set the string result will be saved to the specified file path, relative to the base 
path. Variables can be included in this string and they will be swapped out.  
Comma separate if multiple templates specified otherwise 1st entry will be used to pad
out list. 
- **outputTagStart**, **outputTagEnd** (string)
When |outputFilePath| is true, the result string will be inserted between
these tags if found in the output file.  
Comma separate if multiple templates specified otherwise 1st entry will be used to pad
out list. 
Escaped hyphens will prevent PS from merging multiple in a row: `\-`.
- **reverseOrder** (boolean)  
Default false. If set to true will reverse the layer comp order. If |boundsComp| is 
specified with {next} or {prev} this will not be affected, only output. 
The output prop |index| will output in ascending order whether reversed or not.

### Base config file ###

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

### Overriding ###

A config var with an important "!" at start will override descendants and also prevent ancestors from
overriding. Eg.
```
!cropToBounds: true
```

Templates
---------

- Defined by **template** var
- Templates reside in ./tpl/ directory.
- Custom templates can be defined in a ./tpl/ dir in the same folder as the PSD.
- Default template is "img".
- Templates can be of any extension.

### Vars ###
- **src**  
The output image source path relative to config settings.
- **width**  
The output image width.
- **height**  
The output image height.
- **base**  
The base filename of the image without extension.
- **alt**  
Alt tag.
- **ext**  
File extension without a preceeding ".".
- **index**  
The layer comp index.
- **x + y**  
The position of the pic relative to the containing doc, useful for for `cropToBounds` 
output. Will be top left by default, unless registration point is defined, in which case 
the reg point will be used instead. The output scale will be applied to this value.
- **regX + regY**  
The reg point relative to the top left of the pic bounds. Eg. If set to top left then will 
be (0,0), if bottom right will be the same as (pic.width, pic.height). The output scale 
will be applied to this value.
- **tlX + tlY**  
The position of the top left of the pic regardless of registration point position. 
Respects |outputOriginLayer|, |scale|
- **regPercX + regPercY**  
The relative reg point as a percentage value of the pic dimensions. Eg. (0,0) is top left,
(1,1) is bottom right.
- **psdBase**  
The base filename of the current PSD doc.
- Any other unreserved vars set anywhere in the config chain.

### Format ###
- %varname%
```
<img src="%src%" width="%width%" >
```

### File parts ###
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

Add psd file/s to the arg to be published 
```bash
$ choppy path/to/mypics.psd
```
Multiples supported:
```bash
$ choppy path/to/mypicsA.psd path/to/mypicsB.psd path/to/mypicsC.psd
```
Wildcards supported:
```bash
$ choppy path/**/mypics*.psd
```
Paths can be relative to pwd or absolute

Utility commands
----------------

*Additional helper commands. Images will not be outputted when these processes run*

**Flatten**  

Add the arg `flatten` and all top-level layers will be converted to smart objects if they 
are directories or have styles applied. Will not save doc so revert to cancel a flatten 
command. 

This is what Choppy does for every layer comp anyway, so flattening first will speed up 
subsequent Choppy exports as it doesn't have to do it over and over again.

All top level layers will be set to visible during this command.

**WARNING** Some layer comp scenarios will be broken by this command. Hidden layers in 
sub-folder flattened hidden.

Layer comps may become broken and need to be re-applied if they referenced a folder or 
layer with styles. 

Usage:
```bash
$ choppy flatten
```

Can also be run with `sel` to only flatten selected layers.
```bash
$ choppy flatten sel
```

**Make comps**

Add the arg `makecomps` and each top-level layer will be added as a new comp. If there 
is an existing layercomp then this will be used as a reference for containing folder and
extension.

Usage:
```bash
$ choppy makecomps
```

You can run a flatten first as well:
```bash
$ choppy makecomps flatten
```

Can also be run with `sel` to only convert selected layer/s and/or using selected layer 
comp as a guide. *Tip: On a mac Cmd-Select layer or layer comp to deselect*.
```bash
$ choppy makecomps sel
```

Note: Flattening and sel - eg. `choppy makecomps sel flattened` is not recommended as the 
flattening process may reset selected state of layers. In this scenario run `flatten` 
first.

**Find and replace**

```bash
$ choppy findandreplace "string find" "replace with this"
```

Will find and replace matching string in layercomp names and comment fields.

### Release History ###

- v1.6.8 - Documentation update
- v1.6.8 - Multi template support,  
           |reverseOrder| {choppy} comp var  
           |tlX| and |tlY| output props added  
           Made '.choppy' config file and |basePath| optional (defaults to "./")  
- v1.6.7 - %base% prop incorporates size file handle
- v1.6.6 - Allow text suffix of {reg} layer
- v1.6.4 - Reg str bugfix
- v1.6.3 - Coord support for |reg| property
- v1.6.2 - |placeholder| export
- v1.6.1 - Select mode bugfix
- v1.5.8 - |findandreplace| utility
- v1.5.7 - Added |outputOriginX|, |outputOriginY| and |outputOriginLayer| props
- v1.5.5 - Added |boundsComp| feature. Bounds caching introduced.
- v1.5.4 - |roundOutputValues| added. Supporting new line '\t' for inline defined templates
- v1.5.3 - Supporting new line '\n' for inline defined templates
- v1.5.2 - Added width and height params to force output dimensions
- v1.5.1 - Added 'makecomps' utility command, ignore backtick prefixed layers and comps
- v1.5.0 - Added 'flatten' utility command
- v1.4.9 - Active doc bugfix
- v1.4.8 - Relative psd path bugfix
- v1.4.5 - Relative psd paths accepted
- v1.4.4 - 'Verbose' arg added, provide PSD paths in command line args. Optimise bugfix.
- v1.4.3 - Fixed transform warning when reporting active psd
- v1.3.4 - Additional var |psdBase|. Enabled var swap out for |outputFilePath| prop. Template
header and footer has props swapped out with core config data.
- v1.3.3 - Fixed dry run with scale bug. Applied scale to reg pt values. Addded 
|outputValueFactor| prop.
- v1.3.2 - Scale is applied to reg pts and x,y position
- v1.3.2 - Reg point bugfix
- v1.3.1 - Reg point support through {reg} layer and |reg| layer property
- v1.3.0 - Multiple size output support
- v1.2.2 - Scale outputting
- v1.2.0 - Major update with support for cropping layers nested in sets and masks.  
Visible bounds calculation bugfix.
- v1.1.3 - Fix crop bounds to within doc
- v1.1.2 - More descriptive error messages
- v1.1.1 - Width result bugfix
- v1.1.0 - Dependency fix
- v1.0.8 - Sel command line arg to output selected comps only, multiple layer bounds bugfix
- v1.0.7 - Image optimisation added (for Mac)
- v1.0.6 - Export gifs with matte and color options
- v1.0.5 - Dry run mode
- v1.0.4 – Injecting into output file tags
- v1.0.3 – Added template fields |x| and |y|
