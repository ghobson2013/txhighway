"use strict";

/* create variables */
const socketCash = io("https://cashexplorer.bitcoin.com/");
const socketCore = io("https://search.bitaccess.co/");
const blockchairCashUrl = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin-cash/mempool/";
const blockchairCoreUrl = "http://cors-proxy.htmldriven.com/?url=https://api.blockchair.com/bitcoin/mempool/";
const blockchainCoreUrl = "https://api.blockchain.info/charts/avg-confirmation-time?format=json&cors=true";

// DOM elements
const canvas = document.getElementById("renderCanvas"),
	ctx = canvas.getContext("2d"),
	cashPoolInfo = document.getElementById("cash-pool"),
	corePoolInfo = document.getElementById("core-pool"),
	cashEta = document.getElementById("cash-eta"),
	coreEta = document.getElementById("core-eta"),
	confirmedNotify = document.getElementById("confirmed-notify"),
	confirmedAmount = document.getElementById("confirmed-amount"),
	cashAddress = document.getElementById("cash-address-input"),
	coreAddress = document.getElementById("core-address-input"),
	speedSlider = document.getElementById("speedSlider");

// for ajax requests
const xhrCash = new XMLHttpRequest(),
	xhrCore = new XMLHttpRequest(),
	xhrBlockchain = new XMLHttpRequest();

// sprites
const carCore = new Image(),
	carSmallCash = new Image(),
	carMediumCash = new Image(),
	carLargeCash = new Image(),
	carXLargeCash = new Image(),
	carWhaleCash = new Image(),
	carUserCash = new Image(),
	carSmallCore = new Image(),
	carMediumCore = new Image(),
	carLargeCore = new Image(),
	carXLargeCore = new Image(),
	carWhaleCore = new Image(),
	carUserCore = new Image(),
	carLambo = new Image();

//cash vehicles
carSmallCash.src = "assets/sprites/bch-small.png";
carMediumCash.src = "assets/sprites/bch-medium.png";
carLargeCash.src = "assets/sprites/bch-large.png";
carXLargeCash.src = "assets/sprites/bch-xlarge.png";
carWhaleCash.src = "assets/sprites/bch-whale.png";
carUserCash.src = "";
carLambo.src = "assets/sprites/lambo.png";

//core vehicles
carSmallCore.src = "assets/sprites/core-small.png";
carMediumCore.src = "assets/sprites/core-medium.png";
carLargeCore.src = "assets/sprites/core-xlarge.png";
carXLargeCore.src = "assets/sprites/core-large.png";
carWhaleCore.src = "assets/sprites/core-whale.png";
carUserCore.src = "";

// array to store sounds for multiple playback
let sounds = [];

// sound locations
let context = new AudioContext();
const audioCarUrl = "assets/audio/car-pass.mp3",
	audioDieselUrl = "assets/audio/diesel-pass.mp3",
	audioSemiUrl = "assets/audio/semi-pass.mp3",
	audioMercyUrl = "assets/audio/mercy-6s.mp3",
	audioRideUrl = "assets/audio/ride-dirty-7s.mp3";

// sound variables
let audioCar = null,
	audioDiesel = null,
	audioSemi = null,
	audioMercy = null,
	audioRide = null;

// mute variables
let isCashMuted = false;
let isCoreMuted = false;

// constants
let WIDTH = canvas.width;
let HEIGHT = canvas.height;
let SINGLE_LANE = HEIGHT/14;
let SPEED = 8;

let isVisible = true;

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
	if (cashPoolInfo.textContent != "UPDATING"){
		let t = parseInt(cashPoolInfo.textContent.replace(/\,/g,''));			
		cashPoolInfo.textContent = formatNumbersWithCommas(t +1);			
	} 
	newTX("cash", data);
});

socketCore.on("tx", function(data){
	if (cashPoolInfo.textContent != "UPDATING"){
		let t = parseInt(corePoolInfo.textContent.replace(/\,/g,''));
		corePoolInfo.textContent = formatNumbersWithCommas(t +1);
	}
	newTX("core", data);
});

