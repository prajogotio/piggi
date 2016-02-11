// flocking behavior
function Flocker(mass, pos, radius) {
	this.RADIUS_OF_ACCEPTANCE = 4;
	this.MAXIMUM_SPEED = 3;
	this.AVOIDANCE_SPEED = 2;
	this.TARGET_RADIUS = 64;
	this.mass = mass;
	this.radius = radius || 32;
	this.invMass = (mass == 0 ? 0 : 1/mass);
	this.pos = pos;
	this.force = new Vec2(0, 0);
	this.velocity = new Vec2(0, 0);
	this.orientation = 0;
	this.target = null;
	this.targetStack = [];
}

Flocker.prototype.seek = function() {
	var steeringEffect = 1.2;
	if (this.target == null) return;
	var targetVelocity = upperbound(this.target.minus(this.pos), this.MAXIMUM_SPEED);
	var force = targetVelocity.minus(this.velocity).times(steeringEffect);
	this.force = this.force.plus(force);
}

Flocker.prototype.integrate = function() {
	acc = this.force.times(this.invMass);
	this.velocity = this.velocity.plus(acc);
	this.velocity = upperbound(this.velocity, this.MAXIMUM_SPEED);

	// this.velocity.x = Math.floor(this.velocity.x*10000)/10000;
	// this.velocity.y = Math.floor(this.velocity.y*10000)/10000;
	
	this.pos = this.pos.plus(this.velocity);
	if (this.velocity.length() > 1) {
		this.orientation = getAngle(this.velocity);
	}
	if (this.target == null) {
		this.velocity = this.velocity.times(0.8);
	} else if (this.target.minus(this.pos).length() < this.TARGET_RADIUS) {
		this.velocity = this.velocity.times(0.9);
		this.target = this.targetStack.pop();
	}
	this.force.x = this.force.y = 0;
}

Flocker.prototype.setPath = function(path) {
	this.targetStack = path;
	this.target = path.pop();
}

