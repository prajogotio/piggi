
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
			for(var dr = -1; dr <= 1; ++dr) {
				for(var dc = -1; dc <= 1; ++dc) {
					resolveCollisionWithMap(flock[i], map, [mpos[0]+dr, mpos[1]+dc]);
				}
			}
		}
	}
}
