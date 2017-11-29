"use strict";

/* create variables */
const socketCash = io("https://cashexplorer.bitcoin.com/");
const socketCore = io("https://insight.bitpay.com/");
const cashXHR = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin-cash/mempool/";
const coreXHR = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin/mempool/";

// DOM elements
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const cashPoolInfo = document.getElementById("cash-pool");
const corePoolInfo = document.getElementById("core-pool");

canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;

// *** sprites ****
const carCore = new Image();
const carSmall = new Image();
const carMedium = new Image();
const carLarge = new Image();
const carXLarge = new Image();
const carWhale = new Image();
const carLambo = new Image();

carCore.src = "assets/sprites/core-small.png";
carSmall.src = "assets/sprites/bch-small.png";
carMedium.src = "assets/sprites/bch-medium.png";
carLarge.src = "assets/sprites/bch-large.png";
carXLarge.src = "assets/sprites/bch-xlarge.png";
carWhale.src = "assets/sprites/bch-whale.png";
carLambo.src = "assets/sprites/lambo.png";


//core vehicles
// coreSmall.src = "assets/sprites/core-small.png";
// coreMedium.src = "assets/sprites/core-medium.png";
// coreXlarge.src = "assets/sprites/core-large.png";
// coreLarge.src = "assets/sprites/core-xlarge.png";
// coreWhale.src = "assets/sprites/core-whale.png";

// constants
let SINGLE_LANE = (canvas.height)/14;
let WIDTH = canvas.width;
let HEIGHT = canvas.height;
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
});

socketCore.on("tx", function(data){
	newTX("core", data);
	
});

socketCash.on("block", function(data){
	getCashData(cashXHR);	
});

socketCore.on("block", function(data){
	getCoreData(coreXHR);	
});
/* End connect to socket */


/* get new cash mempool data */
let xhrCash = new XMLHttpRequest();
let xhrCore = new XMLHttpRequest();

getCashData(cashXHR);
getCoreData(coreXHR);

function getCashData(url){
	xhrCash.open('GET', url, true);
	xhrCash.send();
	xhrCash.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(this.responseText);
			let info = JSON.parse(obj.body);
			info.data.forEach((key)=>{
				if (key.e =="mempool_transactions"){
						cashPoolInfo.textContent = key.c;
				}
			});
		}
	}
}

function getCoreData(url){
	xhrCore.open('GET', url, true);
	xhrCore.send();
	xhrCore.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(this.responseText);
			let info = JSON.parse(obj.body);
			info.data.forEach((key)=>{
				if (key.e =="mempool_transactions"){
						corePoolInfo.textContent = key.c;
				}
			});
		}
	}
	var req;
}
/* end get new mempool data*/

/* resize the window */
function resize (){
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
	
	if (type == "cash"){
		let lane = Math.floor(Math.random() * 8) + 1;
		
		lane *= SINGLE_LANE;
		lane = lane - SINGLE_LANE;

		let car = getCarSize(txInfo.valueOut);
		let height = SINGLE_LANE;
		let width = SINGLE_LANE * (car.height / car.width);
		let y = lane - height/2;
		
		txCash.push({
			type:"cash",
			id: txInfo.txid,
			x: -150,
			y: lane,
			h: height,
			w: width,
			valueOut: txInfo.valueOut,
			donation: checkForDonation(txInfo)
		});

	} else {
		let lane = SINGLE_LANE * 10;
		let x = -150
		if (txCore.length > 0){
			let last = txCore[txCore.length - 1];
			let w = SINGLE_LANE * carMedium.height / carMedium.width;
			let front = w + x;
			if (front >= last.x){
				x = last.x - w - 50;
			}
		}
		txCore.push({
			type:"core",
			id: txInfo.txid,
			x: x,
			y: lane
		});
	}
}


let  getCarSize = function(valueOut, donation){
	// core.png = core transaction
	// small.png = 0 - 5bch
	// medium.png = 5ch - 10bch
	// large.png = 10 bch - 15bch
	// xlarge.png = 15bch - 25bch
	// whale.png = 25bch - 50bch
	// lambo.png = flagged as donation to BCF

	//sprites should maintain their size difference

	//console.log(valueOut);
	if (donation){
		return carLambo;
	}

	if (valueOut <= 5){
		return carSmall;	
	} else if (valueOut > 5 && valueOut <= 10){
		return carMedium;
	} else if (valueOut > 10 && valueOut <= 15){
		return carLarge;
	} else if (valueOut > 15 && valueOut <= 25){
		return carXLarge;
	} else if (valueOut > 25){
		return carWhale;
	}
	
}

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

let requestID = requestAnimationFrame(update);



/* Refresh every frame */
function update(){
	requestID = requestAnimationFrame(update);

	// draw the lanes
	ctx.clearRect(0,0,WIDTH,HEIGHT);
	ctx.fillStyle = "#9EA0A3";

	//comment the rectangles to set a background image
	// ctx.fillRect(0, 0, WIDTH, LANE * 1);
	// ctx.fillRect(0, 0, WIDTH, LANE * 2);
	// ctx.fillRect(0, 0, WIDTH, LANE * 3);
	// ctx.fillRect(0, 0, WIDTH, LANE * 4);
	// ctx.fillRect(0, 0, WIDTH, LANE * 5);
	// ctx.fillRect(0, 0, WIDTH, LANE * 6);
	// ctx.fillRect(0, 0, WIDTH, LANE * 7);
	// ctx.fillRect(0, 0, WIDTH, LANE * 8);



//render logo on canvas, later canvas builds on top ie z-index
//render currently flickers. set #logo to display none to try this method

		// var context = document.getElementById('renderCanvas').getContext("2d");
		// var img = new Image();
		// img.onload = function () {
		//     context.drawImage(img, 5, 5, 300, 37);
		// }
		// img.src = "assets/tx-highway-logo.png";


	// dash style
	ctx.setLineDash([6]);
  	ctx.strokeStyle = "#FFF";

  // stroke
	ctx.strokeRect(-2, SINGLE_LANE * 1, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 3, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 5, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 7, WIDTH + 3, SINGLE_LANE);


	// core fills

	//commented the rectangles to set a background image vs using rect fill

	// ctx.fillStyle = "#A0A2A5";
	// ctx.fillRect(0, LANE * 9, WIDTH,LANE);
	// ctx.fillRect(0, LANE * 10, WIDTH,LANE);
	// ctx.fillRect(0, LANE * 11, WIDTH,LANE);
	// ctx.fillRect(0, LANE * 12, WIDTH,LANE);


	ctx.setLineDash([0]);
  	ctx.strokeStyle = "#3F3B3C";
	ctx.strokeRect(-2, SINGLE_LANE * 8, WIDTH + 3, SINGLE_LANE);

	ctx.setLineDash([6]);
 	ctx.strokeStyle = "#FFF";
	ctx.strokeRect(-2, SINGLE_LANE * 10, WIDTH + 3, SINGLE_LANE);
	ctx.strokeRect(-2, SINGLE_LANE * 12, WIDTH + 3, SINGLE_LANE);
	
	// loop through transactions and draw them
	txCash.forEach (function(item, index, object){
		item.x += CSPEED;
		ctx.drawImage(getCarSize(item.valueOut), item.x, item.y, item.h, item.w);
	});

	txCore.forEach(function(item, index, object){
		item.x += SSPEED;
		let h = SINGLE_LANE;
		let w = SINGLE_LANE * carMedium.height / carMedium.width;
		let y = item.y - h/2 - w/2;

		ctx.drawImage(carCore, item.x, y , h, w);

	});

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
