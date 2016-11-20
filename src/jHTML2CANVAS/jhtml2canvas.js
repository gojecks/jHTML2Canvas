	function browser(){}

	browser.prototype.createVirtualElement = function(doc,name,attr){
		var virtualElement = document.createElement(name);
			virtualElement.style.zIndex ='-10000';
			virtualElement.style.position = "absolute";
			virtualElement.style.top = "-100000";
			virtualElement.style.visibility = "hidden";

		if(attr){
			for(var name in attr){
				virtualElement.style[name] = attr[name];
			}
		}

		doc.appendChild(virtualElement);

		return virtualElement;
	};

	browser.prototype.support = {
		testSVG : function() {
		    var img = new Image();
		    var canvas = document.createElement("canvas");
		    var ctx =  canvas.getContext("2d");
		    img.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>";

		    try {
		        ctx.drawImage(img, 0, 0);
		        canvas.toDataURL();
		    } catch(e) {
		        return false;
		    }
		    return true;
		},
		testCORS : function() {
	    	return typeof((new Image()).crossOrigin) !== "undefined";
		},
		deviceRatio : getDeviceRatio
	};

	/*
		get web page stylesheets
	*/

	browser.prototype.getPageStyleSheets = function(){
		var stylesheets = document.styleSheets,
			_store = [],
			len = stylesheets.length,
			inc = 0;
		
		/*loop through the stylesheet collection*/
		while(len > inc){
			var cur = stylesheets[inc].rules;
			if(cur.length){
				var ruleLength = 0;
				while(cur.length > ruleLength){
					if(!_store.indexOf(cur[ruleLength].cssText) > -1){
						_store.push(cur[ruleLength].cssText);
					}
					ruleLength++;
				}	
			}

			inc++;
		}

		return _store.join('');
	};

	/*getDeviceRatio*/
	function getDeviceRatio(){
		var testElement = new browser().createVirtualElement(document.body,'div',{height: "1in",left: "-100%",width:"1in"}),
			devicePixelRatio = window.devicePixelRatio || 1;

		var ret =  ({
			 	dpi_x :  testElement.offsetWidth * devicePixelRatio,
	  			dpi_y : testElement.offsetHeight * devicePixelRatio
			});

		document.body.removeChild(testElement);

		return ret;
	}




var defaultConfiguration = {
		paperHeight : 1319, //A4 paperHeight
		paperWidth : 1019, //A4 paperWidth
		domUrl :  window.URL || window.webkitURL || window
};


