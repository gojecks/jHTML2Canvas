/*
	jPDF Plugin
*/

function jPDF(options){
	return new publicApis(new privatePDFApis(extend({},defaultOptions,options || {})));
}

function publicApis(privateApis){
//Add a new Page
	this.addPage = function(){
		privateApis._addPage();
		return this;
	};

	//Add Text
	this.addText = function(x, y, text, f){
      if(f) {
        this.setFont(f);
      }
      
      // need either page height or page font
      if(pageFontSize !== fontSize || pageFont !== font) {
        pageFontSize = fontSize;
        pageFont = font;
      }
      
      var str = privateApis.sprintf('BT %.2f %.2f Td (%s) Tj ET', x * k, (pageHeight - y) * k, privateApis.pdfEscape(text));   
      privateApis.out('BT ' + (fonts[font] ? fonts[font] : '/F0') + ' ' + parseInt(fontSize, 10) + '.00 Tf ET');
      privateApis.out(str);

      return this;
	};

	/* draw a line */
	this.drawRect = function(x, y, w, h, style){
      var op = 'S';
      if (style === 'F') {
        op = 'f';
      } else if (style === 'FD' || style === 'DF') {
        op = 'B';
      }
      privateApis.out(privateApis.sprintf('%.2f %.2f %.2f %.2f re %s', x * k, (pageHeight - y) * k, w * k, -h * k, op));

      return this;
    };

    this.drawLine = function(){
    	privateApis.drawLine.apply(privateApis,arguments);
    	return this;
    };

    //PrintOut the Output
    this.output = function(type, options) {
      privateApis.endDocument();
	      if(type == undefined) {
	        return content_length;
	      }
	      if(type == 'datauri') {
	        return 'data:application/pdf;filename='+options.fileName+';base64,' + btoa(content_length);
	      }
    };

    this.setFontSize = function(size) {
      fontSize = size;
    };

    this.setFont = function(f){
      if( !(f in fonts) ) {
        // if not known font yet, add in fonts array, then used in endDocument
        // while putting ressource
        fonts[f] = '/F' + (fontIndex++);
      }

      font = f;
    };

    /*set page Properties*/
    this.setPageProperties =  function(properties) {
      documentProperties = properties;
    };
};




