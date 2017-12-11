"use strict";

// urls
const urlCash = "https://cashexplorer.bitcoin.com/",
	urlCore = "https://insight.bitpay.com/",
	urlCors = "https://cors-anywhere.herokuapp.com/",
	urlBlockchairCash = urlCors + "https://api.blockchair.com/bitcoin-cash/mempool/",
	urlBlockchairCore = urlCors + "https://api.blockchair.com/bitcoin/mempool/",
	urlBlockchainCore = "https://api.blockchain.info/charts/avg-confirmation-time?format=json&cors=true";

// sockets
const socketCash = io(urlCash),
	socketCore = io(urlCore);

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
	speedSlider = document.getElementById("speedSlider"),
	volumeSlider = document.getElementById("volumeSlider"),
	page = document.getElementById("page"),
	transactionWrap = document.getElementById("tx-wrap"),
	transactionList = document.getElementById("transactions");

// for ajax requests
const xhrCash = new XMLHttpRequest(),
	xhrCore = new XMLHttpRequest(),
	xhrBlockchain = new XMLHttpRequest();

// sprites
const carCore = new Image(),
	carMicroCash = new Image(),
	carSmallCash = new Image(),
	carMediumCash = new Image(),
	carLargeCash = new Image(),
	carXLargeCash = new Image(),
	carWhaleCash = new Image(),
	carUserCash = new Image(),
	carMicroCore = new Image(),
	carSmallCore = new Image(),
	carMediumCore = new Image(),
	carLargeCore = new Image(),
	carXLargeCore = new Image(),
	carWhaleCore = new Image(),
	carUserCore = new Image(),
	carLambo = new Image(),
	carSpam = new Image(),
	carSatoshiDice = new Image();

// sound system
let audioContext = new AudioContext();
let gainNode = audioContext.createGain();

// sound variables
let audioMotorcycle = null,
	audioCar = null,
	audioDiesel = null,
	audioSemi = null,
	audioMercy = null,
	audioRide = null,
	audioChaChing = null,
	audioWoohoo = null,
	audioSpam = null,
	audioAllSpam = null;

// constants
let WIDTH = canvas.width;
let HEIGHT = canvas.height;
let SINGLE_LANE = HEIGHT/14;
let SPEED = 8;
let VOLUME = 1;

// animation
let requestID = null;

// booleans
let isVisible = true,
	konamiActive = false,
	isCashMuted = false,
	isCoreMuted = false;

// arrays for vehicles
let txCash = [],
	txCore = [];

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
	if (corePoolInfo.textContent != "UPDATING"){
		let t = parseInt(corePoolInfo.textContent.replace(/\,/g,''));
		corePoolInfo.textContent = formatNumbersWithCommas(t +1);
	}
	newTX("core", data);
});

socketCash.on("block", function(data){
	blockNotify(data, true);	
});

socketCore.on("block", function(data){
	blockNotify(data, false);	
});
/* End connect to socket */

// initialise everything
function init(){
	// setup canvas
	canvas.width = window.innerWidth; 
	canvas.height = window.innerHeight;

	// listenners
	window.addEventListener("load", resize, false);
	window.addEventListener("resize", resize, false);

	//cash vehicles
	carMicroCash.src = "assets/sprites/bch-micro.png";
	carSmallCash.src = "assets/sprites/bch-small.png";
	carMediumCash.src = "assets/sprites/bch-medium.png";
	carLargeCash.src = "assets/sprites/bch-large.png";
	carXLargeCash.src = "assets/sprites/bch-xlarge.png";
	carWhaleCash.src = "assets/sprites/bch-whale.png";
	carUserCash.src = "assets/sprites/tx-taxi.png"; 
	carLambo.src = "assets/sprites/lambo.png";
	carSatoshiDice.src = "assets/sprites/dice.png";

	//core vehicles
	carMicroCore.src = "assets/sprites/core-micro.png";
	carSmallCore.src = "assets/sprites/core-small.png";
	carMediumCore.src = "assets/sprites/core-medium.png";
	carLargeCore.src = "assets/sprites/core-xlarge.png";
	carXLargeCore.src = "assets/sprites/core-large.png";
	carWhaleCore.src = "assets/sprites/core-whale.png";
	carUserCore.src = "assets/sprites/tx-taxi.png";
	carSpam.src = "assets/sprites/spam.png";

	// hide signes on small screens
	if(canvas.width <= 800 && canvas.height <= 600) {
		$("input.overlay-switch")[0].checked = true;
		$( ".sign" ).fadeToggle( "slow", "linear" );
	  }

	// assign sounds to variables
	loadSound("assets/audio/motorcycle-lowergain.mp3", "motorcycle")
	loadSound("assets/audio/car-pass-lowergain.mp3", "car");
	loadSound("assets/audio/diesel-pass.mp3", "diesel");
	loadSound("assets/audio/semi-pass.mp3", "semi");
	loadSound("assets/audio/mercy-6s.mp3", "mercy");
	loadSound("assets/audio/ride-dirty-7s.mp3", "ride");
	loadSound("assets/audio/cha-ching.mp3", "cha-ching")
	loadSound("assets/audio/woohoo.mp3", "woohoo");
	loadSound("assets/audio/spam.mp3", "spam");
	loadSound("assets/audio/allspam.mp3", "allspam");

	// acquire data for signs
	getPoolData(urlBlockchairCash, xhrCash, true);
	getPoolData(urlBlockchairCore, xhrCore, false);
	getCoreConfTime(urlBlockchainCore, xhrBlockchain);
	
	// remove loading screen
	onReady(function () {
		show('page', true);
		show('loading', false);
	});

	requestID = requestAnimationFrame(animate);
}

