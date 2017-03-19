var express = require('express'),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
	port = process.env.PORT || 8010,
	clients = 0;

var _adminCache = {};
var _clientCache = {};
var _connectedClient = {};

app.use(express.static(__dirname));

app.get('/playground', function(req, res){
  res.sendfile('index.html');
});


app.get('/projector', function(req, res){
  res.sendfile('./projector/index.html');
});

app.get('/', function(req, res){
  res.sendfile('index.html');
});

io.on('connection',function(socket){

	socket.on('disconnect',function(){
		if(_adminCache[socket.id]){
			io.sockets.emit('admin.disconnected',{});
			delete _adminCache[socket.id];
			console.log('--- Admin Disconnected---');
		}else{
			io.sockets.emit('client.disconnected',{
				id: _clientCache[socket.id]
			});

			console.log("--client:"+_clientCache[socket.id]+" disconnected---");

			// delete the client
			delete _clientCache[socket.id];
			delete _connectedClient[socket.id]
		}

		io.sockets.emit('user.disconnected',{});
	});

	// set the custom socket events
	socket.on('events.received', function(events){
		switch(events.type){
			case('connect.child'):
				_clientCache[socket.id] = events.payload.user;
				if(!Object.keys(_adminCache).length){
					_connectedClient[socket.id] = events;
				}
			break;
		}

		io.sockets.emit('events.received', events);
	});

	// set the connected device role
	socket.on('device.role', function(data){
		if(data.isAdmin){
			_adminCache[socket.id] = true;
			if(Object.keys(_connectedClient).length){
				io.sockets.emit('events.received',{
					type:'stacked.clients',
					payload: _connectedClient
				});

				_connectedClient = {};
			}
		}
	});


	bindEventsToSocket(socket)(['JOIN','MOUSE_EVENT']);
});


http.listen(port, '0.0.0.0', function(){
  console.log('listening on *:'+ port);
});

function bindEventsToSocket(socket){
	return function(evName){
		evName.forEach(function(eventName){
			socket.on(eventName, eventBinder(eventName));
		});
	};

	function eventBinder(eventName){
		return function(data){
			console.log(eventName, data);
			io.sockets.emit(eventName, data);
		};
	}
}