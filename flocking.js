// flocking behavior
function Flocker(mass, pos, radius) {
	// state constants
	this.STANDBY = 0;
	this.MOVING = 1;
	this.ATTACKING = 2;
	this.EATING = 3;
	this.DEAD = 4;

	// behavior parameter
	this.AGGRESIVENESS = 400;
	this.RADIUS_OF_ACCEPTANCE = 4;
	this.MAXIMUM_SPEED = 1.5;
	this.AVOIDANCE_SPEED = 1.1;
	this.TARGET_RADIUS = 64;
	this.steeringEffect = 1.3;
	this.attackRadius = 16;
	this.MOVING_TARGET = true;

	// locomotion
	this.mass = mass;
	this.radius = radius || 32;
	this.invMass = (mass == 0 ? 0 : 1/mass);
	this.pos = pos;
	this.force = new Vec2(0, 0);
	this.velocity = new Vec2(0, 0);
	this.orientation = 0;

	this.target = null;		// pathfinding destination target
	this.targetStack = [];	// pathfinding path


	this.state = this.STANDBY;

	// AI control
	this.ENVIRONMENT_CHECK_DELAY = 100;
	this.lastEnvironmentCheck = -10;
	this.updateCount = 0;


	// attack state
	this.lockOnTarget = null;
	this.lastAttack = 0;
	this.ATTACK_DELAY = 80;



	// book keeping
	this.team = 0;
	this.healthPoints = 100;
	this.isAlive = true;
	this.strength = 30;
	this.maxHealthPoints = 100;

	this.provoked = false;

	// for rendering after death
	this.PERSISTENCE = 1000;
	this.timeOfDeath = -1;
}

Flocker.prototype.seek = function() {
	var steeringEffect = this.steeringEffect;
	if (this.target == null) return;
	var targetVelocity = upperbound(this.target.minus(this.pos), this.MAXIMUM_SPEED);
	var force = targetVelocity.minus(this.velocity).times(steeringEffect);
	this.force = this.force.plus(force);
}

Flocker.prototype.integrate = function() {
	acc = this.force.times(this.invMass);
	this.velocity = this.velocity.plus(acc);
	this.velocity = upperbound(this.velocity, this.MAXIMUM_SPEED);

	this.pos = this.pos.plus(this.velocity);

	if (this.target != null) {
		this.orientation = getAngle(this.velocity);
	}

	if (this.target == null) {
		this.velocity = this.velocity.times(0.95);
	} else if (this.target.minus(this.pos).length() < this.TARGET_RADIUS) {
		this.velocity = this.velocity.times(0.95);
		this.target = this.targetStack.pop();
	}

	this.force.x = this.force.y = 0;
}

Flocker.prototype.setPath = function(path) {
	this.targetStack = path;
	this.target = path.pop();
}

Flocker.prototype.getInteractionType = function(flock) {
	flock.setState(flock.ATTACKING);
}

