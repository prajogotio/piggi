document.addEventListener("DOMContentLoaded", function() {
	initializeApp();
});


var asset = {
	assetImageList : [
		"asset/pig_running.png", 
		"asset/pig_standby.png", 
		"asset/pig_angry.png", 
		"asset/pig_eating.png",
		"asset/pig_death.png",
		"asset/tower.png", 
		"asset/tower_death.png",
		"asset/rice_field.png", 
		"asset/rice_field_death.png",
		"asset/pig_ranch.png",
		"asset/pig_ranch_death.png",
		"asset/block.png", 
		"asset/fence.png",
		"asset/fence_death.png",
		"asset/arrow.png",
		"asset/arrow_death.png",
		"asset/throne.png",
		"asset/mouse.png",
		"asset/mouse_shadow.png",
		"asset/grass01.jpg", 
	],
	images : {},
	assetSoundList : [
	],
	sounds : {},
	loadedAssetCount : 0,
};

var COMMAND = {
	'BUILD_TOWER' : 0,
	'BUILD_FARM' : 1,
	'BUILD_PIG_RANCH' : 2,
	'BUILD_FENCE' : 3,
}

var gameState = {

};

var clientState = {
	camera : [0, 0],
	mouse : [0, 0],
	mouseImg : null,
	team : 0,
}

function initializeApp() {
	clientState.canvas = document.getElementById("canvas");
	clientState.g = clientState.canvas.getContext("2d");
	initializeAsset();
}

function initializeAsset() {
	for (var i = 0; i < asset.assetImageList.length; ++i) {
		var img = new Image();
		asset.images[asset.assetImageList[i]] = img;
		img.onload = function() {
			asset.loadedAssetCount++;
			assetProgressHandler();
		}
		img.src = asset.assetImageList[i];
	}
}

function assetProgressHandler() {
	if (asset.loadedAssetCount == asset.assetImageList.length + asset.assetSoundList.length) {
		allAssetsLoadedHandler();
	}
}

function allAssetsLoadedHandler() {
	clientState.mouseImg = asset.images["asset/mouse.png"];
	clientState.mouseShadowImg = asset.images["asset/mouse_shadow.png"];
	clientState.mouse[0] = clientState.canvas.width/2;
	clientState.mouse[1] = clientState.canvas.height/2;

	startGame();
}

function startGame() {
	// example game
	gameState = createNewGame(20, 32, "asset/grass01.jpg");
	gameState.thrones.push(new Throne(0, 0, 0), new Throne(30, 18, 1));

	registerEventHandler();
	gameState.scheduler = setInterval(function() {
		handleLocalCommand();
		updateGame();
		updateCamera();
		renderGame();
		gameState.timestep++;
	}, 1000/60);
}

function createNewGame(mapWidth, mapHeight, mapURI) {
	var state = {
		map : {
			width : mapWidth,
			height : mapHeight,
			data : new Int32Array(mapWidth*mapHeight).fill(1),
			entry : new Array(mapWidth*mapHeight).fill(null),
			imgBuffer : asset.images[mapURI],
			size : 64,
		},
		thrones : [],

		deadflocks : [],
		deadarrows : [],
		deadbuildings : [],

		flocks : [],
		buildings : [],
		arrows : [],

		timestep : 0,
		localCommandLog : [],
	}
	return state;
}

function updateCamera() {
	var mouse = clientState.mouse;
	var camera = clientState.camera;

	var dM = 10;
	var margin = 4;
	if (mouse[0] <= margin) {
		camera[0] -= dM;
	}
	if (mouse[0] >= canvas.width-margin-32) {
		camera[0] += dM;
	}
	if (mouse[1] <= margin) {
		camera[1] -= dM;
	}
	if (mouse[1] >= canvas.height-margin-32) {
		camera[1] += dM;
	}

	if (camera[0] < 0) camera[0] = 0;
	if (camera[1] < 0) camera[1] = 0;
	camera[0] = Math.min(camera[0], gameState.map.size*gameState.map.width-clientState.canvas.width);
	camera[1] = Math.min(camera[1], gameState.map.size*gameState.map.height-clientState.canvas.height);
}

function renderGame() {
	var g = clientState.g;
	var camera = clientState.camera;
	var canvas = clientState.canvas;
	var map = gameState.map;

	g.clearRect(0, 0, canvas.width, canvas.height);

	// render map
	g.drawImage(map.imgBuffer,
		Math.max(0,camera[0]),
		Math.max(0,camera[1]),
		Math.min(canvas.width, camera[0]+canvas.width), 
		Math.min(canvas.height, camera[1]+canvas.height),
		Math.max(0,-camera[0]),
		Math.max(0,-camera[1]),
		Math.min(canvas.width, camera[0]+canvas.width), 
		Math.min(canvas.height, camera[1]+canvas.height));
	g.save();
	g.translate(-camera[0], -camera[1]);
	

	// render the rest
	var all = [gameState.thrones, gameState.deadbuildings, gameState.buildings, gameState.deadflocks, gameState.deadarrows, gameState.flocks, gameState.arrows];

	for(var i = 0; i < all.length; ++i) {
		for(var j = 0; j < all[i].length; ++j){
			all[i][j].render(g);
		}
	}

	g.restore();


	stateDependentRendering(g);

	drawMouse(g);
}

