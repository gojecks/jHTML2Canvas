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

	function http(options){
		var promise = new jPromise();

		if(typeof options ==="object"){
			var rawFile = new XMLHttpRequest(),
				data,
				self = this;
			    rawFile.open(options.method, options.url, options.async || true);

			    rawFile.onreadystatechange = function ()
			    {
			        if(rawFile.readyState === 4)
			        {
			            if(rawFile.status === 200 || rawFile.status == 0)
			            {
			            	var contentType = rawFile.getResponseHeader('content-type');
			            	if (/json/.test(options.dataType || contentType))
					        {
					          data = JSON.parse(rawFile.responseText);
					        } else if (/xml/.test(options.dataType || contentType)) 
					        {
					          data = parseXML(rawFile.responseText);
					        } else
					        {
					            data = rawFile.responseText;
					        }

					        // trigger success
					        promise.resolve(data);
			            }else{

			            	// trigger error
			            	promise.reject();
			            }
			        }
			    }

			  switch(options.method.toLowerCase()){
			  	case('post'):
			  		if(options.data && typeof options.data === "object"){
			  			options.data = JSON.stringify(options.data);
			  		}
			  	break;
			  }
			 //send the request
			 rawFile.send(options.data);
		}

		return promise;
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
		forEach : foreach,
		http: http,
		noop: function(){}
	};

	/*jPromise*/

	function jPromise(){
		this.queue = [];
		this._done = [];
		this._fail = [];
		this.$$state = {
			pending: true,
			value:null,
			resolved:null
		};
	}

	jPromise.prototype = {
		then : function(success,error){
			this._done.push(success);
			this._fail.push(error);
			// check if resolved
			if(!this.$$state.pending){
				this[this.$$state.resolved].call(this,this.$$state.value);
			}

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

			this.$$state.pending = false;
			this.$$state.resolved = 'resolve';
			this.$$state.value = arguments;
		},
		reject : function(){
			var len = this._fail.length;
			while(len--){
				var fn = this._fail.shift();
				fn.apply(fn,arguments);
			}

			this.$$state.pending = false;
			this.$$state.resolved = 'reject';
			this.$$state.value = arguments;
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

	/*
		Draw on canvas
	*/
	jHTML2Canvas.prototype.drawing = canvasDrawing;

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
