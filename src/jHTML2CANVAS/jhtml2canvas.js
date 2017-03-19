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



    function canvasDrawing(options,dropZone){
        var defaultOptions = {
            width: 500,
            height: 500,
            id: '_canvas_'+ +new Date
        },
        _options = this.helpers.extend({}, (options || {}), defaultOptions);

        var ret = new publicApi();
            ret.options = _options;

        ret.canvas = this.generateCanvas(_options);
        ret.ctx = ret.canvas.getContext("2d");

        if(dropZone){
            dropZone.appendChild(ret.canvas);
        }

        return ret;
    }

    function publicApi(){
        this.colors = ["black","green","blue","red","orange","white","gray","purple"];
        this.size = [2,4,6,8,10,12,14,16,18,20];
        this.stack = [];
        this._events = {};
    };

    publicApi.prototype.addColor = function(color){
        if(!this.colors.indexOf(color) > -1){
            this.colors.push(color);
        }

        return this;
    };



    publicApi.prototype.setPenSize = function(size){
        if(size === 'default'){
            canvasDrawingY = 2;
        }else{
            canvasDrawingY = parseInt(size);
        }
    }

    publicApi.prototype.setColor = function(color){
        if(this.colors.indexOf(color) > -1 || color === 'white'){
            canvasDrawingX = color;
            if(color === "white"){
                canvasDrawingY = 14;
            }else{
                canvasDrawingY = 2;
            }
        }

        return this;
    };

    publicApi.prototype.reScale = function(obj){
        if(this.options.id == obj.user){
            this.canvas.width = obj.stack.width;
            this.canvas.height = obj.stack.height;   
        }
    };

    publicApi.prototype.erase = function(){
        eraseCanvas.call(this);
        this.stack.push({
            event: "clear"
        });
        this.trigger('interact.send');
        this.stack = [];
    };

    publicApi.prototype.init = function(CB){
        var _self = this;

        this.addEventListener(["mousemove","mousedown","mouseup","mouseout","touchstart","touchmove","touchend"], function(e){
            findxy.call(_self,e)
        },false);

        // trigger our callback
        (CB || function(){})();

        return this;
    };

    publicApi.prototype.addStyle = function(css){
        // set the styles
        if(css){
            for(var prop in css){
                 this.canvas.style[prop] = css[prop];
            }
        }

        return this;
    };

    publicApi.prototype.addEventListener = function(events,fn){
        var self = this;
        if(typeof events === "object"){
            events.forEach(function(evName){
                self.canvas.addEventListener(evName,fn);
            });
        }else{
            self.canvas.addEventListener(events,fn);
        }

        return this;
    };

    function eraseCanvas(){
        this.ctx.clearRect(0, 0, this.options.width, this.options.height);
    }
    
    
    function draw(prevX, prevY, currX, currY, x, y, pushToStack) {
        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(currX, currY);
        this.ctx.strokeStyle = x;
        this.ctx.lineWidth = y;
        this.ctx.stroke();
        this.ctx.closePath();

        // push the result to stack
        if(pushToStack){
            this.stack.push({
                arg: [prevX, prevY, currX, currY, x, y,false],
                event: "draw"
            });
        }

        this.trigger('interact.send');
    }

    function pencilOnBoard(x, currX, currY, pushToStack){
        this.ctx.beginPath();
        this.ctx.fillStyle = x;
        this.ctx.fillRect(currX, currY, 2, 2);
        this.ctx.closePath();


        if(pushToStack){
           this.stack.push({
                event: "pencilOnBoard",
                arg: [x, currX, currY]
            }); 
        }

        this.trigger('interact.send');
        
    }


    
    
    publicApi.prototype.getDataURL = function(CB) {
        var dataURL = this.canvas.toDataURL();
        // trigger our callback
        (CB || function(){})(dataURL);
    };

    publicApi.prototype.interact = function(){
        return new interaction(this);
    };

    publicApi.prototype.$on = $on;
    // trigger event
    publicApi.prototype.trigger = trigger;

    function getMouseEvent(e){
        return ({
            clientX: e.clientX || (e.targetTouches[0] || {}).clientX,
            clientY: e.clientY || (e.targetTouches[0] || {}).clientY
        });
    }
    
    function findxy(e) {
        var canvas = this.canvas,
            ctx = this.ctx,
            _ev = getMouseEvent(e);
        switch(e.type){
            case('mousedown'):
            case('touchstart'):
                prevX = currX;
                prevY = currY;
                currX = _ev.clientX - canvas.offsetLeft;
                currY = _ev.clientY - canvas.offsetTop;
        
                flag = true;
                dot_flag = true;
                if (dot_flag) {
                    pencilOnBoard.apply(this, [canvasDrawingX, currX, currY, true]);
                    dot_flag = false;
                }
            break;
            case('mouseout'):
            case('mouseup'):
            case('touchend'):
                flag = false;
            break;
            case('mousemove'):
            case('touchmove'):
                if (flag) {
                    prevX = currX;
                    prevY = currY;
                    currX = _ev.clientX - canvas.offsetLeft;
                    currY = _ev.clientY - canvas.offsetTop;
                    draw.apply(this, [prevX, prevY, currX, currY, canvasDrawingX, canvasDrawingY, true]);
                }
            break;
        }

    }

    function $on(evName, fn){
        this._events[evName] = fn;
        return this;
    }

    function trigger(evName,arg){
        if(this._events[evName]){
            this._events[evName].call(this._events[evName],arg);
        }

        return this;
    }


    // Interaction 
    function interaction(parent){
        this._options = parent.options;
        this._parent = new jHTML2Canvas();
        this._events = {},
        self = this,
        _childFrames = {};
       this.ajax = {
            post:{
                method: 'POST'
            },
            get: {
                method:'GET'
            },
            timer: 500
        };

        this.helpers = {
            draw: draw,
            pencilOnBoard: pencilOnBoard,
            clear: eraseCanvas
        };

        parent.$on('interact.send',function(){
            self.sendEvent('interaction.stack.received',{
                user:parent.options.id,
                stack:parent.stack.concat()
            });
            // clear parent stack after sending
            parent.stack = [];
        });

        // set socket
        this.socketEnabled = false;
        this.socket = {};

    };

    interaction.prototype.connect = function(){
        this.sendEvent('connect.child',{
            user: this._options.id,
            stack: this._options
        });
        return this;
    };

    interaction.prototype.createChildFrame = function(obj, dropZone){
        _childFrames[obj.user] = new jHTML2Canvas().drawing(obj.stack, dropZone);
        return _childFrames[obj.user];
    };

    interaction.prototype.destroyFrame = function(id){
        delete _childFrames[id];
    };

    interaction.prototype.sendEvent = function(evName, stack){
        var self = this,
            options = this.ajax.post;
        options.data = {
            type: evName,
            payload: stack
        };

        if(!this.socketEnabled){
            this._parent.helpers.http(options);
        }else{
            this.socket.emit('events.received', options.data);
        }
        
    };

    interaction.prototype.watch = function(){
        var self = this;
        // start our watch
        if(!this.socketEnabled){
            console.log('-- starting web :http long poll---');
            setInterval(function(){
                self.getEvents();
            },this.ajax.timer);
        }

         self.getEvents();

        return this;
    };

    interaction.prototype.getEvents = function(){
        var options = this.ajax.get,
            self = this;

        var onEventReceived = function(response){
            self.trigger(response.type,response.payload);
        };

        if(!this.socketEnabled){
            this._parent.helpers.http(options)
            .then(onEventReceived)
        }else{
            console.log('-- starting web socket:events.received---');
            this.socket.on('events.received',onEventReceived)
        }
    };

    interaction.prototype.draw = function(obj){
        var _userFrame = _childFrames[obj.user],
            _self = this;
        if(!_userFrame){
            return;
        }

        obj.stack.forEach(function(item){
            _self.helpers[item.event].apply(_userFrame, item.arg);
        });

    };

    interaction.prototype.disconnect = function(){

         return this;
    };

    interaction.prototype.$on = $on;
    interaction.prototype.trigger = trigger;




