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
- Photoshop (tested for Photoshop CC 2019)

Documentation
-------------

**Basic example**

Eg. Layer comp called  
`img/mypic.png` with comment:
```
alt: A pic I took
cropToBounds: true
```

**Layer comp naming format**

`[-][<relativePath>]<base>[.][<ext>|<type>][(<flag>,<propName>:<propValue>,...)]`

- Layers prefixed with `-` indicate parent/nest level of the layer comp. Multiple levels supported (eg. `--`,`---`). This will inform the `nestLevel` & `parent` property.
- Props can be also be defined in brackets as well as comments. A prop declaration without a `:` will be added to the `flags` list.

**Layer comp comment format**

Configuration variables are set in the layer comp comment in the following format:  
```
[<alt>]
<prop_name_1>: <prop_value_1>
<prop_name_2>: <prop_value_2>
...
```

**<em>Check out the PSD files in /examples/ to see choppy in action.</em>**

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
Eg. `@2x:1,sd:.5` will output 2 files and inject `@2x` and `sd` into the filename before
the extension.  
Optionally put {s} in your file name / path to customize where the file size is placed in the output.  
If size set then any scale props will be overwritten and ignored.
All sizes will be added to the output as if additional layercomps were created for each
size.
- **sizeDef%Name%** (string)  
Optionally define individual sizes or groups of sizes by shorthand name. These can reference
other sizes. Eg:  
```
sizeDefSD: sd:1/2  
sizeDefRETINA: @2x:1,SD   
sizes: RETINA  
```
Although this example uses uppercase the shorthand name is case insensitive.  
Size definitions can be placed in the .choppy config file for use across multiple files.
- **reg** (string)  
Override the reg point for the image. Default is top left. Input values are 2 characters:
the first represents vertical space, the second horizontal. Eg. `TL` = top left,
`BR` = bottom right, `C` = centered both dimensions, `CR` = centered vert + right aligned,
`TC` = top aligned + centered horizontally. Alternatively enter coords relative to
document origin - eg `100,33`.
- **outputValueFactor** (float)  
Default 1. All values sent to output templates will be multiplied by this factor. It
doesn't affect the size of images exported, just the values written for |x|, |y|, |regX|,
|regY|, |width| and |height| in the template output.
- **roundOutputValues** (boolean)  
Default false. All values sent to output templates will be rounded to integer values. It
doesn't affect the size of images exported, just the values written for |x|, |y|, |regX|,
|regY|, |width| and |height| in the template output.
- **outputOriginX** and **outputOriginX** (integer)  
Default 0. Sets the virtual origin point of the document to output. These values will be
removed from the |x| and |y| properties supplied to the output template. Will not affect
images exported, just the |x| and |y| values displayed.
- **outputOriginLayer** (string) Layer name    
Default null. Optionally provide a layer name whose top left bounds will be set to the
|outputOriginX| and |outputOriginY|. It's assumed the layer name is unique to the document
and on the top level.
- **placeholder**  (boolean)  
Default false. If set to true will not output an image though all other processing will
occur.
- **nestlevel** (int)    
Default 0. The nest level of the layer comp. Can be set by prefixing layer comp name with `-`,`--` etc. 
- **parent** (string)  
Default ''. The `base` name of the layer comp's parent. Will be auto filled if **nestLevel** is set. This does not affect image publish. If set the `x` and `y` coords will be relative to the parent's origin point.
- **type** (string)  
Default ''. General property that allows extended functionality. Can optionally be set like an extension in the layer comp name. Eg. `basename.<type>`. Built in types include:
  - `div` If applied will set `placholder` property to `true`.
  - `tf` If applied will set `placholder` property to `true` and output `tfParams` (below).
  - `btn` An alias for `tf`
- **tfParams** (Object)  
Default ''. If `type` is set to `tf`, the style properties of the first visible text field will be set to this field encoded to a JSON string. 
  - `align` The horizontal alignment of the text field (`left`|`center`|`right`)
  - `text` The text content of the field
  - `font` The PostScript font name, including the font and style. Eg. `Arial-BoldMT`
  - `alpha` The opacity of the layer
  - `color` The hex representation of the text color (Eg. `#FF3300`)
  - `fontStyle` The font style of the text field (Eg. `Regular`,`Bold`,`Italic` etc.)
  - `fontName` The font name, without style. (Eg. `Arial`)
  - `fontSize` The font size, in pts. This value will take into account the `outputValueFactor`.
  - `visBoundsTLX`,`visBoundsTLY`,`visBoundsW`,`visBoundsH` The visible bounds of the text field, position is relative to the layer.
