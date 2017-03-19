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
