/// <reference path="node_modules/express/lib/express.js" />
/// <reference path="node_modules/socket.io/lib/socket.js" />
var io = require('socket.io')(process.env.PORT || 3000);
var shortid = require('shortid');


function uno(cb){
  setTimeout(function(err){
    if(err) return cb('ups');
    console.log(1);
    cb(null, 1);
  }, 100);
}

function dos(cb){
  setTimeout(function(err){
    return cb('ups');
  }, 100);
}

function tres(cb){
  setTimeout(function(err){
    if(err) return cb('ups');
    console.log(3);
    cb(null, 3);
  }, 100);
}

var fnList = [uno, dos, tres];

async.series(fnList, function(err, results){
  if(err){
    console.log('Buu' + err);
  }else{
    for(var i = 0; i<results.legth; i++){
      console.log('Wii ' + results[i]);
    }
  }
});



console.log('server started');

var players = [];

var playerSpeed = 3;

//io.connect();

io.on('connection', function(socket){

    var thisPlayerId = shortid.generate();

    var player = {
        id: thisPlayerId,
        destination: {
            x: 0,
            y: 0,
            z: 0
        },
        lastPosition: {
            x: 0,
            y: 0,
            z: 0
        },
        lastMoveTime: 0
    };


    players[thisPlayerId] = player;

    console.log('client connected, broadcasting spawn, id: ', thisPlayerId);

    socket.emit("register", { id: thisPlayerId});
    socket.broadcast.emit('spawn', players[thisPlayerId]);
    socket.broadcast.emit('requestPosition');

    for(var playerId in players) {
        if (thisPlayerId == playerId)
            continue;

        socket.emit("spawn", players[playerId]);
        console.log('sending spawn to new player of id:', playerId);
    };

    socket.on('move', function (data) {
        data.id = thisPlayerId;
        console.log('client moved', JSON.stringify(data));

        player.destination.x = data.d.x;
        player.destination.y = data.d.y;
        player.destination.z = data.d.z;

        console.log('distance between current and destination: ', lineDistance(data.c, data.d));

        var elapsedTime = Date.now() - player.lastMoveTime;

        var travelDistanceLimit = elapsedTime * playerSpeed / 1000;

        var requestedDistanceTraveled = lineDistance(player.lastPosition, data.c);

        console.log("travelDistanceLimit: ", travelDistanceLimit, " requestedDistanceTraveled: ", requestedDistanceTraveled);

        if (requestedDistanceTraveled > travelDistanceLimit)
        {}

        player.lastMoveTime = Date.now() ;

        player.lastPosition = data.c;

        delete data.c;

        data.x = data.d.x;
        data.y = data.d.y;
        data.z = data.d.z;

        delete data.d;

        socket.broadcast.emit('move', data);
    });

    socket.on("follow", function (data) {

        data.id = thisPlayerId;
        socket.broadcast.emit("follow", data);
    });

    socket.on("updatePosition", function (data) {

        data.id = thisPlayerId;
        socket.broadcast.emit("updatePosition", data);
    });

    socket.on("attack", function (data) {
        console.log("attack request: ", data);
        data.id = thisPlayerId;

        io.emit("attack", data);
    });

    socket.on('disconnect', function () {
        console.log('client disconnected');

        delete players[thisPlayerId];

        socket.broadcast.emit("disconnected", { id: thisPlayerId });
    });

})

function lineDistance(vectorA, vectorB) {
    var xs = 0;
    var ys = 0;

    xs = vectorB.x - vectorA.x;
    xs = xs * xs;

    ys = vectorB.y - vectorA.y;
    ys = ys * ys;

    return Math.sqrt(xs + ys);
}