socketCash.on("block", function(data){
	blockNotify(data, "BCH");	
});

socketCore.on("block", function(data){
	blockNotify(data, "BTC");	
});
/* End connect to socket */

init();

function init(){
	// setup canvas
	canvas.width = window.innerWidth; 
	canvas.height = window.innerHeight;

	// listenners
	window.addEventListener("load", resize, false);
	window.addEventListener("resize", resize, false);

	// acquire data for signs
	getPoolData(blockchairCashUrl, xhrCash, true);
	getPoolData(blockchairCoreUrl, xhrCore, false);
	getCoreConfTime(blockchainCoreUrl, xhrBlockchain);

	// assign sounds to variables
	loadSoundCar(audioCarUrl);
	loadSoundDiesel(audioDieselUrl);
	loadSoundSemi(audioSemiUrl);
	loadSoundMercy(audioMercyUrl);
	loadSoundRide(audioRideUrl);


	onReady(function () {
		show('page', true);
		show('loading', false);
	});
}

function formatNumbersWithCommas(x){
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");	
}

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

// retrieve pool information for signs
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
	xhr.send(null);
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

/* resize the window */
function resize(){
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	SINGLE_LANE = HEIGHT/14;

	canvas.width = WIDTH;
	canvas.height = HEIGHT;
}

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
	if (type == "cash"){
		let randLane = Math.floor(Math.random() * 8) + 1;
		createVehicle(type, txCash, txInfo, randLane, true);
	} else {
		createVehicle(type, txCore, txInfo, 10, false);
	}
}

/* create vehicles and push to appropriate array */
function createVehicle(type, arr, txInfo, lane, isCash){
	let donation = checkForDonation(txInfo);
	let userTx = checkForUserTx(txInfo);
	let car = getCar(txInfo.valueOut, donation, isCash);
	let width = SINGLE_LANE * (car.width / car.height);
	let x = -width - carWhaleCash.width;

	if (arr.length > 0){
		let last = arr[arr.length -1];
		let front = width;

		if (front >= last.x && lane == last.lane){
			x = last.x - width - 10;
		}
	}

	arr.push({
		type:type,
		id: txInfo.txid,
		x: x,
		lane: lane,
		h: SINGLE_LANE,
		w: width,
		valueOut: txInfo.valueOut,
		donation: donation,
		userTx: userTx,
		isCash: isCash
	});
}
/* end new transaction */

/* return car based upon transaction size*/
function getCar(valueOut, donation, isCash, userTx){
	if (donation == true){
		SPEED = 4;
		return carLambo;
	}

	if (userTx){
		if (isCash){
			return carSmallCash;
		} else {
			return carSmallCore;
		}
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
	if (!isVisible) return;


	if (carType == carLambo){
		let randSong = Math.floor(Math.random() * 2) + 1;
		
		if (randSong == 1){		
			playSound(audioMercy, null);
		} else {
			playSound(audioRide, null);
		}
	}

	if (carType == carSmallCash ||
		carType == carSmallCore){
			playSound(audioCar, carSmallCash);
	} else if (carType == carMediumCash ||
		carType == carMediumCore ||
		carType == carLargeCash ||
		carType == carLargeCore ||
		carType == carXLargeCash ||
		carType == carXLargeCore){
			audioDiesel.playbackRate = 1.4;
			playSound(audioDiesel, carMediumCash);	
	} else if (carType == carWhaleCash ||
		carType == carWhaleCore){
			audioSemi.playbackRate = 1.8;
			playSound(audioSemi, carWhaleCash);
	}
}

// plays the sound
function playSound(buffer, carType) {
	let source = context.createBufferSource();
	let gainNode = context.createGain();
	source.buffer = buffer;

	if(carType == carSmallCash)	gainNode.gain.value = 0.2;

	source.connect(gainNode);
	gainNode.connect(context.destination);
	source.start(0);
}

function loadSoundCar(url){
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function(){
		context.decodeAudioData(request.response, function(buffer){
			audioCar = buffer;
		});
	}
	request.send();
}

function loadSoundDiesel(url){
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function(){
		context.decodeAudioData(request.response, function(buffer){
			audioDiesel = buffer;
		});
	}
	request.send();
}

function loadSoundSemi(url){
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function(){
		context.decodeAudioData(request.response, function(buffer){
			audioSemi = buffer;
		});
	}
	request.send();
}

function loadSoundMercy(url){
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function(){
		context.decodeAudioData(request.response, function(buffer){
			audioMercy = buffer;
		});
	}
	request.send();
}

function loadSoundRide(url){
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function(){
		context.decodeAudioData(request.response, function(buffer){
			audioRide = buffer;
		});
	}
	request.send();
}
/* END LOAD SOUNDS */

/* check for donations into the BCF*/
let checkForDonation = function(txInfo){
	let vouts = txInfo.vout;
	let isDonation = false;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=> {
			if (k == "3ECKq7onkjnRQR2nNe5uUJp2yMsXRmZavC") isDonation = true;
		});
	});

	return isDonation;
}
/* end check for donations */

