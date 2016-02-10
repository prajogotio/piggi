function Vec2(x, y) {
	this.x = x;
	this.y = y;
};

Vec2.prototype.minus = function(v) {
	return new Vec2(this.x-v.x, this.y-v.y);
}

Vec2.prototype.normalize = function() {
	var length = this.length();
	if (length == 0) return this;
	this.x /= length;
	this.y /= length;
	return this;
}

Vec2.prototype.length = function() {
	return Math.sqrt(this.x*this.x+this.y*this.y);
}

Vec2.prototype.rotate = function(theta) {
	theta = Math.PI/180 * theta;
	var x = this.x;
	var y = this.y;
	var cos = Math.cos(theta);
	var sin = Math.sin(theta);
	this.x = x * cos - y * sin;
	this.y = x * sin + y * cos;
	return this;
}

Vec2.prototype.dot = function(v) {
	return this.x * v.x + this.y * v.y;
}

Vec2.prototype.copy = function() {
	return new Vec2(this.x, this.y);
}

Vec2.prototype.flip = function() {
	return new Vec2(-this.x, -this.y);
}

Vec2.prototype.plus = function(v) {
	return new Vec2(this.x + v.x, this.y + v.y);
}

Vec2.prototype.times = function(c) {
	return new Vec2(this.x * c, this.y * c);
}

Vec2.prototype.cross = function(v) {
	return this.x*v.y - this.y*v.x;
}

Vec2.prototype.resize = function(len) {
	var curlen = this.length();
	this.x *= len/curlen;
	this.y *= len/curlen;
	return this;
}

function getNormal(u, v) {
	var z = v.minus(u);
	z.rotate(90);
	z.normalize();
	return z;
}

function getAngle(v) {
	return Math.atan2(v.y, v.x)/Math.PI*180;
}

function upperbound(v, max) {
	var w = v.copy().normalize();
	var dist = v.length();
	var len = Math.min(max, dist);
	v.x = w.x*len;
	v.y = w.y*len;
	return v;
}