Flocker.prototype.update = function(flock, map) {
	this.updateCount++;
	if (!this.isAlive) return;

	var seperation = 0.2;
	var alignment = 0.04;
	var avoidance = 0.5;
	var radius = 60.0;
	var deltaT = 1/30;

	// interaction with world
	this.checkSurrounding(flock, map);

	// seek
	this.seek();


	// separation
	var expos = this.pos.plus(this.velocity.times(deltaT));
	for (var j = 0; j < flock.length; ++j) {
		if (this == flock[j]) continue;
		var dij = this.pos.minus(flock[j].pos);
		if (dij.length() < radius) {
			var diff = expos.minus(flock[j].pos);
			if (diff.length() == 0) {
				diff = new Vec2(1, j);
				diff.normalize();
			}
			var flee = upperbound(diff, this.MAXIMUM_SPEED * seperation);
			this.force = this.force.plus(flee);
		}
	}

	avoidance
	var k = -1;	// to avoid
	var dist = 1e9;
	for (var j = 0; j < flock.length; ++j) {
		if (this == flock[j]) continue;
		var jexpos = flock[j].pos.plus(flock[j].velocity.times(deltaT));
		var d = expos.minus(jexpos).length();
		if (dist > d) {
			k = j;
			dist = d;
		}
	}

	if (k != -1) {
		if (dist <= flock[k].radius) {
			var F = expos.minus(flock[k].pos.plus(flock[k].velocity.times(deltaT)));
			F = F.normalize().times(this.AVOIDANCE_SPEED*avoidance);
			this.force = this.force.plus(F);
		}
	}
	
	// avoidance with map
	if (map) {
		k = -1;
		dist = 1e9;
		var mpos = [Math.floor(expos.y/map.size) ,Math.floor(expos.x/map.size)];
		var idx = mpos[0]*map.width+mpos[1];
		if (idx > 0 && idx < map.data.length) {
			if (map.data[idx]==0) {
				var F = expos.minus(new Vec2(map.size*(mpos[1]+0.5), map.size*(mpos[0]+0.5)));
				F = F.normalize().times(this.AVOIDANCE_SPEED);
				this.force = this.force.plus(F);
			}
		}
	}

	this.integrate();

	//alignment
	var aveOrient = 0;
	var count = 0;
	for (var j = 0; j < flock.length; ++j) {
		//if (this==flock[j]) continue;
		var dij = this.pos.minus(flock[j].pos);
		if (dij.length() < radius) {
			aveOrient += flock[j].orientation;
			count++;
		}
	}
	if (count > 0) {
		aveOrient /= count;
		this.orientation = (1-alignment) * this.orientation + alignment * aveOrient;
	}

	// flock and map correction
	if (map) {
		var mpos = [Math.floor(this.pos.y/map.size) ,Math.floor(this.pos.x/map.size)];
		for(var dr = -1; dr <= 1; ++dr) {
			for(var dc = -1; dc <= 1; ++dc) {
				this.resolveCollisionWithMap(map, [mpos[0]+dr, mpos[1]+dc]);
			}
		}
	}

	this.handleLockOnTarget(flock, map);
}


Flocker.prototype.checkSurrounding = function(flock, map) {
	
	if (this.updateCount-this.lastEnvironmentCheck <= this.ENVIRONMENT_CHECK_DELAY) {
		return;
	}
	this.lastEnvironmentCheck = this.updateCount;


	// find other pig to attack, closest one
	var dist = 1e9;
	var k = -1;
	for (var i = 0; i < flock.length; ++i) {
		if (!flock[i].isAlive) continue;
		if (flock[i].team != this.team) {
			var curdist = flock[i].pos.minus(this.pos).length();
			if (curdist > this.AGGRESIVENESS) continue;
			if (dist > curdist) {
				dist = curdist;
				k = i;
			}
		}
	}

	if (k!=-1){
		if (this.lockOnTarget && !this.lockOnTarget.MOVING_TARGET) return;
		var reachable = this.setLockOnTarget(flock[k], map);
		if (reachable) return;
	}


	// BFS
	var q = new Queue();
	var mark = new Int32Array(map.width*map.height).fill(0);
	var start = [Math.floor(this.pos.y/map.size), Math.floor(this.pos.x/map.size)];
	q.push(start);
	mark[computeIndex(map, start)] = 1;


	function computeIndex(map, entry) {
		var idx = entry[0]*map.width+entry[1];
		return idx;
	}


	function checkThenPush(i, j) {
		if (i < 0 || j < 0 || i >= map.height || j >= map.width) return;
		var idx = computeIndex(map, [i, j]);
		if (mark[idx] == 1) return;
		mark[idx] = 1;
		q.push([i,j]);
	}

	while (!q.empty()) {
		var cur = q.pop();
		var idx = computeIndex(map, cur);
		var pos = new Vec2((cur[1]+0.5)*map.size, (cur[0]+0.5)*map.size);
		if (this.pos.minus(pos).length() >= this.AGGRESIVENESS) continue;

		if (map.entry[idx]) {
			var building = map.entry[idx];
			if (building.canInteract(this)) {
				this.setLockOnTarget(building, map);
				break;
			}
		}

		for(var dr=-1;dr<=1;++dr){
			for(var dc=-1;dc<=1;++dc){
				checkThenPush(cur[0]+dr,cur[1]+dc);
			}
		}
	}

}

