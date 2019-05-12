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