function drawMouse(g) {
	g.save();
	g.translate(clientState.mouse[0], clientState.mouse[1]);
	g.save();
	g.globalAlpha = 0.2;
	g.drawImage(clientState.mouseShadowImg, 0, 0, 128, 128, 3, 10, 30, 30);
	g.restore();
	g.drawImage(clientState.mouseImg, 0, 0, 128, 128, 0, 0, 32, 32);
	g.restore();
}

function stateDependentRendering(g) {
	if (clientState.state == 'BUILDING') {
		var pos = computeMapLocation(clientState.mouse[0]+clientState.camera[0],clientState.mouse[1]+clientState.camera[1]);
		g.save();
		g.fillStyle = (isLandOccupied(pos[0],pos[1],clientState.buildingSize) ? "red":"green");
		g.globalAlpha = 0.5;
		g.fillRect(pos[1]*gameState.map.size-clientState.camera[0],pos[0]*gameState.map.size-clientState.camera[1],clientState.buildingSize*gameState.map.size,clientState.buildingSize*gameState.map.size);
		g.restore();
	}
}

function updateGame() {

	var all = [gameState.deadbuildings, gameState.deadflocks, gameState.deadarrows, gameState.flocks, gameState.buildings, gameState.arrows];

	for(var i = 0; i < all.length; ++i) {
		for(var j = 0; j < all[i].length; ++j){
			all[i][j].update(gameState.flocks, gameState.map);
		}
	}

	garbageCollection();

}


function garbageCollection() {
	// remove garbage collectible death
	var tmp = [];
	for(var i = 0; i < gameState.deadflocks.length; ++i) {
		if (!gameState.deadflocks[i].garbageCollectible()) {
			tmp.push(gameState.deadflocks[i]);
		} else {
			gameState.deadflocks[i].cleanUp(gameState.flocks, gameState.map);
		}
	}
	gameState.deadflocks = tmp;

	tmp = [];
	for(var i = 0; i < gameState.deadarrows.length; ++i) {
		if (!gameState.deadarrows[i].garbageCollectible()) {
			tmp.push(gameState.deadarrows[i]);
		} else {
			gameState.deadarrows[i].cleanUp(gameState.flocks, gameState.map);
		}
	}
	gameState.deadarrows = tmp;

	tmp = [];
	for(var i = 0; i < gameState.deadbuildings.length; ++i) {
		if (!gameState.deadbuildings[i].garbageCollectible()) {
			tmp.push(gameState.deadbuildings[i]);
		} else {
			gameState.deadbuildings[i].cleanUp(gameState.flocks, gameState.map);
		}
	}
	gameState.deadbuildings = tmp;




	// collect death
	tmp = [];
	for(var i = 0; i < gameState.flocks.length; ++i) {
		if (gameState.flocks[i].isAlive) {
			tmp.push(gameState.flocks[i]);
		} else {
			gameState.deadflocks.push(gameState.flocks[i]);
		}
	}
	gameState.flocks = tmp;

	tmp = [];
	for(var i = 0; i < gameState.arrows.length; ++i) {
		if (gameState.arrows[i].isAlive) {
			tmp.push(gameState.arrows[i]);
		} else {
			gameState.deadarrows.push(gameState.arrows[i]);
		}
	}
	gameState.arrows = tmp;

	tmp = [];
	for(var i = 0; i < gameState.buildings.length; ++i) {
		if (gameState.buildings[i].isAlive) {
			tmp.push(gameState.buildings[i]);
		} else {
			gameState.deadbuildings.push(gameState.buildings[i]);
		}
	}
	gameState.buildings = tmp;
}


