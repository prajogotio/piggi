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
		"asset/boar_running.png", 
		"asset/boar_standby.png", 
		"asset/boar_attacking.png", 
		"asset/boar_eating.png",
		"asset/boar_death.png",
		"asset/tower.png", 
		"asset/tower_death.png",
		"asset/castle.png",
		"asset/castle_death.png",
		"asset/rice_field.png", 
		"asset/rice_field_death.png",
		"asset/super_rice_field.png",
		"asset/pig_ranch.png",
		"asset/pig_ranch_death.png",
		"asset/pig_hq.png",
		"asset/pig_hq_death.png",
		"asset/block.png", 
		"asset/fence.png",
		"asset/super_fence.png",
		"asset/fence_death.png",
		"asset/arrow.png",
		"asset/arrow_death.png",
		"asset/javelin.png",
		"asset/javelin_death.png",
		"asset/throne.png",
		"asset/mouse.png",
		"asset/mouse_shadow.png",
		"asset/tower_icon.png",
		"asset/ranch_icon.png",
		"asset/farm_icon.png",
		"asset/fence_icon.png",
		"asset/upgrade_icon.png",
		"asset/castle_icon.png",
		"asset/pighq_icon.png",
		"asset/wall_icon.png",
		"asset/farm_icon.png",
		"asset/garden_icon.png",
		"asset/deselect_icon.png",
		"asset/pig_coin.png",
		"asset/numbers.png",
		"asset/locked_icon.png",
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
	'UPGRADE_TOWER' : 4,
	'UPGRADE_PIG_RANCH' : 5,
	'BUY' : 6,
	'DESELECT': 7,
	'BUILD_CASTLE' : 8,
	'BUILD_GARDEN' : 9,
	'BUILD_PIG_HQ' : 10,
	'BUILD_WALL' : 11,
}

var PRICES = {
	'BUILD_TOWER' : 50,
	'BUILD_FARM' : 5,
	'BUILD_PIG_RANCH' : 30,
	'BUILD_FENCE' : 1,
	'UPGRADE_TOWER' : 600,
	'UPGRADE_PIG_RANCH' : 800,
	'BUILD_CASTLE' : 240,
	'BUILD_GARDEN' : 35,
	'BUILD_PIG_HQ' : 220,
	'BUILD_WALL' : 40,
}

var CONSTANTS = {
	BACKGROUND_MONEY_RATE : 300, // timesteps per 1 coin
}

var gameState = {

};

var clientState = {
	camera : [0, 0],
	mouse : [0, 0],
	mouseImg : null,
	team : 0,
	menuBar : null,
	gameEventHandlerResetFunction : null,
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
		img.onload = (function(name) {
			return function() {
				asset.loadedAssetCount++;
				// create an overlay for team B
				var b = document.createElement('canvas');
				b.width=asset.images[name].width;
				b.height=asset.images[name].height;
				var bg = b.getContext('2d');
				bg.drawImage(asset.images[name], 0, 0, asset.images[name].width, asset.images[name].height, 0, 0, asset.images[name].width, asset.images[name].height);
				bg.save();
				bg.globalCompositeOperation = "source-atop";
				bg.fillStyle = "rgba(255,190,72,0.25)";
				bg.fillRect(0,0,b.width,b.height);
				bg.restore();
				asset.images[name+'/b'] = b;
				assetProgressHandler();
			}
		})(asset.assetImageList[i]);
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

	registerAppEventHandler();

	startGame();
}

