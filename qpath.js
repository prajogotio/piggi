// Let's do tile based path finding first
// resources: http://aigamedev.com/open/tutorials/clearance-based-pathfinding/

var map = {
	data:[],
	width:0,
	height:0
}

function findPath(start, target, map) {
	// grid map
	// A* Search 
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
		if (mark[idx] > 0) return;
		if (map[idx] == 0) return;
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
		if (distToTarget > curDistToTarget) {
			distToTarget = curDistToTarget;
			loc = idx;
		}
		if (row==target[0] && col==target[1]) {
			loc = idx;
			break;
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