{
    init: function(elevators, floors) {
        var doorDelay = 100, idleDelay = 100;
        // if idleFloor is set to -1 it won't move.
        var idleFloor = -2;//Math.floor(floors.length/2-1);
        // if idleFloor is set to -2 it will use the following random floor
        var randomFloor = function() {
            return Math.floor(Math.random()*floors.length);
        }
        var fbot = floors[0].floorNum(), ftop = floors[floors.length-1].floorNum();
        var fhalf = floors[Math.floor(floors.length/2)].floorNum();
        var uppers = [], downers = [];
        
        var move = function(ei, n) {
              var elev = elevators[ei];
              var c = elev.currentFloor();
              var up = (c === 0 || c < n);
              var d = up ? "up" : "down";
              console.log("move elevator " + ei + " " + d + " from " + c + " to " + n);
              elev.goingDownIndicator(!up);
              elev.goingUpIndicator(up);
              setTimeout(elev.goToFloor(n), doorDelay);
        }
        
        var carString = function(ei) {
            var elev = elevators[ei];
            var d = elev.goingDownIndicator() ? "D" : " ", u = elev.goingUpIndicator() ? "U" : " ";
            var l = elev.loadFactor();
            return "car " + ei + " [" + d + u + "] {" + l + "}";
        }
        
        _.each(floors, function(floor) {
          var n = floor.floorNum();
          floors[n].on("up_button_pressed", function() {
            if (uppers.indexOf(n) === -1) {
              uppers.push(n)
              uppers.sort();
            }
            console.log("uppers + " + n + " = " + uppers.join());
          });
          floors[n].on("down_button_pressed", function() {
            if (downers.indexOf(n) === -1) {
              downers.push(n);
              downers.sort().reverse();
            }
            console.log("downers + " + n + " = " + downers.join());
          });
        });
        
        _.each(elevators, function(elev) {
            var ei = elevators.indexOf(elev), goingup = true, callup = true, callfn = -1;
            elev.on("idle", function() {
                console.log(carString(ei) + " idle");
                setTimeout(function() {
                  var n = -1;
                  if (uppers.length !== 0) {
                      n = uppers.shift();
                      callfn = n;
                      callup = true;
                  } else if (downers.length !== 0) {
                      n = downers.shift();
                      callfn = n;
                      callup = false;
                  }
                  
                  if (n > -1) {
                      move(ei, n);
                  } else if (idleFloor === -2) {
                      move(ei, randomFloor());
                  } else if (idleFloor > -1) {
                      move(ei, idleFloor);
                  }
                },idleDelay);
            });
            elev.on("floor_button_pressed", function(n) {
                move(ei, n);
                elev.destinationQueue.sort();
                if (elev.goingDownIndicator()) {elev.destinationQueue.reverse(); }
                //console.log(" " + ei + " request floor + " + n + " = " + elev.destinationQueue.join());
            });
            elev.on("passing_floor", function(n, d) {
                goingup = d === "up";
                var stops = downers;
                if (goingup) { stops = uppers; }
                console.log(carString(ei) + " past floor " + n + ". " + "stops " + stops.join());
                if (elev.loadFactor() < 0.99) {
                    var i = stops.indexOf(n);
                    if (i > -1) {
                      elev.goToFloor(n, true);
                      if (goingup) { uppers.splice(i,1); }
                      else { downers.splice(i,1); }
                    }
                }
            });
            elev.on("stopped_at_floor", function(n) {
                console.log(carString(ei) + " stop on floor " + n);
                elev.goingDownIndicator(!goingup);
                elev.goingUpIndicator(goingup);
                if (n === fbot || n === ftop || elev.destinationQueue === []) {
                    elev.goingDownIndicator(true);
                    elev.goingUpIndicator(true);
                } else if (n == callfn) {
                    elev.goingDownIndicator(!callup);
                    elev.goingUpIndicator(callup);
                } else if (floors[n].buttonStates.down !== "") {
                    elev.goingDownIndicator(true);
                } else if (floors[n].buttonStates.up !== "") {
                    elev.goingUpIndicator(true);
                }
                var i = uppers.indexOf(n), j = downers.indexOf(n);
                if (goingup && i > -1) {
                    uppers.splice(i,1);
                } else if (j > -1) {
                    downers.splice(j,1);
                }
            });
        });
    },
    update: function(dt, elevators, floors) {
        _.each(floors, function(floor) {
            var n = floor.floorNum();
            if (floor.buttonStates.down !== "") { floor.pressDownButton(); }
            if (floor.buttonStates.up !== "") { floor.pressUpButton(); }
        });
    }
}
