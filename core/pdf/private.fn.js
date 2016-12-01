 /*
    Utils 
  */

function setUpPageUnit(){
  switch (unit) {
    case 'pt':
      k = 1;
      break;
    case 'mm':
      k = 72 / 25.4000508;
      break;
    case 'cm':
      k = 72 / 2.54000508;
      break;
    case 'in':
      k = 72;
      break;
    case 'px':
      k = 96 / 72;
      break;
    case 'pc':
      k = 12;
      break;
    case 'em':
      k = 12;
      break;
    case 'ex':
      k = 6;
      break;
    default:
      throw ('Invalid unit: ' + unit);
    break;
  }
}

function addToFontDictionary(fontKey, fontName, fontStyle) {
    // this is mapping structure for quick font key lookup.
    // returns the KEY of the font (ex: "F1") for a given
    // pair of font name and type (ex: "Arial". "Italic")
    if (!fontmap.hasOwnProperty(fontName)) {
      fontmap[fontName] = {};
    }
    fontmap[fontName][fontStyle] = fontKey;
}

function addFont(PostScriptName, fontName, fontStyle, encoding) {
    var fontKey = 'F' + (Object.keys(fonts).length + 1).toString(10),
      // This is FontObject
      font = fonts[fontKey] = {
        'id': fontKey,
        'PostScriptName': PostScriptName,
        'fontName': fontName,
        'fontStyle': fontStyle,
        'encoding': encoding,
        'metadata': {}
      };

    addToFontDictionary(fontKey, fontName, fontStyle);

    return fontKey;
}

function addFonts() {

        var HELVETICA = "helvetica",
          TIMES = "times",
          COURIER = "courier",
          NORMAL = "normal",
          BOLD = "bold",
          ITALIC = "italic",
          BOLD_ITALIC = "bolditalic",
          encoding = 'StandardEncoding',
          standardFonts = [
            ['Helvetica', HELVETICA, NORMAL],
            ['Helvetica-Bold', HELVETICA, BOLD],
            ['Helvetica-Oblique', HELVETICA, ITALIC],
            ['Helvetica-BoldOblique', HELVETICA, BOLD_ITALIC],
            ['Courier', COURIER, NORMAL],
            ['Courier-Bold', COURIER, BOLD],
            ['Courier-Oblique', COURIER, ITALIC],
            ['Courier-BoldOblique', COURIER, BOLD_ITALIC],
            ['Times-Roman', TIMES, NORMAL],
            ['Times-Bold', TIMES, BOLD],
            ['Times-Italic', TIMES, ITALIC],
            ['Times-BoldItalic', TIMES, BOLD_ITALIC]
          ];

        for (var i = 0, l = standardFonts.length; i < l; i++) {
          var fontKey = addFont(
            standardFonts[i][0],
            standardFonts[i][1],
            standardFonts[i][2],
            encoding);

          // adding aliases for standard fonts, this time matching the capitalization
          var parts = standardFonts[i][0].split('-');
          addToFontDictionary(fontKey, parts[0], parts[1] || '');
        }
}

function privatePDFApis(options){
  setUpPageUnit();
  addFonts();
  orientation = ('' + (options.orientation || 'P')).toLowerCase();
  unit = options.unit || 'mm';
  format = options.format || 'a4';

  this._addPage(format,orientation);
} 

privatePDFApis.prototype.f2 = function(number) {
    return number.toFixed(2); // Ie, %.2f
};

privatePDFApis.prototype.f3 = function(number) {
    return number.toFixed(3); // Ie, %.3f
};

privatePDFApis.prototype.padd2 = function(number) {
    return ('0' + parseInt(number)).slice(-2);
};


privatePDFApis.prototype.newObject = function() {
    // Begin a new object
    objectNumber++;
    offsets[objectNumber] = content_length;
    this.out(objectNumber + ' 0 obj');
    return objectNumber;
};

privatePDFApis.prototype.newAdditionalObject = function() {
    var objId = pages.length * 2 + 1;
    objId += additionalObjects.length;
    var obj = {
      objId: objId,
      content: ''
    };
    additionalObjects.push(obj);
    return obj;
};

privatePDFApis.prototype.newObjectDeferred = function() {
    objectNumber++;
    offsets[objectNumber] = function() {
      return content_length;
    };
    return objectNumber;
};

privatePDFApis.prototype.newObjectDeferredBegin = function(oid) {
    offsets[oid] = content_length;
};