var defaultConfiguration = {
		paperHeight : 1319, //A4 paperHeight
		paperWidth : 1019, //A4 paperWidth
		domUrl :  window.URL || window.webkitURL || window
};

var flag = false,
    prevX = 0,
    currX = 0,
    prevY = 0,
    currY = 0,
    dot_flag = false;

var canvasDrawingX = "black",
    canvasDrawingY = 2;


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
			                	throw new Error("Inavlid Json file received");
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


var pdfVersion = '1.3',
    pageFormats = { // Size in pt of various paper formats
      'a0': [2383.94, 3370.39],
      'a1': [1683.78, 2383.94],
      'a2': [1190.55, 1683.78],
      'a3': [841.89, 1190.55],
      'a4': [595.28, 841.89],
      'a5': [419.53, 595.28],
      'a6': [297.64, 419.53],
      'a7': [209.76, 297.64],
      'a8': [147.40, 209.76],
      'a9': [104.88, 147.40],
      'a10': [73.70, 104.88],
      'b0': [2834.65, 4008.19],
      'b1': [2004.09, 2834.65],
      'b2': [1417.32, 2004.09],
      'b3': [1000.63, 1417.32],
      'b4': [708.66, 1000.63],
      'b5': [498.90, 708.66],
      'b6': [354.33, 498.90],
      'b7': [249.45, 354.33],
      'b8': [175.75, 249.45],
      'b9': [124.72, 175.75],
      'b10': [87.87, 124.72],
      'c0': [2599.37, 3676.54],
      'c1': [1836.85, 2599.37],
      'c2': [1298.27, 1836.85],
      'c3': [918.43, 1298.27],
      'c4': [649.13, 918.43],
      'c5': [459.21, 649.13],
      'c6': [323.15, 459.21],
      'c7': [229.61, 323.15],
      'c8': [161.57, 229.61],
      'c9': [113.39, 161.57],
      'c10': [79.37, 113.39],
      'dl': [311.81, 623.62],
      'letter': [612, 792],
      'government-letter': [576, 756],
      'legal': [612, 1008],
      'junior-legal': [576, 360],
      'ledger': [1224, 792],
      'tabloid': [792, 1224],
      'credit-card': [153, 243]
    },
      textColor = '0 g',
      page = 0,
      objectNumber = 2, // 'n' Current object number
      pages = new Array(),
      offsets = new Array(), // List of offsets
      lineWidth = 0.200025, // 2mm
      pageWidth,
      pageHeight,
      k, // Scale factor
      unit = 'mm', // Default to mm for units
      documentProperties = {},
      fontSize = 16, // Default font size
      pageFontSize = 16,
      font = 'Helvetica', // Default font
      pageFont = font,
      fonts = {}, // fonts holder, namely use in putRessource
      fontmap = {},
      fontIndex = 0, // F1, F2, etc. using setFont
      fontsNumber = {},
      _pagedim = {},
      _pagesContext = {},
      onPageBegin = false,
      content_length = '',
      zoomMode,
      layoutMode,
      pageMode,
      orientation,
      defaultOptions = {
            orientation : "P",
            unit : "mm",
            format : "a4"
      };


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