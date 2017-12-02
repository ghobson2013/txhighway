"use strict";

/* create variables */
const socketCash = io("https://cashexplorer.bitcoin.com/");
const socketCore = io("https://search.bitaccess.co/");//https://insight.bitpay.com/");//https://localbitcoinschain.com/");//
const blockchairCashUrl = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin-cash/mempool/";
const blockchairCoreUrl = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin/mempool/";
const blockchainCoreUrl = "https://api.blockchain.info/charts/avg-confirmation-time?format=json&cors=true";

// DOM elements
const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const cashPoolInfo = document.getElementById("cash-pool");
const corePoolInfo = document.getElementById("core-pool");
const cashEta = document.getElementById("cash-eta");
const coreEta = document.getElementById("core-eta");
const confirmedNotify = document.getElementById("confirmed-notify");
const confirmedAmount = document.getElementById("confirmed-amount");

canvas.width = window.innerWidth; 
canvas.height = window.innerHeight;

/* sprites */
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
/* end sprites */

/* audio files */
// car sounds
const audioCar = new Audio("assets/audio/car-pass.mp3");
const audioDiesel = new Audio("assets/audio/diesel-pass.mp3");
const audioSemi = new Audio("assets/audio/semi-pass.mp3");
const audioCarFast = new Audio("assets/audio/fastcar-pass.mp3");
audioSemi.playbackRate = 4;

// donation music
const audioMercy = new Audio("assets/audio/mercy-6s.mp3");
const audioRide4 = new Audio("assets/audio/ride-dirty-4s.mp3");
const audioRide7 = new Audio("assets/audio/ride-dirty-7s.mp3");

// array to store sounds for multiple playback
let sounds = [];
let isCashMuted = false;
let isCoreMuted = false;

// constants
let WIDTH = canvas.width;
let HEIGHT = canvas.height;
let SINGLE_LANE = HEIGHT/14;
let isVisible = true;

// cash and segwit speed
const SPEED = 8;

// arrays
let txCash = [];
let txCore = []

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
	blockNotify(data, "BCH");	
});

socketCore.on("block", function(data){
	blockNotify(data, "BTC");	
});
/* End connect to socket */

// notify users when a new block is found
function blockNotify(blockId, type){
	let xhr = new XMLHttpRequest();
	let url = "";
	let t = 0;

	if(type == "BCH"){
		t = parseInt(cashPoolInfo.textContent);		
		url = "https://cashexplorer.bitcoin.com/insight-api/block/" + blockId;
		getPoolData(blockchairCashUrl, xhrCash, true);		
	} else {
		t = parseInt(corePoolInfo.textContent);
		url = "https://search.bitaccess.co/insight-api/block/" + blockId;
		getPoolData(blockchairCoreUrl, xhrCore, false);	
	}

	xhr.onreadystatechange = function(){
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(this.responseText);
			let tx = obj.tx;
			let amount = tx.length;
			if (amount == t){
				amount = "ALL";
			}
			confirmedAmount.textContent = amount + " " + type;
			confirmedNotify.style.display = "block"; //no pun intended
			setTimeout(() => {
				confirmedNotify.style.display = "none";
			}, 5000);
		}
	}

	xhr.open("GET", url, true);
	xhr.send(null);
}


/* get new cash mempool data */
let xhrCash = new XMLHttpRequest();
let xhrCore = new XMLHttpRequest();
let xhrBlockchain = new XMLHttpRequest();


getPoolData(blockchairCashUrl, xhrCash, true);
getPoolData(blockchairCoreUrl, xhrCore, false);
getCoreConfTime(blockchainCoreUrl, xhrBlockchain);

function getPoolData(url, xhr, isCash){
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

	xhr.open('GET', url, true);
	xhr.send();
}

// get average confirmation time for btc
function getCoreConfTime(url, xhr){
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(xhr.responseText);
			coreEta.textContent = obj.period;
		}
	}

	xhr.open("GET", url, true);
	xhr.send(null);
	
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

/* window loses focus */
let vis = (function(){
    var stateKey, eventKey, keys = {
        hidden: "visibilitychange",
        webkitHidden: "webkitvisibilitychange",
        mozHidden: "mozvisibilitychange",
        msHidden: "msvisibilitychange"
    };
    for (stateKey in keys) {
        if (stateKey in document) {
            eventKey = keys[stateKey];
            break;
        }
    }
    return function(c) {
        if (c) document.addEventListener(eventKey, c);
        	return !document[stateKey];
    }
})();

vis(function(){
	if (vis()){
		txCash = [];
		txCore = [];
		drawBackground();
		requestAnimationFrame(animate);
		isVisible = true;
	} else{
		cancelAnimationFrame(requestID);		
		isVisible = false;
	}
});
/* end window loses focus */