function checkForUserTx(txInfo){
	let vouts = txInfo.vout;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=>{
			if (k == cashAddress.value || k == coreAddress.value)return true;
		})
	});

	return false;
}

/** Draw the background */
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

	// font for txid
	ctx.font = "10px Arial";
	ctx.fillStyle = "red";

}

// loop through transactions and draw them
function drawVehicles(arr){
	let car = null;
	let y = null;
	let width = null;
	arr.forEach(function(item, index, object){
		car = getCar(item.valueOut,item.donation,item.isCash, item.userTx);
		
		if (item.x > -car.width){
			if ((item.isCash && !isCashMuted) || (!item.isCash && !isCoreMuted)){
				if (!item.isPlaying) addSounds(car);
			}
			item.isPlaying = true;

			y = (item.lane * SINGLE_LANE) - SINGLE_LANE;
			width = SINGLE_LANE * (car.width / car.height);

			ctx.drawImage(car, item.x, y, width, SINGLE_LANE);
			
			ctx.fillText("TXID: " + item.id.substring(0, 5) + "...", item.x, y + SINGLE_LANE/2);
			
		}
		item.x += SPEED;
	});
}

// remove vehicles that are off the map
function removeVehicles(){
	txCash.forEach(function(item, index, object){
		if (item.donation) SPEED = 8;
		if (item.x > WIDTH + 100) object.splice(index, 1);
	});

	txCore.forEach(function(item, index, object){
		if (item.x > WIDTH + 100) object.splice(index, 1);
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
}

/* Front end element controls */

speedSlider.oninput = function(){
	let newSpeed = 16 * (this.value/100);
	SPEED = newSpeed;
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

$('.nav .overlay').click(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-window-maximize fa-window-restore')
    $( ".sign" ).fadeToggle( "slow", "linear" );

});

$('.nav .stats').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-cog fa-cogs')
});

$('.nav .donate').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-heart fa-money')
});

$('.nav .cash-address i').click(function(){
	let value = $('#cash-address-input').css('display');
	if (value == 'none'){
		$('#cash-address-input').css('display','block');
	} else {
		$('#cash-address-input').css('display','none');
	}
});


//core nav
$('.core-nav .core-mute').click(function(){
	// $(this).next('ul').slideToggle('500');
	$(this).find('i').toggleClass('fa-volume-up fa-volume-off');
	if (isCoreMuted){
		isCoreMuted = false;
	} else {
		isCoreMuted = true;
		sounds = [];
	}
});

$('.core-nav .core-address i').click(function(){
	let value = $('#core-address-input').css('display');
	if (value == 'none'){
		$('#core-address-input').css('display','block');
	} else {
		$('#core-address-input').css('display','none');
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
	if($(event.target).hasClass('modal')) $('.modal').hide();
}


function onReady(callback) {
    var intervalID = window.setInterval(checkReady, 1500);

    function checkReady() {
        if (document.getElementsByTagName('body')[0] !== undefined) {
            window.clearInterval(intervalID);
            callback.call(this);
        }
    }
}

function show(id, value) {
    document.getElementById(id).style.display = value ? 'block' : 'none';
}