function jHTML2Canvas(pages){
		this.canvasCreated = [];
		this.options = defaultConfiguration;
		this.pages = pages || {};
		this.browser = new browser();
	}

	jHTML2Canvas.prototype.captureScreenToCanvas = function(content,canvas, useParser){
		var ctx = canvas.getContext('2d');
		// Get well-formed markup
		var _svg = new jSVG(content,true),
			height = canvas.clientHeight,
			width = canvas.clientWidth,
			_self = this,
			_img = this.createImage({width:width,height:height},function(){
				ctx.drawImage(this, 0, 0);
				_svg.close();
			});

		return function(success){
		//initialize the success function
			_img.src(_svg.svgBase64Data);
			(success || function(){})();
		};
	};


	jHTML2Canvas.prototype.generateCanvas = function(attr){
		var canvas = document.createElement('canvas');
		for(var name in attr){
			canvas.setAttribute(name,attr[name]);
		}

		return canvas;
	};

	jHTML2Canvas.prototype.captureScreen = function(content){
		var _svg = new jSVG(content,true),
			canvas = this.convertSVG2Canvas(_svg.getDummySVG(),function(){
				_svg.close();
				_svg = null;
			});	

		return ({
			appendTo : function(dropZone){
				if(dropZone){
					canvas.appendTo(dropZone);
				}

				return this;
			},
			getBase64 : function(){
				return canvas.getBase64.apply(canvas.getBase64,arguments);
			}
		});
	};

	jHTML2Canvas.prototype.setPageData = function(pageNo,pageData){
		if(pageData){
			this.pages[pageNo] = pageData;
		}

		return this;
	};

	/*getPages*/
	function getPages(pages){
		var _pages,ret = {};
		if(typeof pages === 'string'){
			_pages = document.querySelectorAll(pages);
		}else if(toString.call(pages) === '[object NodeList]'){
			_pages = pages;
		}else{
			ret = pages;
		}

		if(_pages){
			foreach(_pages,function(item,inc){
				ret[inc] = item;
			});
		}

		return ret;
	}


	jHTML2Canvas.prototype.drawPagesCanvas = function(dropZone,imageType,quality){
		var self = this,
			_base64Data = {},
			dcPromise = new jPromise(),
			_pages = getPages(this.pages),
			_done = 0;
		for(var page in _pages)
		{
			var pageData = _pages[page];
			if(toString.call(pageData) === '[object Array]'){
				pageData = pageData.join('');
			}

			var _screenObject = self.captureScreen(pageData)
				.appendTo(dropZone);
			//get the base64 Object
			_screenObject.getBase64(imageType,quality).done(performDone(page));
		}

		/*done function */
		function performDone(_cPage){
			
			return function(base64){
				_base64Data[_cPage] = base64;
				_done++;
				/*check if page is complete*/
				if(_done === Object.keys(_pages).length){
					dcPromise.resolve(_base64Data);
				}
			}
		}

		return dcPromise;
	};

	//@Function return Promise

	jHTML2Canvas.prototype.drawPagesImage = function(dropZone,imageType,quality){
		var self = this,
			_base64Data = {},
			_pages = getPages(this.pages),
			bPromise = new jPromise(),
			_done = 0;
		for(var page in _pages)
		{
			//Increment the page check
			_done++;
			var pageData = _pages[page];
			if(toString.call(pageData) === '[object Array]'){
				pageData = pageData.join('');
			}

			//append the pageData
			var _image = this.createImage({
				width : self.options.paperWidth,
				height : self.options.paperHeight
			}),
			_svg = new jSVG(pageData,true),
			_serializedSVG = _svg.serializeSVG(_svg.getDummySVG());

			//set the image src
			_image.src(_svg.svgBase64Data);

			//set out base refrence
			_base64Data[page] = _svg.toBase64(imageType,quality);

			//append the data
			if(dropZone){
				dropZone.appendChild(_image.get());
			}

			//remove the dummy SVG
			_svg.close();
			_svg = null;

			//perform check when page is done
			if(_done === Object.keys(_pages).length){
				bPromise.resolve(_base64Data);
			}
		}


		return bPromise;
	};

	//createImage
	jHTML2Canvas.prototype.createImage = function(attr,callback){
		var img = new Image();
		if(attr){
			for(var name in attr){
				img.setAttribute(name,attr[name]);
			}
		}

		if(this.browser.support.testCORS()){
			//check for crossOrigin access
			img.crossOrigin = "Anonymous";
		}
		

		//set the onload function
		img.onload = callback || function(){};

		return ({
			src : function(source){
				img.src = source;

				return this;
			},
			get : function(){
				return img;
			},
			onComplete : function(fn){
				if(img.complete || undefined === img.complete){
					return (fn || function(){})(img);
				}
			}
		});
	};


	/*Helper Function */
	jHTML2Canvas.prototype.helpers = {
		getElementCss : getElementCss,
		writeElementStyle : writeElementStyle,
		extend : extend,
		extractStyle : extractStyle,
		transverseDom : transverseDom,
		is : eleIs,
		promise : jPromise,
		forEach : foreach
	};

	/*jPromise*/

	function jPromise(){
		this.queue = [];
		this._done = [];
		this._fail = [];
	}

	jPromise.prototype = {
		then : function(success,error){
			this._done.push(success);
			this._fail.push(error);
			return this;
		},
		catch : function(err){
			this._fail.push(err);
			return this;
		},
		done : function(success){
			this._done.push(success);
			return this;
		},
		fail : function(err){
			this._fail.push(err);

			return this;
		},
		resolve : function(){
			var len = this._done.length;
			while(len--){
				var fn = this._done.shift();
				fn.apply(fn,arguments);
			}
		},
		reject : function(){
			var len = this._fail.length;
			while(len--){
				var fn = this._fail.shift();
				fn.apply(fn,arguments);
			}
		}
	};

	/*getElementCss*/
	function getElementCss(ele){
	  var sheets = document.styleSheets, o = {},_self = this;
	    for (var i in sheets) {
	        var rules = sheets[i].rules || sheets[i].cssRules;
	        for (var r in rules) {
	            if (eleIs(ele,rules[r].selectorText,ele.parentNode)) {
	                o = extend(o, css2Object(rules[r].style), extractStyle(ele));
	            }
	        }
	    }
	    return o;
	}

	/*forEach*/
	function foreach(nodeList,fn){
		var ret = {},
			len = nodeList.length,
				inc = 0;
			while(len > inc){
				(fn || function(){})(nodeList[inc],inc);
				inc++;
			}
	}

	/*extractAttr*/
	//@return Object
	function extractAttr(ele,req){
		var ret = {};
		if(typeof req !== 'object' || !ele){
			throw new error('extractAttr : requires list of attr to extract');
		}

		req.forEach(function(key){
			ret[key] = ele.getAttribute(key);
		});

		return ret;
	}

	/*css2JSON*/
	function css2Object(css){
		var s = {};
	    if (!css) return s;
	    if (css instanceof CSSStyleDeclaration) {
	    	var len = css.length;
	    	while(len--){
	    		s[(css[len]).toLowerCase()] = css[css[len]];
	    	}
	    } else if (typeof css == "string") {
	        css = css.split("; ");
	        for (var i in css) {
	            var l = css[i].split(": ");
	            s[l[0].toLowerCase()] = (l[1]);
	        }
	    }

	    return s;
	}

	/*extractStyle*/
	function extractStyle(ele){
		var ret = {};
		if(ele.nodeType === document.ELEMENT_NODE){
			var inlineStyle = ele.getAttribute('style');
			if(inlineStyle){
				var splitStyle = inlineStyle.split(';');
				for(var style in splitStyle){
					var _sStyle = splitStyle[style].split(':');
					ret[_sStyle[0]] = _sStyle[1];
				}
			}
		}

		return ret;
	}

	/*extend*/
	function extend(a,b,c){
		if(c){
			return extend(extend(a,b),c);
		}

		for(var prop in b){
			if(!a.hasOwnProperty(prop)){
				a[prop] = b[prop];
			}
		}

		return a;
	}

	/*writeElementStyle*/
	function writeElementStyle(ele,styles){
		if(ele && styles){
			for(var prop in styles){
				ele.style[prop] = styles[prop];
			}
		}
	}

	/*isCheckAble*/
	function isCheckAble(cur){
		return ['radio','checkbox'].indexOf(cur.getAttribute('type')) > -1;
	}

	/*transversDom*/
	function transverseDom(ele,CB){
		var treeWalker = ele.ownerDocument.createTreeWalker(ele, NodeFilter.SHOW_ELEMENT),
			cur = treeWalker.nextNode();
		do{
			/*build and compile the element*/
			if(cur){
				var type = cur.tagName;
				switch(type.toLowerCase()){
					case('img'):
						var cWH = {height:cur.clientHeight,width:cur.clientWidth},
							canvas = jHTML2Canvas.prototype.generateCanvas(cWH),
							ctx = canvas.getContext('2d');
							ctx.drawImage(cur,0,0);

						cur.src = canvas.toDataURL();
					break;
					case('textarea'):
						cur.textContent = cur.value;
					break;
					case('input'):
						if(isCheckAble(cur)){
							if(cur.checked){
								cur.setAttribute('checked','');
							}else{
								cur.removeAttribute('checked');
							}
						}else{
							cur.setAttribute('value',cur.value);
						}
					break;
					default:
						
					break;
				}
				
				(CB || function(){})(cur,getElementCss(cur));
			}
		}while(cur = treeWalker.nextNode())
			
	}

	/*eleIs*/
	function eleIs(ele,query,parent){
		var docSelector = (parent || document).querySelectorAll(query),
			fnd = false;
		foreach(docSelector,function(item){
			if(item === ele){
				fnd = true;
			}
		});

		return fnd;
	}

	/*prepareDomCloning*/
	function prepareDomCloning(content){
		var clonedContent = content.cloneNode(true),
			div = new browser().createVirtualElement(document.body,'div');
			div.appendChild(clonedContent);
		//append to body

		//destroy the clonedContent
		function destroyCloneContent(){
			document.body.removeChild(div);
		};

		return {
			content : clonedContent,
			destroy : destroyCloneContent,
			width : clonedContent.clientWidth,
			height : clonedContent.clientHeight
		};
	}

	jHTML2Canvas.prototype.calculatePaperSize = function(container,idText){
		var totalCanvas = Math.ceil(container.clientHeight / this.paperHeight);

		for(var t=0; t < totalCanvas; t++){
			this.canvasCreated.push(this.generateCanvas(idtext+"_"+t));
		}

		return this;
	};


	/*page Manager*/
	/*Create Multiple Pages using this Method*/
	jHTML2Canvas.prototype.pageManager = pageManager;

	jHTML2Canvas.prototype.convertSVG2Canvas = function(svg,callback){
		if(!svg){
			throw new error('convertSVG2Canvas : Requires SVG element.');
		}

            // Create a blob from the SVG data
            var _svg = new jSVG('').serializeSVG(svg),
            	promise = new jPromise();

            // Get the blob's URL
            var cWH = extractAttr(svg,['width','height']),
            	self = this,
            	canvas = self.generateCanvas(cWH);
            // Load the blob into a temporary image
            this.createImage(cWH,function(){
            	 try {
                        var ctx = canvas.getContext('2d');

                        // Start with white background (optional; transparent otherwise)
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, cWH.width, cWH.height);
                        // Draw SVG image on canvas
                        ctx.drawImage(this, 0, 0);

                        promise.resolve(canvas,this);

                    } finally {
                        _svg.close();
                        //free up the memory
                        _svg = null;

                        //trigger callback
                        if(callback){
                        	callback();
                        }
                    }
            }).src(_svg.svgBase64Data);

            return ({
            	appendTo : function(dropZone){
            		dropZone.appendChild(canvas);
            		return this;
            	},
            	getBase64 : function(){
            		var data = null,
            			bPromise = new jPromise(),
            			args = arguments;

            		promise.done(function(canvas,img){
            			try{
            				data = canvas.toDataURL.apply(canvas,args);
	            		}catch(e){
	            			console.log('toDataURL: Failed to convert canvas to base64 image data');
            			}finally{
            				bPromise[data?'resolve':'reject'](data);
            			}
            		});
            		
            		return bPromise;
            	},
            	getCanvas : function(){
            		return canvas;
            	}
            });
	};



	
	function pageManager(filePath,CB){
		this.pages = {};
		this.builder = new jHTML2Canvas();
		this.styleSheet = [];

		var paper =  'A4',
			dpi_fallback = 96,
			paperMarginConfig = {
					'1' : {
						top : 96,
						left : 72,
						right : 72,
						bottom : 10
					},
					"_" : {
						top : 72,
						left : 72,
						right : 72,
						bottom : 10
					}
			};

		/*set the paper type to use*/
		/* width and height of paper is calculated based on dpi*/
		this.paper = function(paper){
			if(paperHelpers[paper]){
				paper = paper;
			};

			return this;
		};

		/*get the paper size based on DPI*/
		this.getPaperSize  = function(size){
			var dpi = browser.prototype.support.deviceRatio();

			if(paperHelpers[paper][dpi.dpi_x]){
				return paperHelpers[paper][dpi.dpi_x]
			}

			return paperHelpers[paper][(size || dpi_fallback)];
		};

		this.extendPaperAspect = function(type,dpi,obj){
			if(!paperHelpers[type]){
				paperHelpers[type] = {};
			}

			//set the density
			paperHelpers[type][dpi] = obj;

			return this;
		};

		//set dpiFallback
		this.dpiFallback = function(size){
			if(paperHelpers[paper][size]){
				dpi_fallback = size;
			}

			return this;
		};


		/*
			set a paper margin for pages
			config sample
			{
					'1' : {
						top : 96,
						left : 72,
						right : 72,
						bottom : 10
					},
					"_" : {
						top : 72,
						left : 72,
						right : 72,
						bottom : 10
					}
			}
		
		*/
		this.paperMargin = function(config){
			if(typeof config === 'object'){
				paperMarginConfig = extend({},paperMarginConfig,config);
			}

			return this;
		};

		/*
			get the paper Margin defined by user
			else the default paper margin will used
		
		*/

		this.getPaperMargin = function(pageNo){
			if(pageNo){
				return paperMarginConfig[pageNo] || paperMarginConfig['_'];
			}

			return paperMarginConfig;
		};


		//set different paper helpers
		var paperHelpers = {};

		/*paper Aspect for A4*/
		paperHelpers['A4'] = {
			72 : {width : 595 , height : 842},
			96 : {width : 794 , height : 1123},
			150 : {width : 1240 , height : 1754},
			300 : {width : 2480 , height : 3508}
		};

		/*paper Aspect for A5*/
		paperHelpers['A5'] = {
			72 : {width : 420 , height : 595},
			96 : {width : 595, height : 794},
			150 : {width : 874 , height : 1240},
			300 : {width : 1748 , height : 2480}
		};

		/*paper Aspect for A1*/
		paperHelpers['A1'] = {
			72 : {width : 1684 , height : 2384}, //1684 x 2384
			96 : {width : 2245, height : 3179}, //2245 x 3179
			150 : {width : 3508 , height : 4967}, //3508 x 4967
			300 : {width : 7016 , height : 9933} //7016 x 9933
		};

		/*paper Aspect for A2*/
		paperHelpers['A2'] = {
			72 : {width : 1191 , height : 1684}, //1191 x 1684
			96 : {width : 1587, height : 2245}, //1587 x 2245
			150 : {width : 2480 , height : 3508}, //2480 x 3508
			300 : {width : 4960 , height : 7016} //4960 x 7016
		};

		/*paper Aspect for A3*/
		paperHelpers['A3'] = {
			72 : {width : 842 , height : 1191}, //842 x 1191
			96 : {width : 1123, height : 1587}, //1123 x 1587
			150 : {width : 1754 , height : 2480}, //1754 x 2480
			300 : {width : 3508 , height : 4960} //3508 x 4960
		};

		if(filePath){
			this.loadTemplate(filePath,CB);
		}

	}

	/*
		createElement Method
		Accepts JSON OBJ and Returns an Element
		eg : {
			"element" : "p",
			"attr" : {
				"class" : "test"
			},
			"children" : [{}], 
			"text" : "I am a Paragraph"
		}

		@return DOM Element
	*/
	pageManager.prototype.createElement = function(ele,data){
		var element = document.createElement(ele.element);
				data = data || {};
			if(ele.attr){
				for(var prop in ele.attr){
					element.setAttribute(prop,ele.attr[prop]);
				}
			}

		if(ele.text){
			element.innerHTML = templateReplacer(ele.text,data);
		}

		//add eventListener
		if(ele.eventListener){
			for(var event in ele.eventListener){
				element.setAttribute('data-event-'+event,ele.eventListener[event]);
				this.events.afterLoadevents.push('data-event-'+event);
			}
		}

		if(ele.children){
			for(var child in ele.children){
				element.appendChild(pageManager.prototype.createElement(ele.children[child],data));
			}
		}

		return element;
	};

	/*
		eventListener Handler
		Triggers events binded to an element

	*/

	pageManager.prototype.eventHandler = function(eventName){
		return this.events.handlers[eventName] || function(){};
	};


	/*
		event Handlers
	*/
	pageManager.prototype.events = {
		handlers : {},
		afterLoadevents : [],
		bindListeners : bindListeners
	};

	/*
		Bind listeners events
	*/
	function bindListeners(){
		this.afterLoadevents.forEach(function(ev){
			var elements = document.querySelectorAll('['+ev+']');
			if(elements.length){
				var inc = 0;
				while(inc < elements.length){
					var eventFn = elements[inc].getAttribute(ev),
						eventType = ev.split('-')[2];
					elements[inc].addEventListener(eventType,pageManager.prototype.eventHandler(eventFn),false);
					inc++;
				}
			}
		});
	}

	/*
		template Replacer
		replace the template variables provided data

	*/

	function templateReplacer(template,data){
		return template.replace(/\{\{(.*?)\}\}/g,function(key,value){return data[value] || key; })
	}

	/*
		Template Loader
		Load templates using XMLHTTPREQUEST()
		Method Accepts : STRING , CALLBACK Function
	*/

	pageManager.prototype.loadTemplate = function(filePath,CB){
		if(filePath){
			var rawFile = new XMLHttpRequest(),
				self =this;
			    rawFile.open("GET", filePath, false);
			    rawFile.onreadystatechange = function ()
			    {
			        if(rawFile.readyState === 4)
			        {
			            if(rawFile.status === 200 || rawFile.status == 0)
			            {
			                var allText = rawFile.responseText,
			                	template ;
			                try{
			                	template = JSON.parse(allText);
			                }catch(e){
			                	throw new error("Inavlid Json file received");
			                }finally{
			                	if(template){
			                		(CB || function(){})(template);
			                	}
			                }
			            }
			        }
			    }
			 //send the request
			 rawFile.send(null);
		}
	};

	pageManager.prototype.setPage = function(id){
		if(!this.pages[id]){
			this.pages[id] = {
				header : null,
				footer : null,
				body : null
			}
		}

		function pageSetter(page){
			var self = this;
			for(var name in page){
				this['set'+name] = buildFunction(name);
			}

			//Build Functionality for each Page
			function buildFunction(name){
				return function(content,data){
					page[name] = templateReplacer(content,data);
					return self;
				}
			}
		}

		return new pageSetter(this.pages[id]);
	};

	/*addStyle Function*/
	// Make sure to add the styling before building pages

	pageManager.prototype.addStyle = function(cssText){
		if(cssText){
			this.styleSheet.push(cssText);
		}

		return this;
	};

	pageManager.prototype.buildPages = function(dropZone,callback){
		var self = this,
			_packed = [];
		for(var page in this.pages){
			_packed.push( compilePages(page,this.pages[page]) );
		}


		//initilize the packed FN
		var inc = 0;
		_packed.forEach(function(fn){
			inc++;
			fn();
			if(_packed.length === inc && callback){
				callback.apply(callback,[_packed.length]);
			}
		});

		//free memory

		_packed = [];

			//function Parser
		function validateContent(content,pageDimension){
			return (typeof content === 'function')?content.apply(content,[pageDimension]) : content;
		}

		function writeStyle(cssText,wrapper,id){
			var style = document.createElement('style');
				style.textContent = cssText;
				style.setAttribute('id','jPageBuilder_'+id);
				style.setAttribute('type',"text/css");
			wrapper.appendChild(style);
		}

		//Page compiler
		function compilePages(pageNo,page){
			var wrapper = document.createElement('div'),
				content = ''; //create a Wrapper Element

			var paperMargin = self.getPaperMargin(pageNo);

			//write the margin to wrapper
			for(var margin in paperMargin){
				wrapper.style['padding-'+margin] = paperMargin[margin] + 'px';
			}


			wrapper.setAttribute('id','jPageBuilder_'+pageNo);

			//set the width and height of the element
			//this is based on the selected paperSize
			var paperAspect = self.getPaperSize();
			for(var prop in paperAspect){
				wrapper.style[prop] = paperAspect[prop] + "px";
			}

			//loop through the page contents
			var _pageWriter = ["header","body","footer"];
			for(var section in _pageWriter){
				if(page[_pageWriter[section]]){
					content +=	validateContent(page[_pageWriter[section]],paperAspect);
				}
			}

			//add the content to the wrapper
			if(content){
				if(typeof content === "string"){
					wrapper.innerHTML = content;
				}else{
					wrapper.appendChild(content);
				}
			}

			return function(){
				//check is styling is available
				if(self.styleSheet.length){
					self.styleSheet.forEach(function(style,id){
						writeStyle(style,wrapper,id);
					});
				}

				//push the wrapper to pages
				self.builder.setPageData(pageNo,wrapper);

				//dropzone fn
				if(dropZone){
					dropZone.appendChild(wrapper);
				}
			}

		}

		return this;
	};


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