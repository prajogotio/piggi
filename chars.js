// characters
// asset and gameState conscious

function Pig(pos, team) {
	FlockPrite.call(this, 100, pos, 32);
	this.setSprite(this.STANDBY, new Sprite(asset.images["asset/pig_standby.png"], 0, 0, 128, 128, 4, 20));
	this.setSprite(this.MOVING, new Sprite(asset.images["asset/pig_running.png"], 0, 0, 128, 128, 6, 12));
	this.setSprite(this.ATTACKING, new Sprite(asset.images["asset/pig_angry.png"], 0, 0, 128, 128, 3, 20));
	this.setSprite(this.EATING, new Sprite(asset.images["asset/pig_eating.png"], 0, 0, 128, 128, 2, 30));
	this.setSprite(this.DEAD, new Sprite(asset.images["asset/pig_death.png"], 0, 0, 128, 128, 1, 100));
	this.sprites[this.ATTACKING].autoReset = false;
	this.team = team;
}

Pig.prototype = Object.create(FlockPrite.prototype);


function Tower(row, col, team) {
	Building.call(this, 128, 400);
	this.setSprite(this.NORMAL, new Sprite(asset.images["asset/tower.png"], 0, 0, 128, 128, 2, 25));
	this.setSprite(this.DEAD, new Sprite(asset.images["asset/tower_death.png"], 0, 0, 128, 128, 1, 100));
	registerBuildingToMap(this, gameState.map, row, col);

	this.type = this.ATTACK_TYPE;
	this.attackRadius = 500;
	this.ATTACK_DELAY = 130;
	this.strength = 80;
	this.team = team;
}

Tower.prototype = Object.create(Building.prototype);

Tower.prototype.update = function(flock, map) {
	if (!this.isAlive) return;
	Building.prototype.update.call(this, flock, map);
	if (this.updateCount - this.lastAttack <= this.ATTACK_DELAY) {
		return;
	}
	this.lastAttack = this.updateCount;

	for (var i = 0; i < flock.length; ++i) {
		if (!flock[i].isAlive) continue;
		if (flock[i].team == this.team) continue;
		if (flock[i].pos.minus(this.pos).length() <= this.attackRadius) {
			gameState.arrows.push(new Arrow(this, flock[i], this.strength));
			return;
		}
	}
}

function Arrow(owner, target, damage) {
	FlockPrite.call(this, 0, owner.pos.copy(), 32);
	this.setSprite(this.STANDBY, new Sprite(asset.images["asset/arrow.png"], 0, 0, 128, 128, 1, 100));
	this.target = target;
	this.owner = owner;
	this.startPoint = owner.pos.copy();
	this.destination = target.pos.copy();
	this.delta = 0;
	this.maxDelta = 20;
	this.damage = damage;
	this.orientation = getAngle(target.pos.minus(owner.pos));
}

Arrow.prototype = Object.create(FlockPrite.prototype);

Arrow.prototype.update = function() {
	if (!this.isAlive) return;
	this.delta++;
	this.pos = this.destination.minus(this.startPoint).times(this.delta/this.maxDelta).plus(this.startPoint);
	if (this.delta == this.maxDelta) {
		this.isAlive = false;
		this.target.receiveDamage(this.damage);
	}
}


function generateBlock() {
	var t = new Building(64, 0);
	t.setSprite(t.NORMAL, new Sprite(asset.images["asset/block.png"], 0, 0, 128, 128, 1, 1000));
	t.HAS_HEALTHPOINT = false;
	return t;
}

function generateFarm() {
	var t = new Building(64, 400);
	t.setSprite(t.NORMAL, new Sprite(asset.images["asset/rice_field.png"], 0, 0, 128, 128, 6, 200));
	t.team = 1;
	t.interactionType = t.EAT_TYPE;
	t.HAS_HEALTHPOINT = false;
	return t;
}

function generatePigRanch() {
	var t = new Building(128, 400);
	t.setSprite(t.NORMAL, new Sprite(asset.images["asset/pig_ranch.png"], 0, 0, 128, 128, 2, 100));
	t.team = 1;
	t.type = t.ATTACK_TYPE;
	return t;
}

function generateFence() {
	var t = new Building(64, 400);
	t.setSprite(t.NORMAL, new Sprite(asset.images["asset/fence.png"], 0, 0, 128, 128, 1, 100));
	t.team = 1;
	t.type = t.ATTACK_TYPE;
	t.activity = t.PASSIVE;
	t.HAS_HEALTHPOINT = false;
	return t;
}
