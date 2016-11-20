function jSVG(data,createDummy){
		this.options = defaultConfiguration;
		this.svgData = 	this.getSvgContent(data);
		this.svg = new Blob([this.svgData], {type: "image/svg+xml;charset=utf-8"});
		if(createDummy){
			this.createDummySvg(this.svgData);
		}

		this.blobURL = this.options.domUrl.createObjectURL(this.svg);
		//hack for tainted Image
		this.svgBase64Data = this.toBase64();
	}

	//set the prototype
	jSVG.prototype.getBlobURL = function(){
		return this.blobURL;
	};

	jSVG.prototype.revokeBlobURL = function(){
		this.options.domUrl.revokeObjectURL(this.blobUrl);
	};

	jSVG.prototype.createDummySvg = function(content){
		if(content){
			var dummy = new browser().createVirtualElement(document.body,'div');
				dummy.innerHTML = content;

			//register destroyDummySVG
			this.destroyDummySVG = function(){
				document.body.removeChild(dummy);
			};

			this.getDummySVG = function(){
				return dummy.querySelector('svg');
			};
		}

		return this;
	};

	jSVG.prototype.serializeSVG = function(svg){
		this.svgData = (new XMLSerializer).serializeToString(svg),
		this.svg = new Blob([this.svgData], {type: "image/svg+xml;charset=utf-8"});
		this.blobURL = this.options.domUrl.createObjectURL(this.svg);
		this.svgBase64Data = this.toBase64();

		return this;
	};

	jSVG.prototype.getSvgContent = function(content){
		var svgWidth = this.options.paperWidth, 
			svgHeight = this.options.paperHeight,
			doc = document.createElement('div');

		if(typeof content !== "string"){
			/*build the content before writing*/
			var _cloneContent = prepareDomCloning(content);

			transverseDom(_cloneContent.content,function(ele,css){
				writeElementStyle(ele,css);
			});

			//get the content innerHTML only when the content is
			//document.body
			if(document.body === content){
				content = _cloneContent.content.innerHTML;
			}else{
				content = _cloneContent.content.outerHTML;
			}


			//destroy the content
			_cloneContent.destroy();

			//set the svgWidth and svgHeight based on the content
			svgWidth = _cloneContent.width; 
			svgHeight = _cloneContent.height;
		}

			doc.innerHTML = content;
			// You must manually set the xmlns if you intend to immediately serialize 
			// the HTML document to a string as opposed to appending it to a 
			// <foreignObject> in the DOM
			content = (new XMLSerializer).serializeToString(doc);

		//set the content
		return '<svg xmlns="http://www.w3.org/2000/svg" width="'+svgWidth+'" height="'+svgHeight+'"><foreignObject width="100%" height="100%">' +content+'</foreignObject></svg>';

	};

	jSVG.prototype.toBase64 = function(){
		var src = 'data:image/svg+xml;base64,';
			src += btoa(unescape(encodeURIComponent(this.svgData)));

		return src;
	};

	//destroy the svg Object that was created
	jSVG.prototype.close = function(){
		this.revokeBlobURL(this.blobURL);
		if(this.destroyDummySVG){
			this.destroyDummySVG();
		}

		this.svgData = null;
		this.svgBase64Data = null;
	};