privatePDFApis.prototype.putPages = function() {
    
    // TODO: Fix, hardcoded to a4 portrait
    var wPt = pageWidth * k;
    var hPt = pageHeight * k;

    for(n=1; n <= page; n++) {
      this.newObject();
      this.out('<</Type /Page');
      this.out('/Parent 1 0 R'); 
      this.out('/Resources 2 0 R');
      this.out('/Contents ' + (objectNumber + 1) + ' 0 R>>');
      this.out('endobj');
      
      //Page content
      p = pages[n];
      this.newObject();
      this.out('<</Length ' + p.length  + '>>');
      this.putStream(p);
      this.out('endobj');          
    }

    offsets[1] = content_length.length;
    this.out('1 0 obj');
    this.out('<</Type /Pages');
    var kids='/Kids [';
    for (i = 0; i < page; i++) {
      kids += (3 + 2 * i) + ' 0 R ';
    }
    this.out(kids + ']');
    this.out('/Count ' + page);
    this.out(this.sprintf('/MediaBox [0 0 %.2f %.2f]', wPt, hPt));
    this.out('>>');
    this.out('endobj');    
  };

privatePDFApis.prototype.putStream = function(str) {
  this.out('stream');
  this.out(str);
  this.out('endstream');
};


privatePDFApis.prototype.putHeader = function() {
  this.out('%PDF-' + pdfVersion);
};

