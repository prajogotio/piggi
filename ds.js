
function PriorityQueue(lessThanFn) {
	// minimum
	this.lessThan = lessThanFn;
	this.size = 0;
	this.root = null;
}

PriorityQueue.prototype.push = function(value) {
	if (this.root == null) {
		this.root = new PriorityQueueNode(value);
	} else {
		var parIdx = Math.floor((this.size+1)/2);
		var curnode = new PriorityQueueNode(value);
		var par = this.atIndex(parIdx);
		if (parIdx*2 == this.size+1) {
			par.setLeft(curnode);
		} else {
			par.setRight(curnode);
		}
		this.heapUp(curnode);
	}
	this.size++;
}

PriorityQueue.prototype.top = function() {
	if (this.size == 0) return null;
	return this.root.value;
}

PriorityQueue.prototype.pop = function() {
	var last = this.atIndex(this.size);

	if(this.size > 1){
		this.root.value = last.value;
		if (last.parent.left == last) {
			last.parent.left = null;
		} else {
			last.parent.right = null;
		}
		last.parent = null;
		this.heapDown(this.root);
	} else {
		this.root = null;
	}
	this.size--;
}

PriorityQueue.prototype.atIndex = function(idx) {
	if (idx > this.size) return null;
	var path = [];
	var k = idx;
	while(k>1) {
		var par = Math.floor(k/2);
		if (par*2 == k) {
			path.push('L');
		} else {
			path.push('R');
		}
		k = Math.floor(k/2);
	}
	var ret = this.root;
	for(var i = path.length-1; i>=0;--i){
		if (path[i] == 'L') {
			ret = ret.left;
		} else {
			ret = ret.right;
		}
	}
	return ret;
}

PriorityQueue.prototype.heapUp = function(node) {
	while (node.parent && !this.lessThan(node.parent.value, node.value)) {
		var tmp = node.value;
		node.value = node.parent.value;
		node.parent.value = tmp;
		node = node.parent;
	}
}

PriorityQueue.prototype.heapDown = function(node) {
	while (true) {
		var next = null;
		if (node.left && !this.lessThan(node.value, node.left.value)) {
			next = node.left;
		}

		if (node.right && !this.lessThan(node.value, node.right.value)) {
			if (!next || this.lessThan(node.right.value, next.value)) {
				next = node.right;
			}
		}

		if (!next) {
			return;
		}
		var tmp = next.value;
		next.value = node.value;
		node.value = tmp;

		node = next;
	}
}

function PriorityQueueNode(value) {
	this.value = value;
	this.left = null;
	this.right = null;
	this.parent = null;
}

PriorityQueueNode.prototype.setLeft = function(node) {
	this.left = node;
	node.parent = this;
}

PriorityQueueNode.prototype.setRight = function(node) {
	this.right = node;
	node.parent = this;
}