Flocker.prototype.handleLockOnTarget = function(flock, map) {
	if (this.lockOnTarget) {
		if (!this.lockOnTarget.isAlive) {
			this.lockOnTarget = null;
			this.state = this.STANDBY;
			this.target = null;
			this.targetStack = [];
			this.provoked = false;
			return;
		}
		if (this.lockOnTarget.pos.minus(this.pos).length() <= this.radius + this.lockOnTarget.radius + this.attackRadius) {
			// close enough, attack! (or eat)
			this.targetStack = [];
			this.target = null;
			this.lockOnTarget.getInteractionType(this);

			// attack events
			if (this.state == this.ATTACKING) {
				if (this.updateCount - this.lastAttack > this.ATTACK_DELAY) {
					this.lastAttack = this.updateCount + this.sprites[this.ATTACKING].DELTA_PER_FRAME*this.sprites[this.ATTACKING].numOfFrames;
					this.sprites[this.ATTACKING].reset();
				}
				else if (this.updateCount - this.lastAttack == -2*this.sprites[this.ATTACKING].DELTA_PER_FRAME) {
					// on the last frame of attack animation, reduce enemy hitpoints
					this.lockOnTarget.receiveDamage(this.strength);
				}
			} 

			// eating events, use the same delay with attack.
			if (this.state == this.EATING) {
				if (this.updateCount - this.lastAttack > this.ATTACK_DELAY) {
					this.lockOnTarget.receiveDamage(this.strength);
					this.lastAttack = this.updateCount;
				}
			}
		} else if (this.state != this.MOVING && this.state != this.STANDBY) {
			// if already attacking or eating, chase after the enemy straigth away
			this.target = this.lockOnTarget.pos;
		}

		// orientation fix: when locking on a target
		if (this.state == this.ATTACKING || this.state == this.EATING) {
			this.orientation = getAngle(this.lockOnTarget.pos.minus(this.pos).normalize());
		}
	}
}


Flocker.prototype.setLockOnTarget = function(obj, map) {
	if (this.lockOnTarget != null) {
		this.lockOnTarget.interactionCount--;
	}
	this.provoked = true;
	this.lockOnTarget = obj;
	obj.interactionCount++;
	if (obj.pos.minus(this.pos) <= map.size) {
		this.targetStack = [];
		this.target = obj.pos;
		return true;
	}

	var curpos = [Math.floor(this.pos.y/map.size), Math.floor(this.pos.x/map.size)];
	var row = Math.floor(obj.pos.y/map.size);
	var col = Math.floor(obj.pos.x/map.size);

	if (!obj.MOVING_TARGET) {
		row = obj.row+Math.floor((obj.size/map.size)/2);
		col = obj.col+Math.floor((obj.size/map.size)/2);
	} 

	var p = findPath(curpos, [row, col], map);
	var cp = transformPathToVec2D(p, map);
	cp[0] = obj.pos;
	cp[cp.length-1] = this.pos;
	this.setPath(cp);
	return p.length > 0 && row == p[0][1] && col == p[0][0];
}


Flocker.prototype.setState = function(state) {
	this.state = state;
}

Flocker.prototype.receiveDamage = function(dmg) {
	if (!this.isAlive) return;
	this.healthPoints -= dmg;
	if (this.healthPoints <= 0) {
		this.healthPoints = 0;
		this.isAlive = false;
		this.state = this.DEAD;
		this.timeOfDeath = this.updateCount;

		// clean up
		if (this.lockOnTarget) {
			this.lockOnTarget.interactionCount--;
			this.lockOnTarget = null;
		}
	}
}