- **prefix** (string)
Will be added to start of layer comp names at start of string. Default ''.
- **suffix** (string)
Will be added to end of layer comp names at start of string. Default ''.
- **flags** (string)    
Default ''. A comma separated string list. General property that allows extended functionality. Can optionally be set in the layer comp name within brackets. Eg. `basename.png(flag1,flag2 etc)`. 
- **makeDir** (boolean)  
If set to true will attempt to create the export directory if it doesn't exist. Only the last directory in path will be made.

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
specified with `{next}` or `{prev}` this will not be affected, only output.
The output prop |index| will output in ascending order whether reversed or not.
- **wipeRelativePath** (boolean)  
If set to a relative path, all images at this location will be deleted before running the output. Also accepts a comma separated list.
- **pre**, **post** (string)
Optionally set a comma separated list of JSX command names (see `JSX Processing Scripts` below). 

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
- Templates reside in `./tpl/` directory.
- Custom templates can be defined in a `./tpl/` dir in the same folder as the PSD.
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
- Any other unreserved vars set anywhere in the config chain.

### Constant Vars ###
- **psdBase**  
The base filename of the current PSD doc.
- **psdWidth**, **psdHeight**
The width of the PSD (in pixels)
- **pubtime** (string)  
The publish date and time, eg. `2018-8-3 11:12:40`

### Format ###
- %varname%
```
<img src="%src%" width="%width%" >
```

### File parts ###
- `mytemplate.txt`  
Required. The main template, used for each image outputted, where mytemplate is the
name of the template.
- `mytemplate.header.txt`
Optional. Will be added to the top of the output text. Suitable for instructions, global
styles etc. Does not swap out variables.
- `mytemplate.footer.txt`     
Optional. Will be added to the bottom of the output text. Does not swap out variables.
- `mytemplate.inter.txt`  
Optional. Will be added between items. Does not swap out variables.
- `mytemplate.parse.jsx`  
Optional. Declare a function called `parse` in a stand alone JSX script file to handle all variables injected into the template. The function takes 2 arguments `propName` and `propVal`. Eg:
```js 
// mytemplate.parse.jsx
function parse(propName, propVal){
  if (typeof propVal === 'string'){
    return propVal.toUpperCase();
  }
  return propVal;
}
```

Command line
------------

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

Command line environment variables:
```bash
$ choppy varA="foo" varB="bar"
```

These will be saved to the `envVars` object that is accessible to jsx scripts.


### JSX Processing Scripts

Choppy can be extended with custom `.jsx` scripts. 
- Put scripts in `./jsx/` directory (next to `.psd`) in the following subfolders:
  - `pre/`
  - `post/`
  - `standalone/`
- Queue scripts to run by defining `pre`, `post` properties in either `.choppy` config file or `{choppy}` config layer. These are defined in run order as comma separated string, without `.jsx` extension. Eg. `pre: script1,script2,script3`

#### `pre` hook scripts

*Will run:*
- **after** working copy PSD duplication
- **after** loading the `{choppy}` layer comp data
- **after** deleting `{choppy}` layer comp and comment layer comps
- **after** comps are cleaned up: white-space removed, duplicate comment props removed, empty comment lines removed
- **after** comp names have resolved to be the same as the comp `base`
- **before** processing other layer comps

*Available vars:*
- `app.activeDocument` the current PSD (a working duplicate version)
- `halt` for debugging, set to `true` abort processing immediately after script run

*Available functions:*
- `console.log(...)` Will output to the current terminal running Choppy  
- `trim(str)`,`trimStart(str)`,`trimEnd(str)` string trimming functions
- `setCommentProp(layerComp, propName, propVal)` will edit supplied **layerComp.comment** with property declaration, will overwrite prop if it already exists.
- `getCommentProp(layerComp, propName)` will return prop defined in **layerComp.comment**, will return null if not set.
- `deleteCommentProp(layerComp. propName)` will remove prop from **layerComp.comment**, if found.

*Built in scripts:*
- `layers-to-comps`   
If added to the `pre` queue will try to convert each top-level layer to a layercomp. Top level `{reg}` layers will be included with layer below.


#### `post` hook scripts

*Will run:*
- **after** completing export of images, closing duplicate working PSD and exporting templates.

*Available vars:*
- `app.activeDocument` the current (original) PSD
- `exportDirs` an **array** of **string** paths to each directory that images were saved to during publishing.

*Available functions:*
- `console.log(...)` Will output to the current terminal running Choppy.

#### `standalone` scripts

Can be called from command line using:  
```bash
$ choppy %standalone_script_name_1% [%standalone_script_name_2%]
```
- Global `standalone` scripts can be called without a PSD open, though a PSD needs to be open to use local `jsx/standalone` scripts. 
- Choppy will exit immediately after calling once, the publish will not occur.

*Available vars/functions:*
- None


### Release History ###

[CHANGELOG.md](CHANGELOG.md)
