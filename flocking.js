function Flocker(mass, pos, radius) {
	this.MAXIMUM_SPEED = 5;
	this.AVOIDANCE_SPEED = 1;
	this.TARGET_RADIUS = 64;
	this.mass = mass;
	this.radius = radius || 16;
	this.invMass = (mass == 0 ? 0 : 1/mass);
	this.pos = pos;
	this.force = new Vec2(0, 0);
	this.velocity = new Vec2(0, 0);
	this.orientation = 0;
	this.target = null;
}


Flocker.prototype.seek = function() {
	if (this.target == null) return;
	var targetVelocity = upperbound(this.target.minus(this.pos), this.MAXIMUM_SPEED);
	var force = targetVelocity.minus(this.velocity);
	this.force = this.force.plus(force);
}

Flocker.prototype.integrate = function() {
	acc = this.force.times(this.invMass);
	this.velocity = this.velocity.plus(acc);
	this.pos = this.pos.plus(this.velocity);
	if (this.velocity.length() > 1) {
		this.orientation = getAngle(this.velocity);
	}
	if (this.target == null) {
		this.velocity.x = this.velocity.y = 0;
	} else if (this.target.minus(this.pos).length() < this.TARGET_RADIUS) {
		this.velocity = this.velocity.times(0.8);
		if (this.target.minus(this.pos).length() < 4) {
			this.target = null;
		}
	}
	this.force.x = this.force.y = 0;
}

function updateFlocking(flock) {
	var seperation = 1.0;
	var cohesion = 1.0;
	var alignment = 0.5;
	var radius = 50.0;
	var deltaT = 1/60;

	// positional correction 
	for(var i = 0; i < flock.length; ++i){
		for (var j = i+1; j < flock.length; ++j) {
			var dij = flock[i].pos.minus(flock[j].pos);
			var dist = dij.length();
			if (dist < flock[i].radius+flock[j].radius) {
				dij.normalize();
				var penetration = flock[i].radius + flock[j].radius - dist;
				if (dij.length() == 0) {
					dij = new Vec2(1, 0);
				}
				var m = penetration*0.1/(flock[i].invMass + flock[j].invMass);
				flock[i].pos = flock[i].pos.plus(dij.times(m*flock[i].invMass));
				flock[j].pos = flock[j].pos.plus(dij.flip().times(m*flock[j].invMass));
			}
		}
	}

	// seek
	for(var i = 0; i < flock.length; ++i){
		flock[i].seek();
	}


	// seperation
	for(var i = 0; i < flock.length; ++i){
		for (var j = 0; j < flock.length; ++j) {
			if (i == j) continue;
			var dij = flock[i].pos.minus(flock[j].pos);
			if (dij.length() < radius) {
				var expos = flock[i].pos.plus(flock[i].velocity.times(deltaT));
				var flee = upperbound(flock[j].pos.minus(expos), flock[j].MAXIMUM_SPEED * seperation);
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
			var F = flock[k].pos.plus(flock[k].velocity.times(deltaT));
			F = F.normalize().times(flock[i].AVOIDANCE_SPEED);
			flock[i].force = flock[i].force.plus(F);
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