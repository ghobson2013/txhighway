"use strict";

/* create variables */
const socketCash = io("https://cashexplorer.bitcoin.com/");
const socketCore = io("https://insight.bitpay.com/");
const blockchairCashUrl = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin-cash/mempool/";
const blockchairCoreUrl = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin/mempool/";

// DOM elements
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const cashPoolInfo = document.getElementById("cash-pool");
const corePoolInfo = document.getElementById("core-pool");

canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;

// *** sprites ****
const carCore = new Image();
const carSmallCash = new Image();
const carMediumCash = new Image();
const carLargeCash = new Image();
const carXLargeCash = new Image();
const carWhaleCash = new Image();

const carSmallCore = new Image();
const carMediumCore = new Image();
const carLargeCore = new Image();
const carXLargeCore = new Image();
const carWhaleCore = new Image();

const carLambo = new Image();

//cash vehicles
carSmallCash.src = "assets/sprites/bch-small.png";
carMediumCash.src = "assets/sprites/bch-medium.png";
carLargeCash.src = "assets/sprites/bch-large.png";
carXLargeCash.src = "assets/sprites/bch-xlarge.png";
carWhaleCash.src = "assets/sprites/bch-whale.png";
carLambo.src = "assets/sprites/lambo.png";

//core vehicles
carSmallCore.src = "assets/sprites/core-small.png";
carMediumCore.src = "assets/sprites/core-medium.png";
carLargeCore.src = "assets/sprites/core-xlarge.png";
carXLargeCore.src = "assets/sprites/core-large.png";
carWhaleCore.src = "assets/sprites/core-whale.png";

// constants
let WIDTH = canvas.width;
let HEIGHT = canvas.height;
let SINGLE_LANE = HEIGHT/14;

const SSPEED = 8;
const CSPEED = 12;

// arrays
let txCash = [];
let txCore = []

//setInterval(update,1000/60);

/* connect to socket */
socketCash.on("connect", function () {
	socketCash.emit("subscribe", "inv");
});

socketCore.on("connect", function () {
	socketCore.emit("subscribe", "inv");
});

socketCash.on("tx", function(data){
	newTX("cash", data);
	console.log("cash tx");
});

socketCore.on("tx", function(data){
	newTX("core", data);
	console.log("core tx");
});

socketCash.on("block", function(data){
	getPoolData(blockchairCashUrl, xhrCash, true);	
});

socketCore.on("block", function(data){
	getPoolData(blockchairCoreUrl, xhrCore, true);	
});
/* End connect to socket */


/* get new cash mempool data */
let xhrCash = new XMLHttpRequest();
let xhrCore = new XMLHttpRequest();

getPoolData(blockchairCashUrl, xhrCash, true);
getPoolData(blockchairCoreUrl, xhrCore, false);

function getPoolData(url, xhr, isCash){
	xhr.open('GET', url, true);
	xhr.send();
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(this.responseText);
			let info = JSON.parse(obj.body);
			info.data.forEach((key)=>{
				if (key.e =="mempool_transactions"){
					if (isCash){
						cashPoolInfo.textContent = key.c;
					} else {
						corePoolInfo.textContent = key.c;
					}
				}
			});
		}
	}
}
/* end get new mempool data*/

/* resize the window */
function resize(){
	let height = window.innerHeight;
	let ratio = canvas.width/canvas.height;
	let width = height * ratio;

	canvas.style.width = width + "px";
	canvas.style.height = height + "px";
}

window.addEventListener("load", resize, false);
window.addEventListener("resize", resize, false);
/* end resize the window */


/* new transaction is made */
function newTX(type, txInfo){
	let lane = SINGLE_LANE;
	let x = -150
	
	if (type == "cash"){
		let randLane = Math.floor(Math.random() * 8) + 1;
		lane *= randLane;
		lane -= SINGLE_LANE;

		createVehicle(type, txCash, txInfo, x, lane, true);

	} else {
		lane *= 10;
		lane = lane - SINGLE_LANE;

		let car = getCar(txInfo.valueOut, false, false);
		let width = SINGLE_LANE * (car.width / car.height);

		// calculate distance between vehicles
		if (txCore.length > 0){
			let last = txCore[txCore.length - 1];
			//let w = SINGLE_LANE * car.height / car.width;
			let front = width + x;
			if (front >= last.x){
				x = last.x - width - 10;
			}
		}

		createVehicle(type, txCore, txInfo, x, lane, false);

	}
}

