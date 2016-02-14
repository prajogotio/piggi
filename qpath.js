// Let's do tile based path finding first
// resources: http://aigamedev.com/open/tutorials/clearance-based-pathfinding/

var map = {
	data:[],
	width:0,
	height:0
}

function findPath(start, target, map, otherTargets) {
	// grid map
	// A* Search 
	if (start[0] < 0 || start[1] < 0 || start[0] >= map.height || start[1] >= map.width
	|| target[0] < 0 || target[1] < 0 || target[0] >= map.height || target[1] >= map.width) return [];
	
	// sanitising otherTargets
	if (otherTargets) {
		var tmp = [];
		for (var i = 0; i < otherTargets.length; ++i) {
			if (map.data[otherTargets[i][0]*map.width+otherTargets[i][1]] != 0) {
				tmp.push(otherTargets[i]);
			}
		}
		otherTargets = tmp;
	}


	var mark = new Int32Array(map.data.length);
	var par = new Int32Array(map.data.length).fill(-1);
	var lsf = function(L, R) {
		return L.cost < R.cost;
	}
	var pq = new PriorityQueue(lsf);
	mark[map.width*start.row+start.col] = 1;
	pq.push({cost:0, dist:0, par:-1, pos:start});

	function insertPQ(row, col, dr, dc, dist) {
		var currow = row+dr;
		var curcol = col+dc;
		if (currow < 0 || curcol < 0 || currow >= map.height || curcol >= map.width) return;
		var idx = currow*map.width+curcol;
		var curcost = Math.abs(target[0]-currow)+Math.abs(target[1]-curcol);
		if (otherTargets) {
			for (var i = 0; i < otherTargets.length; ++i) {
				var possible = Math.abs(otherTargets[i][0]-currow)+Math.abs(otherTargets[i][1]-curcol);
				if (possible < curcost) {
					curcost = possible;
				}
			}
		}
		if (mark[idx] > 0) return;
		if (map.data[idx] == 0) return;
		pq.push({cost:dist+1+curcost, par:row*map.width+col, dist:dist+1, pos:[currow, curcol]});
	}
	var loc = -1;
	var distToTarget = 1e9;
	while (pq.size > 0) {
		var cur = pq.top();
		pq.pop();
		var row = cur.pos[0];
		var col = cur.pos[1];
		var dist = cur.dist;
		var idx = row*map.width+col;
		if (mark[idx]) {
			continue;
		}
		mark[idx] = 1;
		par[idx] = cur.par;
		var curDistToTarget = Math.abs(target[0]-row)+Math.abs(target[1]-col);
		if (distToTarget >= curDistToTarget) {
			distToTarget = curDistToTarget;
			loc = idx;
		}
		if (row==target[0] && col==target[1]) {
			loc = idx;
			break;
		}
		if (otherTargets) {
			var found = false;
			for (var i = 0; i < otherTargets.length; ++i) {
				if (otherTargets[i][0] == row && otherTargets[i][1] == col) {
					loc = idx;
					found = true;
					break;
				}
			}
			if (found) break;
		}
		insertPQ(row, col, -1, 0, dist);
		insertPQ(row, col, 1, 0, dist);
		insertPQ(row, col, 0, -1, dist);
		insertPQ(row, col, 0, 1, dist);
	}
	var ret = [];
	if (loc != -1) {
		while(loc != -1) {
			var row = Math.floor(loc/map.width);
			var col = loc-row*map.width;
			ret.push([row, col]);
			loc = par[loc];
		}
	}
	return ret;
}

function compressPath(path) {
	var cppath = [];
	cppath.push(path[0]);
	var prev = cppath[0];
	for(var i = 1; i < path.length-1; ++i){
		if (prev[0] != path[i][0] && prev[1] != path[i][1]) {
			cppath.push(path[i-1]);
			prev = path[i-1];
		}
	}
	cppath.push(path[path.length-1]);
	return cppath;
}

function transformPathToVec2D(path, map) {
	var cppath = [];
	for (var i = 0; i < path.length; ++i) {
		cppath.push(new Vec2((path[i][1]+0.5)*map.size,(path[i][0]+0.5)*map.size));
	}
	return cppath;
}