// adds thousands seperator to large numbers
function formatNumbersWithCommas(x){
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");	
}

// notify users when a new block is found
function blockNotify(blockId, isCash){
	let xhr = new XMLHttpRequest();
	let url = "";
	let t = 0;
	let ticker = "";

	if(isCash){
		ticker = "BCH";
		t = parseInt(cashPoolInfo.textContent.replace(/\,/g,''));
		url = urlCash + "insight-api/block/" + blockId;
		cashPoolInfo.textContent = "UPDATING";
	} else {
		ticker = "BTC";
		t = parseInt(corePoolInfo.textContent.replace(/\,/g,''));
		url = urlCors + urlCore + "api/block/" + blockId;
		corePoolInfo.textContent = "UPDATING";		
	}

	xhr.onload = function(){
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(this.responseText);
			let tx = obj.tx;
			let amount = tx.length;

			if (isCash){
				cashPoolInfo.textContent = t - amount;
			} else {
				corePoolInfo.textContent = t - amount;
			}
			
			if (amount == t){
				amount = "ALL";
			}
			confirmedAmount.textContent = amount + " " + ticker;
			confirmedNotify.style.display = "block"; //no pun intended

			if (isVisible) playSound(audioChaChing);

			setTimeout(() => {
				confirmedNotify.style.display = "none";
				getPoolData(urlBlockchairCore, xhrCore, false);	
				getPoolData(urlBlockchairCash, xhrCash, true);				
				
			}, 5000);
		} else if (this.status === 404 || this.status === 500){
			if(isCash){
				cashPoolInfo.textContent = "UPDATING";		
			} else {
				corePoolInfo.textContent = "UPDATING";
			}
			setTimeout(() => {
				blockNotify(blockId, isCash);
			}, 3000);
		}
	}
	
	xhr.open("GET", url, true);
	xhr.send(null);
}