/* new transaction is made */
function newTX(type, txInfo){
	let lane = SINGLE_LANE;
	
	if (type == "cash"){
		let randLane = Math.floor(Math.random() * 8) + 1;
		lane *= randLane;
		lane -= SINGLE_LANE;
		createVehicle(type, txCash, txInfo, lane, true);
	} else {
		lane *= 10;
		lane -= SINGLE_LANE;
		let car = getCar(txInfo.valueOut, false, false);
		createVehicle(type, txCore, txInfo, lane, false);
	}
}

/* create vehicles and push to appropriate array */
function createVehicle(type, arr, txInfo, lane, isCash){
	let donation = checkForDonation(txInfo);
	let car = getCar(txInfo.valueOut, donation, isCash);
	let height = SINGLE_LANE;
	let width = height * (car.width / car.height);
	let y = lane;
	let x = -width - SPEED;
	
	if (arr.length > 0){
		let last = arr[arr.length -1];
		let front = width;

		if (front >= last.x && y == last.y){
			x = last.x - width - SPEED;
		}
	}

	//console.log("car pos" + x);
	arr.push({
		type:type,
		id: txInfo.txid,
		x: x,
		y: y,
		h: height,
		w: width,
		valueOut: txInfo.valueOut,
		donation: donation,
		isCash: isCash
	});
}
/* end new transaction */

/* return car based upon transaction size*/
function getCar(valueOut, donation, isCash){

	//console.log(valueOut);
	if (donation == true){
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


// add sounds to sound array for playback
function addSounds(carType){
	if (!isVisible)
		return;

	if (carType == carLambo){
		let randSong = Math.floor(Math.random() * 2) + 1;
		sounds.push(audioCarFast.cloneNode(true));
		if (randSong == 1){
			sounds.push(audioMercy);
		} else if (randSong == 2){
			sounds.push(audioRide4);
		}
	}

	if (sounds.length > 16){
		playSounds();
		return;
	}

	if (carType == carSmallCash ||
		carType == carSmallCore){
			sounds.push(audioCar.cloneNode(true));
			sounds[sounds.length-1].volume = 0.2;
	} else if (carType == carMediumCash ||
		carType == carMediumCore ||
		carType == carLargeCash ||
		carType == carLargeCore ||
		carType == carXLargeCash ||
		carType == carXLargeCore){
			sounds.push(audioDiesel.cloneNode(true));
			sounds[sounds.length-1].playbackRate = 1.3;			
	} else if (carType == carWhaleCash ||
		carType == carWhaleCore){
			sounds.push(audioSemi.cloneNode(true));
			sounds[sounds.length-1].playbackRate = 1.6;
	}

	playSounds();
}

// play sounds in sound array
function playSounds(){
	sounds.forEach((s, index, object)=>{
		if (s.currentTime == 0){
			s.play();
		}
	});
}

// remove sounds from array
function removeSounds(){
	sounds.forEach((s,index,object)=>{
		if (s.ended){
			object.splice(index, 1);
		}
	});
}

/* check for donations into the BCF*/
let checkForDonation = function(txInfo){
	let vouts = txInfo.vout;
	let isDonation = false;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=> {
			if (k == "3ECKq7onkjnRQR2nNe5uUJp2yMsXRmZavC"){
				isDonation = true;
			}
		});
	});

	return isDonation;
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

// loop through transactions and draw them
function drawVehicles(arr){
	arr.forEach(function(item, index, object){
		
		let car = getCar(item.valueOut,item.donation,item.isCash);
		
		if (item.x > -car.width){
			ctx.drawImage(car, item.x, item.y, item.w, item.h);
			if ((item.isCash && !isCashMuted) || (!item.isCash && !isCoreMuted)){
				if (!item.isPlaying){
					addSounds(car);
				}
			}
			item.isPlaying = true;
			
		}
		item.x += SPEED;
			
	});
}

// removes vehicles that are off the map
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
	drawVehicles(txCash);
	drawVehicles(txCore);
	removeVehicles();
	removeSounds();
}


$('.nav .mute').click(function(){
    // $(this).next('ul').slideToggle('500');
	$(this).find('i').toggleClass('fa-volume-up fa-volume-off')
	if (isCashMuted) {
		isCashMuted = false;
	 } else {
		isCashMuted = true;
		sounds = [];
	 }
});

$('.nav .legend').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-car fa-truck')
});

$('.nav .overlay').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-window-maximize fa-window-restore')
});

$('.nav .stats').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-cog fa-cogs')
});

$('.nav .donate').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-heart fa-money')
});


//core nav

$('.core-nav .core-mute').click(function(){
    // $(this).next('ul').slideToggle('500');
	$(this).find('i').toggleClass('fa-volume-up fa-volume-off')
	if (isCoreMuted){
		isCoreMuted = false;
	} else {
		isCoreMuted = true;
		sounds = [];
	}
});


$('.nav a').on('click', function(){
  $('#'+$(this).data('modal')).css('display','block');
})

$('.nav a.donate').on('click', function(){
  $('#'+$(this).data('modal')).toggleClass('donate donate-off');
})



$('.close').on('click', function(){
  $('.modal').hide();
})

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target.className == 'modal') {
    $('.modal').hide();
  }
}
