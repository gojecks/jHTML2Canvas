	
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