function updateFlocking(flock, map) {
	var seperation = 1.0;
	var cohesion = 1.0;
	var alignment = 0.1;
	var radius = 60.0;
	var deltaT = 1/60;


	// seek
	for(var i = 0; i < flock.length; ++i){
		flock[i].seek();
	}


	// separation
	for(var i = 0; i < flock.length; ++i){
		for (var j = 0; j < flock.length; ++j) {
			if (i == j) continue;
			var dij = flock[i].pos.minus(flock[j].pos);
			if (dij.length() < radius) {
				var expos = flock[i].pos.plus(flock[i].velocity.times(deltaT));
				var diff = flock[j].pos.minus(expos);
				if (diff.length() == 0) {
					diff = new Vec2(1, i);
					diff.normalize();
				}
				var flee = upperbound(diff, flock[j].MAXIMUM_SPEED * seperation);
				flock[j].force = flock[j].force.plus(flee);
			}
		}
	}

	// cohesion

	// avoidance
	for(var i = 0; i < flock.length; ++i){
		var k = -1;	// to avoid
		var dist = 1e9;
		var expos = flock[i].pos.plus(flock[i].velocity.times(deltaT));
		for (var j = 0; j < flock.length; ++j) {
			if (i == j) continue;
			var jexpos = flock[j].pos.plus(flock[j].velocity.times(deltaT));
			var d = expos.minus(jexpos).length();
			if (dist > d) {
				k = j;
				dist = d;
			}
		}

		if (k != -1) {
			if (dist > flock[k].radius) continue;
			var F = expos.minus(flock[k].pos.plus(flock[k].velocity.times(deltaT)));
			F = F.normalize().times(flock[i].AVOIDANCE_SPEED);
			flock[i].force = flock[i].force.plus(F);
		}
	}
	
	// avoidance with map
	if (map) {
		for(var i = 0; i < flock.length; ++i){
			var k = -1;	// to avoid
			var dist = 1e9;
			var expos = flock[i].pos.plus(flock[i].velocity.times(deltaT));
			var mpos = [Math.floor(expos.y/map.size) ,Math.floor(expos.x/map.size)];
			var idx = mpos[0]*map.width+mpos[1];
			if (idx > 0 && idx < map.data.length) {
				if (map[idx]==0) {
					var F = expos.minus(new Vec2(map.size*(mpos[1]+0.5), map.size*(mpos[0]+0.5)));
					F = F.normalize().times(flock[i].AVOIDANCE_SPEED);
					flock[i].force = flock[i].force.plus(F);
				}
			}
		}
	}

	for(var i = 0; i < flock.length; ++i){
		flock[i].integrate();
	}

	//alignment
	for(var i = 0; i < flock.length; ++i){
		var aveOrient = 0;
		var count = 0;
		for (var j = 0; j < flock.length; ++j) {
			if (i==j) continue;
			var dij = flock[i].pos.minus(flock[j].pos);
			if (dij.length() < radius) {
				aveOrient += flock[j].orientation;
				count++;
			}
		}
		if (count > 0) {
			aveOrient /= count;
			flock[i].orientation = (1-alignment) * flock[i].orientation + alignment * aveOrient;
		}
	}

	// positional correction 
	// for(var i = 0; i < flock.length; ++i){
	// 	for (var j = i+1; j < flock.length; ++j) {
	// 		var dij = flock[i].pos.minus(flock[j].pos);
	// 		var dist = dij.length();
	// 		if (dist < flock[i].radius+flock[j].radius) {
	// 			dij.normalize();
	// 			var penetration = flock[i].radius + flock[j].radius - dist;
	// 			if (dij.length() == 0) {
	// 				dij = new Vec2(1, 0);
	// 			}
	// 			var den = flock[i].invMass*flock[i].velocity.length() + flock[j].invMass*flock[j].velocity.length();
	// 			var m = penetration*0.1/(den == 0 ? 1 : den);
	// 			flock[i].pos = flock[i].pos.plus(dij.times(m*flock[i].invMass*flock[i].velocity.length()));
	// 			flock[j].pos = flock[j].pos.plus(dij.flip().times(m*flock[j].invMass*flock[j].velocity.length()));
	// 		}
	// 	}
	// }

	// flock and map correction
	if (map) {
		for(var i = 0; i < flock.length; ++i){
			var mpos = [Math.floor(flock[i].pos.y/map.size) ,Math.floor(flock[i].pos.x/map.size)];
			var idx = mpos[0]*map.width+mpos[1];
			if (idx > 0 && idx < map.data.length) {
				if (map[idx]==0) {
					var dij = flock[i].pos.minus(new Vec2((mpos[1]+0.5)*map.size, (mpos[0]+0.5)*map.size));
					var penetration = flock[i].radius + map.size/2 - dij.length();
					dij.normalize();
					flock[i].pos = flock[i].pos.plus(dij.times(penetration*0.1));
				}
			}
		}
	}
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

	// state constants
	this.STANDBY = 0;
	this.MOVING = 1;
	this.ATTACKING = 2;


	this.sprites = [null, null, null];

	this.state = this.STANDBY;
}

FlockPrite.prototype = Object.create(Flocker.prototype);

FlockPrite.prototype.setSprite = function(type, sprite) {
	this.sprites[type] = sprite;
}

FlockPrite.prototype.render = function(g) {
	g.save();
	g.translate(this.pos.x, this.pos.y);
	g.rotate((this.orientation)/180*Math.PI);
	g.rotate(90/180*Math.PI);
	g.translate(-this.radius, -this.radius);
	this.sprites[this.state].render(g, this.radius*2, this.radius*2);
	g.restore();
}

FlockPrite.prototype.integrate = function() {
	Flocker.prototype.integrate.call(this);

	if (this.target == null) {
		this.state = this.STANDBY;
	} 
}

FlockPrite.prototype.setPath = function(path) {
	Flocker.prototype.setPath.call(this, path);
	this.state = this.MOVING;
}