/* create vehicles and push to appropriate array */
function createVehicle(type, arr, txInfo, x, lane, isCash){
	let car = getCar(txInfo.valueOut, checkForDonation(txInfo), isCash);
	let height = SINGLE_LANE;
	let width = height * (car.width / car.height);
	let y = lane;
	
	arr.push({
		type:type,
		id: txInfo.txid,
		x: x,
		y: y,
		h: height,
		w: width,
		valueOut: txInfo.valueOut,
		donation: checkForDonation(txInfo),
		isCash: isCash
	});
}

/* end new transaction */

/* return car based upon transaction size*/
function getCar(valueOut, donation, isCash){

	//console.log(valueOut);
	if (donation){
		return carLambo;
	}

	if (valueOut <= 5){
		if (isCash){
			return carSmallCash;
		} else {
			return carSmallCore;
		}
	} else if (valueOut > 5 && valueOut <= 10){
		if (isCash){
			return carMediumCash;
		} else {
			return carMediumCore;
		}
	} else if (valueOut > 10 && valueOut <= 15){
		if (isCash){
			return carLargeCash;
		} else {
			return carLargeCore;
		}
	} else if (valueOut > 15 && valueOut <= 25){
		if (isCash){
			return carXLargeCash;
		} else {
			return carXLargeCore;
		}
	} else if (valueOut > 25){
		if (isCash){
			return carWhaleCash;
		} else {
			return carWhaleCore;
		}
	}
}
/* end return car */

/* check for donations into the BCF*/
function checkForDonation(txInfo){
	let vouts = txInfo.vout;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=> {
			if (k == "3ECKq7onkjnRQR2nNe5uUJp2yMsXRmZavC"){
				console.log("Donation to BCF");
				return true;
			}
		});
	});

	return false;
}
/* end check for donations */

function drawBackground(){
	// draw the lanes
	ctx.clearRect(0,0,WIDTH,HEIGHT);
	ctx.fillStyle = "#9EA0A3";

	// dash style
	ctx.setLineDash([6]);
	ctx.strokeStyle = "#FFF";

	// stroke
	ctx.strokeRect(-2, SINGLE_LANE * 1, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 3, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 5, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 7, WIDTH + 3, SINGLE_LANE);

	ctx.setLineDash([0]);
	ctx.strokeStyle = "#3F3B3C";
	ctx.strokeRect(-2, SINGLE_LANE * 8, WIDTH + 3, SINGLE_LANE);

	ctx.setLineDash([6]);
	ctx.strokeStyle = "#FFF";
	ctx.strokeRect(-2, SINGLE_LANE * 10, WIDTH + 3, SINGLE_LANE);
}

function drawVehicles(){
	// loop through transactions and draw them
	txCash.forEach (function(item, index, object){
		item.x += CSPEED;
		ctx.drawImage(getCar(item.valueOut, item.donation, item.isCash), item.x, item.y, item.w, item.h);
	});

	txCore.forEach(function(item, index, object){
		item.x += SSPEED;
		ctx.drawImage(getCar(item.valueOut, item.donation, item.isCash), item.x, item.y , item.w, item.h);

	});
}


function removeVehicles(){
	// loops through transactions again and removes ones that are off the screen
	txCash.forEach(function(item, index, object){
		if (item.x > WIDTH + 100){
			object.splice(index, 1);
			let t = parseInt(cashPoolInfo.textContent);
			cashPoolInfo.textContent = t + 1;
		}
	});

	// loops through transactions again and removes ones that are off the screen
	txCore.forEach(function(item, index, object){
		if (item.x > WIDTH + 100){
			object.splice(index, 1);
			let t = parseInt(corePoolInfo.textContent);
			corePoolInfo.textContent = t + 1;
		}
	});
}

/* animate everything */
let requestID = requestAnimationFrame(animate);

function animate(){
	requestID = requestAnimationFrame(animate);
	drawBackground();
	drawVehicles();
	removeVehicles();
}