privatePDFApis.prototype.putResources = function() {
    var f;
    // Deal with fonts, defined in fonts by user (using setFont).
    if(fontIndex) {
      for( f in fonts ) {
        this.putFonts(f);
      }
    } else {
      // if fontIndex still 0, means that setFont was not used, fallback to default
      fonts[font] = 0;
      this.putFonts(font);            
    }

    
    this.putImages();
    
    //Resource dictionary
    offsets[2] = content_length.length;
    this.out('2 0 obj');
    this.out('<<');
    this.putResourceDictionary();
    this.out('>>');
    this.out('endobj');
  };
  
 privatePDFApis.prototype.putFonts = function(font) {
    this.newObject();
    fontsNumber[font] = objectNumber;
    
    this.out('<</Type /Font');
    this.out('/BaseFont /' + font);
    this.out('/Subtype /Type1');
    this.out('/Encoding /WinAnsiEncoding');
    this.out('>>');
    this.out('endobj');
  };

  privatePDFApis.prototype.putImages = function(){

  };

 privatePDFApis.prototype.drawLine = function(x1, y1, x2, y2, weight, style) {
    if (typeof weight === "undefined" || weight < 0) {
      weight = 1;
    }
    
    if (typeof style === "undefined") {
      style = '[] 0 d';
    } else {
      if (style === 'dotted') {
        style = '[1 2] 1 d';
      } else if (style === 'dashed') {
        style = '[4 2] 2 d';
      } else {
        style = '[] 0 d';
      }
    }
    
    var str = this.sprintf('\n/LEP BMC \nq\n0 G\n%.2f w\n%s\n0 J\n1 0 0 1 0 0 cm\n%.2f %.2f m\n%.2f %.2f l\nS\nQ\nEMC\n', weight, style, k*x1, k*(pageHeight-y1), k*x2, k*(pageHeight-y2));
    this.out(str);

    return this;
 };


  privatePDFApis.prototype.putResourceDictionary = function () {
    var i = 0, index, fx;
    
    this.out('/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
    this.out('/Font <<');
    
    // Do this for each font, the '1' bit is the index of the font
    // fontNumber is currently the object number related to 'putFonts'
    console.log(fontsNumber,fonts);
    for( index in fontsNumber ) {
      this.out(fonts[index] + ' ' + fontsNumber[index] + ' 0 R');
    }
    
    this.out('>>');
    this.out('/XObject <<');
    this.putXobjectDict();
    this.out('>>');
  }
  
  privatePDFApis.prototype.putXobjectDict = function() {
    // TODO
    // Loop through images
  }

  //arrayPadd2'
  privatePDFApis.prototype.arrayPadd2 = function(list){
    if(typeof list !== 'object'){
      return "";
    }

    return list.filter(function(padd){
      return privatePDFApis.prototype.padd2(padd);
    }).join('');
  }
  
  
  privatePDFApis.prototype.putInfo = function() {
    this.out('/Producer (jPDF.js ' + pdfVersion + ')');
    if(documentProperties.title != undefined) {
      this.out('/Title (' + this.pdfEscape(documentProperties.title) + ')');
    }
    if(documentProperties.subject != undefined) {
      this.out('/Subject (' + this.pdfEscape(documentProperties.subject) + ')');
    }
    if(documentProperties.author != undefined) {
      this.out('/Author (' + this.pdfEscape(documentProperties.author) + ')');
    }
    if(documentProperties.keywords != undefined) {
      this.out('/Keywords (' + this.pdfEscape(documentProperties.keywords) + ')');
    }
    if(documentProperties.creator != undefined) {
      this.out('/Creator (' + this.pdfEscape(documentProperties.creator) + ')');
    }   
    var created = new Date(),
        outPutCreatedDate = this.arrayPadd2([created.getFullYear(),
          (created.getMonth() + 1),
          created.getDate(),
          created.getHours(),
          created.getMinutes(),
          created.getSeconds()])

    this.out('/CreationDate (D:' + outPutCreatedDate + ')');
  };


  
  privatePDFApis.prototype.putCatalog = function () {
    this.out('/Type /Catalog');
    this.out('/Pages 1 0 R');
    if (!zoomMode){
      zoomMode = 'fullwidth';
    }

    switch (zoomMode) {
      case 'fullwidth':
        this.out('/OpenAction [3 0 R /FitH null]');
        break;
      case 'fullheight':
        this.out('/OpenAction [3 0 R /FitV null]');
        break;
      case 'fullpage':
        this.out('/OpenAction [3 0 R /Fit]');
        break;
      case 'original':
        this.out('/OpenAction [3 0 R /XYZ null null 1]');
        break;
      default:
        var pcn = '' + zoomMode;
        if (pcn.substr(pcn.length - 1) === '%')
          zoomMode = parseInt(zoomMode) / 100;
        if (typeof zoomMode === 'number') {
          this.out('/OpenAction [3 0 R /XYZ null null ' + this.f2(zoomMode) + ']');
        }
    }
        if (!layoutMode){
           layoutMode = 'continuous';
        }

        switch (layoutMode.toLowerCase()) {
          case 'continuous':
            this.out('/PageLayout /OneColumn');
            break;
          case 'single':
            this.out('/PageLayout /SinglePage');
            break;
          case 'two':
          case 'twoleft':
            this.out('/PageLayout /TwoColumnLeft');
            break;
          case 'tworight':
            this.out('/PageLayout /TwoColumnRight');
            break;
        }

        if (pageMode) {
          /**
           * A name object specifying how the document should be displayed when opened:
           * UseNone      : Neither document outline nor thumbnail images visible -- DEFAULT
           * UseOutlines  : Document outline visible
           * UseThumbs    : Thumbnail images visible
           * FullScreen   : Full-screen mode, with no menu bar, window controls, or any other window visible
           */
          this.out('/PageMode /' + pageMode);
        }
  }; 
  
  privatePDFApis.prototype.putTrailer = function() {
    this.out('/Size ' + (objectNumber + 1));
    this.out('/Root ' + objectNumber + ' 0 R');
    this.out('/Info ' + (objectNumber - 1) + ' 0 R');
  }; 
  
  privatePDFApis.prototype.endDocument = function() {
    onPageBegin = false;
    this.putHeader();
    this.putPages();
    
    this.putResources();
    //Info
    this.newObject();
    this.out('<<');
    this.putInfo();
    this.out('>>');
    this.out('endobj');
    
    //Catalog
    this.newObject();
    this.out('<<');
    this.putCatalog();
    this.out('>>');
    this.out('endobj');
    
    //Cross-ref
    var o = content_length.length;
    this.out('xref');
    this.out('0 ' + (objectNumber + 1));
    this.out('0000000000 65535 f ');
    for (var i=1; i <= objectNumber; i++) {
      this.out(this.sprintf('%010d 00000 n ', offsets[i]));
    }
    //Trailer
    this.out('trailer');
    this.out('<<');
    this.putTrailer();
    this.out('>>');
    this.out('startxref');
    this.out(o);
    this.out('%%EOF');
    onPageBegin = false;    
  };
  
  privatePDFApis.prototype.beginPage = function(width , height) {
    // Dimensions are stored as user units and converted to points on output
        var orientation = typeof height === 'string' && height.toLowerCase();
        if (typeof width === 'string') {
          var format = width.toLowerCase();
          if (pageFormats.hasOwnProperty(format)) {
            width = pageFormats[format][0] / k;
            height = pageFormats[format][1] / k;
          }
        }

        if (Array.isArray(width)) {
          height = width[1];
          width = width[0];
        }

        if (orientation) {
          switch (orientation.substr(0, 1)) {
            case 'l':
              if (height > width) orientation = 's';
              break;
            case 'p':
              if (width > height) orientation = 's';
              break;
          }

          if (orientation === 's') {
            tmp = width;
            width = height;
            height = tmp;
          }
        }

        //start the page
        onPageBegin = true;
        pages[++page] = [];
        _pagedim[page] = {
          width: Number(width) || pageWidth,
          height: Number(height) || pageHeight
        };
        _pagesContext[page] = {};
        pages[page] = '';
        pageHeight = _pagedim[page].height;
        pageWidth = _pagedim[page].width;
  };
  
  privatePDFApis.prototype.out = function(string) {
    if(onPageBegin) {
      pages[page] += string + '\n';
    } else {
      content_length += string + '\n';
    }
  };
  
  privatePDFApis.prototype._addPage = function() {
    this.beginPage.apply(this,arguments);
    // Set line width
    this.out(this.sprintf('%.2f w', (lineWidth * k)));
    
    // 16 is the font size
    pageFontSize = fontSize;
    pageFont = font;
    this.out('BT ' + fonts[font] + ' ' + parseInt(fontSize) + '.00 Tf ET');    
  };
  
  // Escape text
  privatePDFApis.prototype.pdfEscape = function(text) {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  };

   privatePDFApis.prototype.sprintf = function(){
        // Return a formatted string  
    // 
    // version: 903.3016
    // discuss at: http://phpjs.org/functions/sprintf
    // +   original by: Ash Searle (http://hexmen.com/blog/)
    // + namespaced by: Michael White (http://getsprink.com)
    // +    tweaked by: Jack
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Paulo Ricardo F. Santos
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brettz9.blogspot.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: sprintf("%01.2f", 123.1);
    // *     returns 1: 123.10
    // *     example 2: sprintf("[%10s]", 'monkey');
    // *     returns 2: '[    monkey]'
    // *     example 3: sprintf("[%'#10s]", 'monkey');
    // *     returns 3: '[####monkey]'
    var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegEG])/g;
    var a = arguments, i = 0, format = a[i++];

    // pad()
    var pad = function(str, len, chr, leftJustify) {
        if (!chr) chr = ' ';
        var padding = (str.length >= len) ? '' : Array(1 + len - str.length >>> 0).join(chr);
        return leftJustify ? str + padding : padding + str;
    };

    // justify()
    var justify = function(value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
        var diff = minWidth - value.length;
        if (diff > 0) {
            if (leftJustify || !zeroPad) {
                value = pad(value, minWidth, customPadChar, leftJustify);
            } else {
                value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
            }
        }
        return value;
    };

    // formatBaseX()
    var formatBaseX = function(value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
        // Note: casts negative numbers to positive ones
        var number = value >>> 0;
        prefix = prefix && number && {'2': '0b', '8': '0', '16': '0x'}[base] || '';
        value = prefix + pad(number.toString(base), precision || 0, '0', false);
        return justify(value, prefix, leftJustify, minWidth, zeroPad);
    };

    // formatString()
    var formatString = function(value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
        if (precision != null) {
            value = value.slice(0, precision);
        }
        return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
    };

    // doFormat()
    var doFormat = function(substring, valueIndex, flags, minWidth, _, precision, type) {
        var number;
        var prefix;
        var method;
        var textTransform;
        var value;

        if (substring == '%%') return '%';

        // parse flags
        var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false, customPadChar = ' ';
        var flagsl = flags.length;
        for (var j = 0; flags && j < flagsl; j++) switch (flags.charAt(j)) {
            case ' ': positivePrefix = ' '; break;
            case '+': positivePrefix = '+'; break;
            case '-': leftJustify = true; break;
            case "'": customPadChar = flags.charAt(j+1); break;
            case '0': zeroPad = true; break;
            case '#': prefixBaseX = true; break;
        }

        // parameters may be null, undefined, empty-string or real valued
        // we want to ignore null, undefined and empty-string values
        if (!minWidth) {
            minWidth = 0;
        } else if (minWidth == '*') {
            minWidth = +a[i++];
        } else if (minWidth.charAt(0) == '*') {
            minWidth = +a[minWidth.slice(1, -1)];
        } else {
            minWidth = +minWidth;
        }

        // Note: undocumented perl feature:
        if (minWidth < 0) {
            minWidth = -minWidth;
            leftJustify = true;
        }

        if (!isFinite(minWidth)) {
            throw new Error('sprintf: (minimum-)width must be finite');
        }

        if (!precision) {
            precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0 : void(0);
        } else if (precision == '*') {
            precision = +a[i++];
        } else if (precision.charAt(0) == '*') {
            precision = +a[precision.slice(1, -1)];
        } else {
            precision = +precision;
        }

        // grab value using valueIndex if required?
        value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

        switch (type) {
            case 's': return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
            case 'c': return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
            case 'b': return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'o': return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'x': return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'X': return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
            case 'u': return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
            case 'i':
            case 'd': {
                number = parseInt(+value);
                prefix = number < 0 ? '-' : positivePrefix;
                value = prefix + pad(String(Math.abs(number)), precision, '0', false);
                return justify(value, prefix, leftJustify, minWidth, zeroPad);
            }
            case 'e':
            case 'E':
            case 'f':
            case 'F':
            case 'g':
            case 'G': {
                number = +value;
                prefix = number < 0 ? '-' : positivePrefix;
                method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                value = prefix + Math.abs(number)[method](precision);
                return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
            }
            default: return substring;
        }
    };

    return format.replace(regex, doFormat);
  };