function registerEventHandler() {
	var camera = clientState.camera;
	var canvas = clientState.canvas;
	var map = gameState.map;


	canvas.addEventListener("mousedown", function(e) {
		if(!checkIfPointerLocked()){
			// Pointer Lock
			canvas.requestPointerLock = canvas.requestPointerLock ||
					     canvas.mozRequestPointerLock ||
					     canvas.webkitRequestPointerLock;
			// Ask the browser to lock the pointer
			canvas.requestPointerLock();
		}
		mouseDownCallback(e);
	});

	document.addEventListener('keydown', function(e) {
		// Ask the browser to release the pointer
		// document.exitPointerLock = document.exitPointerLock ||
		// 		   document.mozExitPointerLock ||
		// 		   document.webkitExitPointerLock;
		// document.exitPointerLock();
		keyDownHandler(e);
	});

	// Hook pointer lock state change events
	document.addEventListener('pointerlockchange', changeCallback, false);
	document.addEventListener('mozpointerlockchange', changeCallback, false);
	document.addEventListener('webkitpointerlockchange', changeCallback, false);


	function changeCallback() {
		if (checkIfPointerLocked()) {
		  // Pointer was just locked
		  // Enable the mousemove listener
		  document.addEventListener("mousemove", moveCallback, false);
		  clientState.mouse = [canvas.width/2, canvas.height/2];
		} else {
		  // Pointer was just unlocked
		  // Disable the mousemove listener
		  document.removeEventListener("mousemove", moveCallback, false);
		}
	}

	function moveCallback(e) {
		var mouse = clientState.mouse;
		var camera = clientState.camera;

	  	var movementX = e.movementX;
		movementY = e.movementY;

		mouse[0] = Math.min(Math.max(0, mouse[0] + movementX*1.2), canvas.width-32);
		mouse[1] = Math.min(Math.max(0, mouse[1] + movementY*1.2), canvas.height-32);
		
	}

	function mouseDownCallback(e) {
		var x = clientState.mouse[0]+clientState.camera[0];
		var y = clientState.mouse[1]+clientState.camera[1];
		if (clientState.state == 'BUILDING') {
			var pos = computeMapLocation(x, y);
			if (!isLandOccupied(pos[0], pos[1], clientState.buildingSize)) {
				clientState.state = 'NONE';
				issueCommand(clientState.currentCommand, [pos[0], pos[1], clientState.team]);
			}
		}
	}

	function keyDownHandler(e) {
		var x = clientState.mouse[0]+clientState.camera[0];
		var y = clientState.mouse[1]+clientState.camera[1];
		

		if (e.which == 84) {
			// 'T'
			// generate tower
			clientState.state = 'BUILDING';
			clientState.currentCommand = COMMAND.BUILD_TOWER;
			clientState.buildingSize = 2;
		}

		else if (e.which == 70) {
			// 'F'
			// generate farm
			clientState.state = 'BUILDING';
			clientState.currentCommand = COMMAND.BUILD_FARM;
			clientState.buildingSize = 1;
		}

		else if (e.which == 69) {
			// 'E'
			// generate fence
			clientState.state = 'BUILDING';
			clientState.currentCommand = COMMAND.BUILD_FENCE;
			clientState.buildingSize = 1;
		}

		else if (e.which == 82) {
			// 'R'
			// generate ranch
			clientState.state = 'BUILDING';
			clientState.currentCommand = COMMAND.BUILD_PIG_RANCH;
			clientState.buildingSize = 2;
		}

		else if (e.which == 81) {
			// 'Q'
			clientState.state = 'NONE';
		}


		else if (e.which == 65) {
			// HELPER, REMOVE LATER
			// generate pig
			gameState.flocks.push(new Pig(new Vec2(x,y), clientState.team));
		}


		else if (e.which == 13) {
			// HELPER, REMOVE LATER
			clientState.team++;
			clientState.team %= 2;
		}
	}
	

	function checkIfPointerLocked() {
		return document.pointerLockElement === canvas ||
		  document.mozPointerLockElement === canvas ||
		  document.webkitPointerLockElement === canvas;
	}
}

function isLandOccupied(row, col, size) {
	// is there building
	for(var i = 0; i < size; ++i){
		for (var j = 0; j < size; ++j){
			if (gameState.map.entry[(row+i)*gameState.map.width+(col+j)]) {
				return true;
			}
		}
	}
	// is there flocks
	for(var i = 0; i < gameState.flocks.length; ++i) {
		for(var dr = 0; dr < size; ++dr){
			for(var dc = 0; dc < size; ++dc) {
				if (gameState.flocks[i].collidesWithCell(gameState.map, [row+dr, col+dc])) return true;
			}
		}
	}
	return false;
}

function computeMapLocation(x, y) {
	return [Math.floor(y/gameState.map.size), Math.floor(x/gameState.map.size)];
}

function issueCommand(type, params) {
	gameState.localCommandLog.push([gameState.timestep, type, params]);
}

function executeCommand(c) {
	var timestep = c[0];
	var type = c[1];
	var params = c[2];
	if (type == COMMAND.BUILD_TOWER) {
		gameState.buildings.push(new Tower(params[0], params[1], params[2]));
	}
	else if (type == COMMAND.BUILD_FARM) {
		gameState.buildings.push(new Farm(params[0], params[1], params[2]));
	}
	else if (type == COMMAND.BUILD_FENCE) {
		gameState.buildings.push(new Fence(params[0], params[1], params[2]));
	}
	else if (type == COMMAND.BUILD_PIG_RANCH) {
		gameState.buildings.push(new PigRanch(params[0], params[1], params[2]));
	}
}

function handleLocalCommand() {
	var localLog = gameState.localCommandLog;
	for (var i = 0; i < localLog.length; ++i) {
		if (localLog[i][0] < gameState.timestep) {
			continue;
		}
		executeCommand(localLog[i]);
	}
}