function startGame() {
	// example game
	gameState = createNewGame(20, 32, "asset/grass01.jpg");
	gameState.thrones.push(new Throne(0, 0, 0), new Throne(30, 18, 1));

	clientState.menuBar = new MenuBar();

	clientState.gameEventHandlerResetFunction = registerGameEventHandler();
	gameState.scheduler = setInterval(function() {
		// game routine
		handleLocalCommand();
		updateGame();
		updateCamera();
		renderGame();

		renderMenuBar();
		drawMouse();

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
			lastUpdated : 0,
		},
		

		deadflocks : [],
		deadarrows : [],
		deadbuildings : [],

		flocks : [],
		buildings : [],
		arrows : [],

		timestep : 0,
		localCommandLog : [],

		// team information
		thrones : [],
		ranchTier : [1, 1],
		towerTier : [1, 1],
		coins : [10, 10],
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

	// for (var i = 0; i < gameState.flocks.length; ++i) {
	// 	if(gameState.flocks[i].lockOnTarget) {
	// 		g.fillStyle = "red";
	// 		g.fillRect(gameState.flocks[i].lockOnTarget.pos.x,gameState.flocks[i].lockOnTarget.pos.y, 10, 10);
	// 		for (var j=0;j<gameState.flocks[i].targetStack.length;++j){
	// 			g.fillStyle = "orange";
	// 			g.fillRect(gameState.flocks[i].targetStack[j].x, gameState.flocks[i].targetStack[j].y, 8, 8);
	// 		}
	// 	}
	// }

	g.restore();


	stateDependentRendering(g);

}

function drawMouse() {
	var g = clientState.g;
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
	if (gameState.timestep % CONSTANTS.BACKGROUND_MONEY_RATE == 0) {
		for (var i = 0; i < gameState.coins.length; ++i) {
			gameState.coins[i] += 1;
		}
	}

	var all = [gameState.deadbuildings, gameState.deadflocks, gameState.deadarrows, gameState.flocks, gameState.buildings, gameState.arrows];

	for(var i = 0; i < all.length; ++i) {
		for(var j = 0; j < all[i].length; ++j){
			all[i][j].update(gameState.flocks, gameState.map);
		}
	}

	garbageCollection();

	gameState.timestep++;
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


function registerAppEventHandler() {
	var camera = clientState.camera;
	var canvas = clientState.canvas;
	var map = gameState.map;

	document.addEventListener("mousedown", mouseDownCallback);

	// Hook pointer lock state change events
	document.addEventListener('pointerlockchange', changeCallback, false);
	document.addEventListener('mozpointerlockchange', changeCallback, false);
	document.addEventListener('webkitpointerlockchange', changeCallback, false);

	function checkIfPointerLocked() {
		return document.pointerLockElement === canvas ||
		  document.mozPointerLockElement === canvas ||
		  document.webkitPointerLockElement === canvas;
	}

	function changeCallback() {
		if(!checkIfPointerLocked()){
			// Pointer Lock
			canvas.requestPointerLock = canvas.requestPointerLock ||
					     canvas.mozRequestPointerLock ||
					     canvas.webkitRequestPointerLock;
			// Ask the browser to lock the pointer
			canvas.requestPointerLock();
		}
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
		if(!checkIfPointerLocked()){
			// Pointer Lock
			canvas.requestPointerLock = canvas.requestPointerLock ||
					     canvas.mozRequestPointerLock ||
					     canvas.webkitRequestPointerLock;
			// Ask the browser to lock the pointer
			canvas.requestPointerLock();
		}
	}

}


function registerGameEventHandler() {
	var camera = clientState.camera;
	var canvas = clientState.canvas;
	var map = gameState.map;

	canvas.addEventListener("mousedown", mouseDownCallback);
	document.addEventListener('keydown', keyDownHandler);
	
	function mouseDownCallback(e) {
		// world x, y
		var x = clientState.mouse[0]+clientState.camera[0];
		var y = clientState.mouse[1]+clientState.camera[1];

		// screen x, y
		var sx = clientState.mouse[0];
		var sy = clientState.mouse[1];
		if (e.buttons == 1) {
			// LEFTCLICK
			
			// trap event if click is on menubar
			if (clientState.menuBar.containsPoint(sx, sy)) {
				clientState.menuBar.onclick(sx, sy);
				return;
			}


			if (clientState.state == 'BUILDING') {
				// commit building
				var pos = computeMapLocation(x, y);
				if (!isLandOccupied(pos[0], pos[1], clientState.buildingSize)) {
					clientState.state = 'NONE';
					issueCommand(clientState.currentCommand, [pos[0], pos[1], clientState.team]);
				}
				clientState.menuBar.reset();
			}
		}
		else if (e.buttons == 2) {
			// RIGHT CLICK
			if (clientState.state == 'BUILDING') {
				// cancel 
				clientState.menuBar.deselect.onclick();
			}
		}
	}

	function keyDownHandler(e) {
		var x = clientState.mouse[0]+clientState.camera[0];
		var y = clientState.mouse[1]+clientState.camera[1];
		
		
		if (e.which == 84) {
			// 'T'
			// generate tower
			// clientState.state = 'BUILDING';
			// clientState.currentCommand = COMMAND.BUILD_TOWER;
			// clientState.buildingSize = 2;
			clientState.menuBar.tower.onclick();
		}

		else if (e.which == 65) {
			// 'A'
			// generate farm
			// clientState.state = 'BUILDING';
			// clientState.currentCommand = COMMAND.BUILD_FARM;
			// clientState.buildingSize = 1;
			clientState.menuBar.farm.onclick();
		}

		else if (e.which == 70) {
			// 'F'
			// generate fence
			// clientState.state = 'BUILDING';
			// clientState.currentCommand = COMMAND.BUILD_FENCE;
			// clientState.buildingSize = 1;
			clientState.menuBar.fence.onclick();
		}

		else if (e.which == 82) {
			// 'R'
			// generate ranch
			// clientState.state = 'BUILDING';
			// clientState.currentCommand = COMMAND.BUILD_PIG_RANCH;
			// clientState.buildingSize = 2;
			clientState.menuBar.ranch.onclick();
		}

		else if (e.which == 67) {
			// 'C'
			// castle
			clientState.menuBar.castle.onclick();
		}

		else if (e.which == 72) {
			// 'H'
			clientState.menuBar.pighq.onclick();
		}

		else if (e.which == 71) {
			// 'G'
			clientState.menuBar.garden.onclick();
		}

		else if (e.which == 87) {
			// 'W'
			clientState.menuBar.wall.onclick();
		}

		else if (e.which == 85) {
			// 'U'
			// upgrade state
			// clientState.state = 'UPGRADE';
			clientState.menuBar.upgrade.onclick();
		}

		else if (e.which == 68) {
			// 'Q'
			clientState.menuBar.deselect.onclick();
		}


		else if (e.which == 66) {
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
	

	

	return function removeAllGameEventListener() {
		document.removeEventListener("mousedown", mouseDownCallback);
		document.removeEventListener("keydown", keyDownHandler);
	}
}

function isLandOccupied(row, col, size) {
	// is there building
	for(var i = 0; i < size; ++i){
		for (var j = 0; j < size; ++j){
			if (row+i < 0 || col+j < 0 || row+i >= gameState.map.height || col+j >= gameState.map.width) return true;
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
		// params[0] row
		// params[1] col
		// params[2] team info
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

	else if (type == COMMAND.BUILD_CASTLE) {
		gameState.buildings.push(new Castle(params[0], params[1], params[2]));
	}
	else if (type == COMMAND.BUILD_GARDEN) {
		gameState.buildings.push(new Garden(params[0], params[1], params[2]));
	}
	else if (type == COMMAND.BUILD_WALL) {
		gameState.buildings.push(new Wall(params[0], params[1], params[2]));
	}
	else if (type == COMMAND.BUILD_PIG_HQ) {
		gameState.buildings.push(new PigHQ(params[0], params[1], params[2]));
	}

	else if (type == COMMAND.UPGRADE_PIG_RANCH) {
		// effect: pig upgraded
		// ranch : upgraded
		// farm : upgraded
		// can only upgrade once
		// params[0] is team info
		if (gameState.ranchTier[params[0]] == 2) return;
		if (gameState.coins[params[0]] < PRICES.UPGRADE_PIG_RANCH) return;
		gameState.coins[params[0]] -= PRICES.UPGRADE_PIG_RANCH;
		gameState.ranchTier[params[0]] = 2;

	}

	else if (type == COMMAND.UPGRADE_TOWER) {
		// fence : upgraded
		// tower : upgraded
		// can only upgrade once
		// params[0] is team info
		if (gameState.towerTier[params[0]] == 2) return;
		if (gameState.coins[params[0]] < PRICES.UPGRADE_TOWER) return;
		gameState.coins[params[0]] -= PRICES.UPGRADE_TOWER;
		gameState.towerTier[params[0]] = 2;

	} 

	else if (type == COMMAND.BUY) {
		// params[0] : team info
		// params[1] : command type (BUILD_...)
		// params[2] : price to lock
		// params[3] : building size
		var team = params[0];
		var buildCmd = params[1];
		var price = params[2];
		if (gameState.coins[team] >= price) {
			gameState.coins[team] -= price;

			if (isClientInTeam(team)){
				clientState.currentCommand = buildCmd;
				clientState.state = 'BUILDING';
				clientState.buildingSize = params[3];
			}
		}
	}

	else if (type == COMMAND.DESELECT) {
		// params[0] : team info
		// params[1] : price to release
		gameState.coins[params[0]] += params[1];
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



function renderMenuBar() {
	clientState.menuBar.render(clientState.g);
}

function isClientInTeam(team) {
	return clientState.team == team;
}