// retrieve pool information for signs
function getPoolData(url, xhr, isCash){
	xhr.onload = function () {
		if (this.readyState == 4 && this.status == 200) {
			let obj = JSON.parse(this.responseText);

			obj.data.forEach((key)=>{
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

// resize the window
function resize(){
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	SINGLE_LANE = HEIGHT/14;

	canvas.width = WIDTH;
	canvas.height = HEIGHT;
}


// pause everything when window loses focus
let vis = (function(){
    let stateKey, eventKey, keys = {
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

// create a new transaction
function newTX(type, txInfo){
	if (type == "cash"){
		let randLane = Math.floor(Math.random() * 8) + 1;
		createVehicle(type, txCash, txInfo, randLane, true);
	} else {
		createVehicle(type, txCore, txInfo, 10, false);
	}
}

// adds tx info to the side list
function addTxToList(isCash, txid, valueOut, car){

	let node = document.createElement("LI");
	let text = "txid: " + txid.substring(0, 7) + "...\n";
	text += "value: " + valueOut.toString().substring(0,9);
	let textNode = document.createTextNode(text);

	node.setAttribute("style", "background-image: url(" + car.src + ");");

    if (isCash){
        node.className = "txinfo-cash";
    } else {
        node.className = "txinfo-core";
    }

	node.appendChild(textNode);
	transactionList.prepend(node);

	if (transactionList.childNodes.length > 50){
		transactionList.removeChild(transactionList.childNodes[transactionList.childNodes.length -1]);
	}
}

/* create vehicles and push to appropriate array */
function createVehicle(type, arr, txInfo, lane, isCash){
	let donation = false;
	let userTx = isUserTx(txInfo);
	let sdTx = false;

	if(isCash){
		donation = isDonationTx(txInfo);
		sdTx = isSatoshiDiceTx(txInfo);
	}

	let car = getCar(txInfo.valueOut, donation, isCash, userTx, sdTx);
	let width = SINGLE_LANE * (car.width / car.height);
	let x = -width;

	// fix vehicle positioning to prevent pile ups.
	if (arr.length > 0){
		arr.forEach((key) => {
			if (width >= key.x && lane == key.lane){
				x = key.x - width - 10;
			}
		});
	}

	// fix btc vehicle positioning to prevent pile ups. <-- use this if above causes performance issues
/*  	if (arr.length > 0 && !isCash){
		let last = arr[arr.length -1];
		if (width >= last.x && lane == last.lane){
			x = last.x - width - 10;
		}
	} */

	arr.push({
		type:type,
		id: txInfo.txid,
		car: car,
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
function getCar(valueOut, donation, isCash, userTx, sdTx){
	if (donation == true){
		SPEED = 4;
		return carLambo;
	}

	// satoshi dice tx
	if(sdTx) return carSatoshiDice;	

	// user tx vehicles need to go here
	if (userTx){
		if (isCash){
			return carUserCash;
		} else {
			return carUserCore;
		}
	}

	if (valueOut <= 0.0004){
		//~0.50 USD Dec 10/17
		//~5.41 USD Dec 10/17
		if (isCash){
			return carMicroCash;
		} else {
			return carMicroCore;
		}

	} else if (valueOut > 0.0004 && valueOut <= 5){
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

	if (carType == carUserCash || carType == carUserCore) playSound(audioWoohoo);

	if (carType == carLambo){
		let randSong = Math.floor(Math.random() * 2) + 1;
		
		if (randSong == 1){		
			playSound(audioMercy);
		} else {
			playSound(audioRide);
		}
	}

	if (carType == carMicroCash || carType == carMicroCore){
		playSound(audioMotorcycle);
	} else if (carType == carMicroCash || carType == carMicroCore || carType == carSmallCash ||
		carType == carSmallCore){
			playSound(audioCar);
	} else if (carType == carMediumCash ||
		carType == carMediumCore ||
		carType == carLargeCash ||
		carType == carLargeCore ||
		carType == carXLargeCash ||
		carType == carXLargeCore){
			audioDiesel.playbackRate = 1.4;
			playSound(audioDiesel);	
	} else if (carType == carWhaleCash ||
		carType == carWhaleCore){
			audioSemi.playbackRate = 1.8;
			playSound(audioSemi);
	} else if (carType == carSpam){
		playSound(audioSpam);
	}
}

// plays the sound
function playSound(buffer) {
	let source = audioContext.createBufferSource();
	source.buffer = buffer;
	source.playbackRate.value = speedSlider.value/100 + 0.5;

	source.connect(gainNode);
	gainNode.connect(audioContext.destination);
	source.start(0);
}

// load the sounds into their correct variables
function loadSound(url, sound){
	let request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	request.onload = function(){
		audioContext.decodeAudioData(request.response, function(buffer){
			if (sound == "motorcycle"){
				audioMotorcycle = buffer;
			} else if (sound=="car") {
				audioCar = buffer;
			} else if (sound == "diesel"){
				audioDiesel = buffer;
			} else if (sound == "semi"){
				audioSemi = buffer;
			} else if (sound == "mercy"){
				audioMercy = buffer;
			} else if (sound == "ride"){
				audioRide = buffer;
			} else if (sound == "cha-ching"){
				audioChaChing = buffer;
			} else if (sound == "woohoo"){
				audioWoohoo = buffer;
			} else if (sound == "spam"){
				audioSpam = buffer;
			} else if (sound == "allspam"){
				audioAllSpam = buffer;
			}
		});
	}
	request.send();
}

// check for donations into the BCF
let isDonationTx = function(txInfo){
	let vouts = txInfo.vout;
	let isDonation = false;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=> {
			if (k == "3ECKq7onkjnRQR2nNe5uUJp2yMsXRmZavC" ||
				k == "3MtCFL4aWWGS5cDFPbmiNKaPZwuD28oFvF") isDonation = true;
		});
	});

	return isDonation;
}

// check for satoshi dice tx
let isSatoshiDiceTx = function(txInfo){
	let vouts = txInfo.vout;
	let satoshiDiceTx = false;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=>{
			if(k == "1DiceoejxZdTrYwu3FMP2Ldew91jq9L2u" ||
			k == "1Dice115YcjDrPM9gXFW8iFV9S3j9MtERm" ||
			k == "1Dice1FZk6Ls5LKhnGMCLq47tg1DFG763e" ||
			k == "1Dice1cF41TGRLoCTbtN33DSdPtTujzUzx" ||
			k == "1Dice1wBBY22stCobuE1LJxHX5FNZ7U97N" ||
			k == "1Dice2wTatMqebSPsbG4gKgT3HfHznsHWi" ||
			k == "1Dice5ycHmxDHUFVkdKGgrwsDDK1mPES3U" ||
			k == "1Dice7JNVnvzyaenNyNcACuNnRVjt7jBrC" ||
			k == "1Dice7v1M3me7dJGtTX6cqPggwGoRADVQJ" ||
			k == "1Dice81SKu2S1nAzRJUbvpr5LiNTzn7MDV" ||
			k == "1Dice9GgmweQWxqdiu683E7bHfpb7MUXGd") satoshiDiceTx = true;
		});
	});

	return satoshiDiceTx;
}

// check for transactions to user's addresses
let isUserTx = function(txInfo){
	let vouts = txInfo.vout;
	let isUserTx = false;

	//if (cashAddress.value.length < 34 && coreAddress.value.length < 34 ) return isUserTx;

	vouts.forEach((key)=>{
		let keys = Object.keys(key);
		keys.forEach((k)=>{
			if (k == cashAddress.value || k == coreAddress.value){
				isUserTx = true;
			} 
		})
	});
	return isUserTx;
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
}

// loop through transactions and draw them
function drawVehicles(arr){
	let car = null;
	let y = null;
	let width = null;
	arr.forEach(function(item, index, object){

		if(!item.isCash && konamiActive) { 
			car = carSpam;
		} else {
			car = item.car;
		}
		
		if (item.x > -car.width - SPEED -10){
			if (!item.isPlaying){
				addTxToList(item.isCash, item.id, item.valueOut, car);
				if ((item.isCash && !isCashMuted) || (!item.isCash && !isCoreMuted)) addSounds(car);
			}
			item.isPlaying = true;

			y = (item.lane * SINGLE_LANE) - SINGLE_LANE;
			width = SINGLE_LANE * (car.width / car.height);

			ctx.drawImage(car, item.x, y, width, SINGLE_LANE);
			
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

// animate everything
function animate(){
	requestID = requestAnimationFrame(animate);
	drawBackground();
	drawVehicles(txCash);
	drawVehicles(txCore);
	removeVehicles();
}

// adjust speed on slider change
speedSlider.oninput = function(){
	let newSpeed = 16 * (this.value/100);
	SPEED = newSpeed;
}

volumeSlider.oninput = function(){
	let newVol = this.value/100;
	VOLUME = newVol;
	gainNode.gain.value = VOLUME;
}

$('#tx-list-button').click(function(){
	if (transactionWrap.style.right == '0%'){
		transactionWrap.style.right = '-151px';
		// page.style.right = '0';
	} else {
		transactionWrap.style.right = '0%';
		// page.style.width = '85%';
	}
});


$("input.cash-mute").change(function() {
	if(this.checked) {
      if (isCashMuted) {
				isCashMuted = false;
			 } else {
				isCashMuted = true;
			 }
    } else {
      if (isCashMuted) {
				isCashMuted = false;
			 } else {
				isCashMuted = true;
			 }
    }
});

$('.nav .legend').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-car fa-truck')
});

$("input.overlay-switch").change(function() {
    if(this.checked) {
      $( ".sign" ).fadeToggle( "slow", "linear" );
    } else {
      $( ".sign" ).fadeToggle( "slow", "linear" );
    }
});

$('.nav .search').click(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-search fa-eye')
});

$('.tx-list-link').click(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-list fa-close')
});

$('.nav .settings').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-cog fa-cogs')
});

$('.nav .donate').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-heart fa-money')
});

if ($('input.core-mute').is(':checked')) {
	// $(this).next('ul').slideToggle('500');
	if (isCoreMuted){
		isCoreMuted = false;
	} else {
		isCoreMuted = true;
	}
};

$("input.core-mute").change(function() {
	if(this.checked) {
      if (isCoreMuted) {
				isCoreMuted = false;
			 } else {
				isCoreMuted = true;
			 }
    } else {
      if (isCoreMuted) {
				isCoreMuted = false;
			 } else {
				isCoreMuted = true;
			 }
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

//konami
let easter_egg = new Konami(function() { 
	if (konamiActive == false || konamiActive == null) {
		playSound(audioAllSpam);
		
		konamiActive = true;
		$( ".core-mode" ).fadeToggle( "slow", "linear" );
	} else if (konamiActive == true) {
		konamiActive = false;
		$( ".core-mode" ).fadeToggle( "slow", "linear" );
	}
});

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
	if($(event.target).hasClass('modal')) $('.modal').hide();
}

function onReady(callback) {
    let intervalID = window.setInterval(checkReady, 1500);

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

init();