Flocker.prototype.cleanUp = function(flock, map) {

}

Flocker.prototype.garbageCollectible = function() {
	return !this.isAlive && (this.updateCount-this.timeOfDeath >= this.PERSISTENCE);
}

Flocker.prototype.resolveCollisionWithMap = function(map, mpos) {
	var PENETRATION_RESOLUTION = 0.1;
	if (!this.collidesWithCell(map, mpos)) return;
	var idx = mpos[0]*map.width+mpos[1];
	if (idx > 0 && idx < map.data.length) {
		if (map.data[idx]==0) {
			var dij = this.pos.minus(new Vec2((mpos[1]+0.5)*map.size, (mpos[0]+0.5)*map.size));
			var penetration = map.size-Math.abs(dij.x);
			var axis = new Vec2(Math.sign(dij.x),0);
			if (Math.abs(dij.y) > Math.abs(dij.x)) {
				penetration = map.size-Math.abs(dij.y);
				axis.x = 0;
				axis.y = Math.sign(dij.y);
			}
			this.pos = this.pos.plus(axis.times(penetration*PENETRATION_RESOLUTION));
		}
	}
}

Flocker.prototype.collidesWithCell = function(map, mpos) {
	return !(mpos[0]<0 || mpos[1]<0 || mpos[0]>=map.height || mpos[1]>=map.width 
		|| mpos[1]*map.size > this.pos.x+this.radius || (mpos[1]+1)*map.size < this.pos.x-this.radius 
		|| mpos[0]*map.size > this.pos.y+this.radius || (mpos[0]+1)*map.size < this.pos.y-this.radius);
}


Flocker.prototype.drawTest = function(g) {
	g.save();
	g.rotate(Math.PI/2);
	g.scale(1, -1);
	g.fillStyle = "black";
	g.beginPath();
	g.moveTo(0, this.radius);
	g.lineTo(this.radius/2, -this.radius/2*Math.sqrt(3));
	g.lineTo(-this.radius/2, -this.radius/2*Math.sqrt(3));
	g.closePath();
	g.fill();
	g.restore();
}






// Flock + Sprite state machine
function FlockPrite(mass, pos, radius) {
	Flocker.call(this, mass, pos, radius);

	this.sprites = {};

}

FlockPrite.prototype = Object.create(Flocker.prototype);

FlockPrite.prototype.setSprite = function(type, sprite) {
	this.sprites[type] = sprite;
}

FlockPrite.prototype.render = function(g) {
	g.save();
	if (!this.isAlive) {
		// step wise alpha degradation
		var alpha = 1 - Math.max(0, ((this.updateCount-this.timeOfDeath)/this.PERSISTENCE));
		if (alpha < 0.50) alpha = 0.50;
		else alpha = 1
		g.globalAlpha = alpha;
	}
	g.translate(Math.floor(this.pos.x), Math.floor(this.pos.y));
	g.rotate(Math.floor((this.orientation+90)/180*Math.PI * 10)/10);
	g.translate(-this.radius, -this.radius);
	this.sprites[this.state].render(g, this.radius*2, this.radius*2);
	g.restore();
}

FlockPrite.prototype.integrate = function() {
	Flocker.prototype.integrate.call(this);

	if (this.target == null && this.state != this.ATTACKING && this.state != this.EATING) {
		this.state = this.STANDBY;
	} 
}

FlockPrite.prototype.setPath = function(path) {
	Flocker.prototype.setPath.call(this, path);
	if (this.state == this.STANDBY) {
		this.state = this.MOVING
	} else if (this.targetStack[0] != null && this.pos.minus(this.targetStack[0]).length() >= this.radius*4){
		this.state = this.MOVING;
	}
}



function Building(size, interactionDistance) {
	this.size = size;
	this.radius = size/2;
	this.pos = new Vec2(0, 0);
	this.row = null;
	this.col = null;

	// state constant
	this.NORMAL = 0;
	this.DEAD = 1;

	// interaction constant
	this.ATTACK_TYPE = 0;
	this.EAT_TYPE = 1;
	this.NO_INTERACTION = 2;
	this.SHOW_HEALTHBAR = true;

	// behavior constant
	this.MOVING_TARGET = false;

	this.ACTIVE = 0;
	this.PASSIVE = 1;

	this.sprites = {};

	// building state
	this.state = this.NORMAL;


	// interaction state
	this.interactionDistance = interactionDistance;
	this.interactionType = this.ATTACK_TYPE;
	this.activity = this.ACTIVE;
	this.MAX_INTERACTION = 6;
	this.interactionCount = 0;

	// behavior
	this.attackRadius = 500;
	this.ATTACK_DELAY = 130;
	this.strength = 80;
	this.lastAttack = 0;

	// book keeping
	this.team = 0;
	this.healthPoints = 500;
	this.maxHealthPoints = 500;
	this.isAlive = true;

	this.updateCount = 0;


	// for rendering after death
	this.PERSISTENCE = 120;
	this.timeOfDeath = -1;
}

Building.prototype.setSprite = function(type, sprite) {
	this.sprites[type] = sprite;
}

Building.prototype.render = function(g) {
	if (this.sprites[this.state]) {
		g.save();
		g.translate(this.pos.x - this.size/2, this.pos.y - this.size/2);
		g.save();
		if (!this.isAlive) {
			// step wise alpha degradation
			var alpha = 1 - Math.max(0, ((this.updateCount-this.timeOfDeath)/this.PERSISTENCE));
			if (alpha < 0.50) alpha = 0.50;
			else alpha = 1
			g.globalAlpha = alpha;
		}
		this.sprites[this.state].render(g, this.size, this.size);
		g.restore();
		g.fillStyle = "black";
		if (this.SHOW_HEALTHBAR){
			g.fillRect(2, 0, this.size-4, 8);
			g.fillStyle = "yellow";
			g.fillRect(3, 1, (this.size-6) * this.healthPoints/this.maxHealthPoints, 6);
		}
		g.restore();
	}
}

Building.prototype.canInteract = function(flock) {
	if (this.team == flock.team) return;
	if (this.interactionType == this.NO_INTERACTION) return false;
	if (this.activity == this.PASSIVE && !flock.provoked) {
		return false;
	}
	if (this.interactionCount >= this.MAX_INTERACTION
	|| flock.pos.minus(this.pos).length() >= this.interactionDistance) return false;
	return true;
}

Building.prototype.getInteractionType = function(flock) {
	if (this.interactionType == this.ATTACK_TYPE) {
		flock.setState(flock.ATTACKING);
	} else if (this.interactionType == this.EAT_TYPE) {
		flock.setState(flock.EATING);
	}
}

Building.prototype.receiveDamage = function(dmg) {
	Flocker.prototype.receiveDamage.call(this, dmg);
}

Building.prototype.update = function(flock, map) {
	this.updateCount++;
}

Building.prototype.cleanUp = function(flock, map) {
	removeBuildingFromMap(this, map);
}

Building.prototype.garbageCollectible = function() {
	return Flocker.prototype.garbageCollectible.call(this);
}

function registerBuildingToMap(building, map, row, col) {
	var size = Math.floor(building.size/map.size);
	for (var i = 0; i < size;++i){
		for (var j = 0; j < size; ++j) {
			map.data[(row+i)*map.width+col+j] = 0;
			map.entry[(row+i)*map.width+col+j] = building;
		}
	}
	building.pos.x = (col+size/2)*map.size;
	building.pos.y = (row+size/2)*map.size;
	building.row = row;
	building.col = col;
}


function removeBuildingFromMap(building, map) {
	var size = Math.floor(building.size/map.size);
	for (var i = 0; i < size;++i){
		for (var j = 0; j < size; ++j) {
			map.data[(building.row+i)*map.width+building.col+j] = 1;
			map.entry[(building.row+i)*map.width+building.col+j] = null;
		}
	}
}


