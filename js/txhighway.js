"use strict";

// urls
const urlCash = "wss://ws.blockchain.info/bch/inv",
	urlCahsBE = "https://cashexplorer.bitcoin.com/", //"https://bitcoincash.blockexplorer.com/",
	urlCore = "wss://ws.blockchain.info/inv",
	urlBlockchainInfo = "https://api.blockchain.info/",
	urlTxhwNode = "https://txhighway-node.herokuapp.com/";

// sockets
const socketCash = new WebSocket(urlCash),
	socketCore = new WebSocket(urlCore),
	socketCashBE = io(urlCahsBE),
	socketTxhwNode = io(urlTxhwNode);

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
	transactionList = document.getElementById("transactions"),
	transactionsWaiting = document.getElementById("tx-waiting"),
	donationGoal = document.getElementById("donationGoal");

// sprites
const carCore = new Image(),
	carMicroCash = new Image(),
	carSmallCash = new Image(),
	carSmallMedCash = new Image(),
	carMediumCash = new Image(),
	carLargeCash = new Image(),
	carXLargeCash = new Image(),
	carWhaleCash = new Image(),
	carUserCash = new Image(),
	carMicroCore = new Image(),
	carSmallCore = new Image(),
	carSmallMedCore = new Image(),
	carMediumCore = new Image(),
	carLargeCore = new Image(),
	carXLargeCore = new Image(),
	carWhaleCore = new Image(),
	carUserCore = new Image(),
	carLambo = new Image(),
	carSpam = new Image(),
	carSatoshiBones = new Image(),
	carSegwit = new Image();

// sound system
let audioContext = null;
let gainNode = null;

// sound variables
let audioMotorcycle = null,
	audioCar = null,
	audioDiesel = null,
	audioSemi = null,
	audioMercy = null,
	audioRide = null,
	audioChaChing = null,
	audioLaCucaracha = null,
	audioSpam = null,
	audioAllSpam = null,
	audioHorns = null,
	audioLaugh = null;

// constants
let WIDTH = null,
	HEIGHT = null,
	SINGLE_LANE = HEIGHT/14,
	SPEED = 8,
	SPEED_MODIFIER = 0.5,
	VOLUME = 0.5,
	PRICE_BCH = 0,
	PRICE_BTC = 0,
	DONATION_GOAL = 2; // goal of donation in bch

// max value for vehicle types
let TX_MICRO = 10,
	TX_SMALL = 1000,
	TX_SMALL_MED = 10000,
	TX_MEDIUM = 100000,
	TX_LARGE = 500000,
	TX_WHALE = 1000000;

// animation
let requestID = null;

// booleans
let isVisible = true,
	konamiActive = false,
	isCashMuted = false,
	isCoreMuted = false,
	isHornsPlaying = false;

// arrays for vehicles
let txCash = [],
	txCore = [],
	feesCore = [],
	feesCash = [];


socketTxhwNode.on("stats", function(data){

	PRICE_BCH = data.bchUSD;
	PRICE_BTC = data.btcUSD;

	document.getElementById("price_bch").textContent = "USD $" + formatWithCommas(parseFloat(PRICE_BCH).toFixed(2));
	document.getElementById("price_btc").textContent = "USD $" + formatWithCommas(parseFloat(PRICE_BTC).toFixed(2));

	cashPoolInfo.textContent = formatWithCommas(data.bchTX);
	corePoolInfo.textContent = formatWithCommas(data.btcTX);

	let mod = data.btcTX/2400/100;

	if (SPEED_MODIFIER == 0.5){
		if (mod >= 0.8){
			SPEED_MODIFIER = 0.2;
		} else {
			SPEED_MODIFIER = 1 - mod;
		}
	}

	let sumVal = data.devDonations;
	sumVal /= 100000000;

	document.getElementById("donationAmt").textContent = sumVal + " BCH";
	document.getElementById("donationTotal").textContent = DONATION_GOAL + " BCH";

	sumVal = sumVal/DONATION_GOAL * 100;
	donationGoal.setAttribute("value", sumVal);

	console.clear();
	console.log(`%c ───█▒▒███
───███████
───████████
─███████████
██───████████
█─▄█▄─████████
█─▀█▀─█████████
██───███████████
─█████████▓▓▓▓██
───███████▓▓▓▓██
───█▀▀▀▀▀███████
───███████▓▓▓▓██
───███████▓▓▓▓██
───███████▓▓▓▓██
───███████▓▓▓▓█
───███████▓▓▄▀
───███████▄▀
───███████
─█████████
██───█████
█─▄█▄─████
█─▀█▀─████
██───████▀
─███████▀
───█▒▒█▀`, "font-family:monospace");
});

socketCashBE.on("connect", function(){
	socketCashBE.emit("subscribe", "inv");
});

socketCashBE.on("tx", function(data){

	let outs = [];
	data.vout.forEach(k =>{
		let addr = Object.keys(k)[0];
		let val = k[addr] / 100000000;
		outs.push({"addr":addr, "value": val});
	});
	
	var txData = {
		"out": outs,
		"hash": data.txid,
		"inputs": [],
		"valueOut": data.valueOut,
		"isCash": true
	}

	setTimeout(() => {
		newTX(true, txData);	
	}, 1000);
	
});

// connect to sockets
socketCash.onopen = ()=>{
	socketCash.send(JSON.stringify({"op":"unconfirmed_sub"}));
	socketCash.send(JSON.stringify({"op":"blocks_sub"}));
}

socketCore.onopen = ()=> {
	socketCore.send(JSON.stringify({"op":"unconfirmed_sub"}));
	socketCore.send(JSON.stringify({"op":"blocks_sub"}));
}

socketCash.onmessage = (onmsg) =>{
	let res = JSON.parse(onmsg.data);

	if (res.op == "utx"){
		newTX(true, res.x);
	} else {
		blockNotify(res.x, true);
	}
}

socketCore.onmessage = (onmsg)=> {
	let res = JSON.parse(onmsg.data);

	if (res.op == "utx"){
		let t = parseInt(corePoolInfo.textContent.replace(/\,/g,''));			
		corePoolInfo.textContent = formatWithCommas(t +1);
		
		res.x.inputs.forEach(i => {
            if (JSON.stringify(i.script).length < 120){
				res.x["sw"] = true;
            }
		});

		newTX(false, res.x);
	} else {
		blockNotify(res.x, false);
		
	}
}

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
	carSmallMedCash.src = "assets/sprites/bch-small-med.png";
	carMediumCash.src = "assets/sprites/bch-medium.png";
	carLargeCash.src = "assets/sprites/bch-large.png";
	carXLargeCash.src = "assets/sprites/bch-xlarge.png";
	carWhaleCash.src = "assets/sprites/bch-whale.png";
	carUserCash.src = "assets/sprites/tx-taxi.png"; 
	carLambo.src = "assets/sprites/lambo.png";
	carSatoshiBones.src = "assets/sprites/bones.png";

	//core vehicles
	carMicroCore.src = "assets/sprites/core-micro.png";
	carSmallCore.src = "assets/sprites/core-small.png";
	carSmallMedCore.src = "assets/sprites/core-small-med.png";
	carMediumCore.src = "assets/sprites/core-medium.png";
	carLargeCore.src = "assets/sprites/core-xlarge.png";
	carXLargeCore.src = "assets/sprites/core-large.png";
	carWhaleCore.src = "assets/sprites/core-whale.png";
	carUserCore.src = "assets/sprites/tx-taxi.png";
	carSpam.src = "assets/sprites/spam.png";
	carSegwit.src = "assets/sprites/segwit.png";

	// hide signes on small screens
	if(mobileCheck()) {
		$("input.overlay-switch")[0].checked = true;
		$( ".sign" ).fadeToggle( "slow", "linear" );
	}

	// assign audio context
	let AudioContext = window.AudioContext || window.webkitAudioContext || false;
	if (AudioContext) {
		let audioContextCall = window.AudioContext || window.webkitAudioContext;
		audioContext = new audioContextCall;
		gainNode = audioContext.createGain();
	} else {
        alert("Sorry, but the Web Audio API is not supported by your browser. Please, consider upgrading to the latest version or downloading Google Chrome or Mozilla Firefox");
	}

	// assign sounds to variables
	loadSound("assets/audio/motorcycle-lowergain.mp3", "motorcycle")
	loadSound("assets/audio/car-pass-lowergain.mp3", "car");
	loadSound("assets/audio/diesel-pass.mp3", "diesel");
	loadSound("assets/audio/semi-pass.mp3", "semi");
	loadSound("assets/audio/mercy-6s.mp3", "mercy");
	loadSound("assets/audio/ride-dirty-7s.mp3", "ride");
	loadSound("assets/audio/cha-ching.mp3", "cha-ching")
	loadSound("assets/audio/la-cucaracha.mp3", "la-cucaracha");
	loadSound("assets/audio/spam.mp3", "spam");
	loadSound("assets/audio/allspam.mp3", "allspam");
	loadSound("assets/audio/horns.mp3", "horns");
	loadSound("assets/audio/evil-laugh.mp3", "laugh");

	// set initial volume
	gainNode.gain.setTargetAtTime(VOLUME, audioContext.currentTime, 0.015);

	// start animation
	requestID = requestAnimationFrame(animate);

	getCoreConfTime(urlBlockchainInfo + "charts/avg-confirmation-time?format=json&cors=true");

	// remove loading screen
	onReady(function () {
		show('page', true);
		show('loading', false);
	});
}

function mobileCheck(){
	let check = false;
	(function(a,b){
		if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))
			check=true;
	})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

// adds thousands seperator to large numbers
function formatWithCommas(x){
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");	
}

// notify users when a new block is found
function blockNotify(data, isCash){
	let t = 0;
	let ticker = "";
	let amount = 0;

	if(isCash){
		ticker = "BCH";
		t = parseInt(cashPoolInfo.textContent.replace(/\,/g,''));
		amount = data.nTx;
	} else {
		ticker = "BTC";
		t = parseInt(corePoolInfo.textContent.replace(/\,/g,''));
		amount = data.nTx;

		// sets speed modifier for btc lane
		let mod = t/amount/100;
		if (mod >= 0.8){
			SPEED_MODIFIER = 0.2;
		} else {
			SPEED_MODIFIER = 1 - mod;
		}

		getCoreConfTime(urlBlockchainInfo + "charts/avg-confirmation-time?format=json&cors=true");

	}

	//if (isVisible) 
	playSound(audioChaChing);
	
	confirmedAmount.textContent = amount + "x " + ticker;
	confirmedNotify.style.display = "block"; //no pun intended
	 setTimeout(() => {	confirmedNotify.style.display = "none";	}, 4000); 
}

// get average confirmation time for btc
function getCoreConfTime(url){
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && xhr.status == 200) {
			let obj = JSON.parse(xhr.responseText);
			let confTime = parseInt(obj.values[0].y).toFixed(2) + " MIN+";
			coreEta.textContent = confTime;
		}
	}
	xhr.open("GET", url, true);
	xhr.send(null);
}

// resize the window
function resize(){
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	SINGLE_LANE = HEIGHT/15;

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
		ctx.clearRect(0,0,WIDTH,HEIGHT);
		isVisible = true;
	} else{
		ctx.clearRect(0,0,WIDTH,HEIGHT);
		time = new Date().getTime();

		setTimeout(() => {animate();}, 1000);
		isVisible = false;
	}
});

// create a new transaction
function newTX(isCash, txInfo){
	
	if (isCash){
		let txExsists = false;
		txCash.forEach(e => {
			if(e.id == txInfo.hash) txExsists = true;
		});
		if (txExsists) return;

		let t = parseInt(cashPoolInfo.textContent.replace(/\,/g,''));			
		cashPoolInfo.textContent = formatWithCommas(t +1);

		let randLane = Math.floor(Math.random() * 8) + 3;
		createVehicle(isCash, txCash, txInfo, randLane, true);
	} else {
		let txExsists = false;
		txCore.forEach(e =>{
			if(e.id == txInfo.hash) txExsists = true;
		});
		if (txExsists) return;
		createVehicle(isCash, txCore, txInfo, 12, false);
	}
}

// adds tx info to the side list
function addTxToList(isCash, txid, valueOut, car){
	
	let listItem = document.createElement("LI");
	let anchor = document.createElement("A");
	let text = "txid: " + txid.substring(0, 7) + "...\n";
	text += "value: " + valueOut.toString().substring(0,9);
	
	let textNode = document.createTextNode(text);

	anchor.setAttribute("target", "_blank");
	listItem.setAttribute("style", "background-image: url(" + car.src + ");");

    if (isCash){
		listItem.className = "txinfo-cash";
		anchor.setAttribute("href", "https://bch.btc.com/" + txid);
    } else {
		listItem.className = "txinfo-core";
		anchor.setAttribute("href", "https://btc.com/" + txid);
    }

	anchor.appendChild(textNode);
	listItem.appendChild(anchor);
	transactionList.insertBefore(listItem, transactionList.firstChild);

	if (transactionList.childNodes.length > 50){
		transactionList.removeChild(transactionList.childNodes[transactionList.childNodes.length -1]);
	}
}

// create vehicles and push to an array
function createVehicle(type, arr, txInfo, lane, isCash){
	let donation = false;
	let userTx = isUserTx(txInfo, isCash);
	let sdTx = false;
	let fee = 0;
	let valOut = 0;
	let valIn = 0;

	txInfo.inputs.forEach((input)=>{
		valIn += input.prev_out.value;
	});

	txInfo.out.forEach((tx)=>{
		valOut += tx.value/100000000;
	});
	
	fee = (valIn - valOut *100000000)/100000000;
	
	if (fee < 0) fee = 0;

	if (isCash){
		donation = isDonationTx(txInfo);
		sdTx = isSatoshiBonesTx(txInfo);
	}

	if (fee != 0) updateFees(isCash, fee);

	if(txInfo.valueOut){
		valOut = txInfo.valueOut;
	}

	let car = getCar(valOut, donation, isCash, userTx, sdTx, txInfo.sw);
	let width = SINGLE_LANE * (car.width / car.height);
	let x = -width;

	// fix vehicle positioning to prevent pile ups.
	if (arr.length > 0){
		arr.forEach((key) => {
			if (width >= key.x && lane == key.lane){
				x = key.x - width - 20;
			}
		});
	}

	let item = {
		//type:type,
		id: txInfo.hash,
		car: car,
		x: x,
		lane: lane,
		h: SINGLE_LANE,
		w: width,
		valueOut: valOut,
		donation: donation,
		userTx: userTx,
		isCash: isCash
	};

	arr.push(item);

}

function updateFees(isCash, fee){
	if(isCash){
		fee = fee * PRICE_BCH;
		if (feesCash.length == 100) feesCash.splice(0,1);
		feesCash.push(fee);
		if (feesCash.length == 1) return;
		let total = 0;
		for(var i = 0; i < feesCash.length; i++) total += feesCash[i];

		let avg = total/feesCore.length;
        var avgbch = parseFloat(avg).toFixed(4);
        var valueIsNaN = isNaN(avgbch);
        if (valueIsNaN) {
            document.getElementById("fees-bch").textContent = "~ $0.01";
        } else {
            document.getElementById("fees-bch").textContent = "$" + avgbch;
        }

	} else {
		fee = fee * PRICE_BTC;
		if (feesCore.length == 100) feesCore.splice(0,1);
		feesCore.push(fee);
		if (feesCore.length == 1) return;
		let total = 0;
		for(var i = 0; i < feesCore.length; i++) total += feesCore[i];
		let avg = total/feesCore.length;
		document.getElementById("fees-btc").textContent = "$" + parseFloat(avg).toFixed(2);
	}
}

/* return car based upon transaction size*/
function getCar(valueOut, donation, isCash, userTx, sdTx, sw){
	if (donation == true){
		SPEED = 4;
		return carLambo;
	}

	if(sw) return carSegwit;
	
	// satoshi bones tx
	if(sdTx) return carSatoshiBones;	

	// user tx vehicles need to go here
	if (userTx){
		if (isCash){
			return carUserCash;
		} else {
			return carUserCore;
		}
	}

	let val = 0;
	if (isCash){
		val = valueOut * PRICE_BCH;
	} else {
		val = valueOut * PRICE_BTC;
	}
	
	if (val <= TX_MICRO){
		if (isCash){
			return carMicroCash;
		} else {
			return carMicroCore;
		}

	} else if (val > TX_MICRO && val <= TX_SMALL){
		if (isCash){
			return carSmallCash;
		} else {
			return carSmallCore;
		}
	} else if (val > TX_SMALL && val <= TX_SMALL_MED){	
		if (isCash){
			return carSmallMedCash;
		} else {
			return carSmallMedCore;
		}
	} else if (val > TX_SMALL_MED && val <= TX_MEDIUM){
		if (isCash){
			return carMediumCash;
		} else {
			return carMediumCore;
		}
	} else if (val > TX_MEDIUM && val <= TX_LARGE){
		if (isCash){
			return carLargeCash;
		} else {
			return carLargeCore;
		}
	} else if (val > TX_LARGE && val <= TX_WHALE){
		if (isCash){
			return carXLargeCash;
		} else {
			return carXLargeCore;
		}
	} else if (val > TX_WHALE){
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
	if (carType == carUserCash || carType == carUserCore) {
		playSound(audioLaCucaracha);
	}

	if (carType == carSatoshiBones){
		playSound(audioLaugh);
	}

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
	} else if (carType == carMicroCash ||
		carType == carMicroCore ||
		carType == carSmallCash ||
		carType == carSmallCore ||
		carType == carSmallMedCash ||
		carType == carSmallMedCore){
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
			} else if (sound == "la-cucaracha"){
				audioLaCucaracha = buffer;
			} else if (sound == "spam"){
				audioSpam = buffer;
			} else if (sound == "allspam"){
				audioAllSpam = buffer;
			} else if(sound == "laugh") {
				audioLaugh = buffer;
			} else if (sound == "horns"){
				audioHorns = audioContext.createBufferSource();
				audioHorns.buffer = buffer;
				gainNode.connect(audioContext.destination);
				audioHorns.start(0);
			}
		});
	}
	request.send();
}

// check for donations into the BCF
let isDonationTx = function(txInfo){
	let vouts = txInfo.out;//.vout;
	let isDonation = false;

	vouts.forEach((key)=>{
		let k = key.addr;
		
		if (k == "3ECKq7onkjnRQR2nNe5uUJp2yMsXRmZavC" ||
				k == "3MtCFL4aWWGS5cDFPbmiNKaPZwuD28oFvF") {
					isDonation = true;
					//setTimeout(getDevDonations(), 3000);
		}
	});

	return isDonation;
}

// check for satoshi dice tx
let isSatoshiBonesTx = function(txInfo){
	let satoshiBonesTx = false;

	txInfo.out.forEach((key)=>{
		check(key.addr);
	});

	txInfo.inputs.forEach((key)=>{
		check(key.prev_out.addr);
	});

	function check(k){
		if(k == "1bones76bhLcQ7utrNRG7SfozXWp19tQY" ||
			k == "1bonesBvWUqyFP8Ff5cwtm3RvDTEh4Ydn" ||
			k == "1bonesB8Z4Gj2k7KNiCRh1QzrHTztUqTa" ||
			k == "1bonespxj9YTz9i5qkmAHLUvBjHUGqRj8" ||
			k == "1bonesHoANjGEE9qqLS2yWytHgCBRfc6S" ||
			k == "1bonesKyn7k3nUQdXWFGtbFCUkE3wWnVH" ||
			k == "1bonesTkYwW2AnGpy5GTShZ87ZMbSRKWp" ||
			k == "1bones63rEYAms5Sz1nxVsDpAYGYNfdkd" ||
			k == "1bonesKj4KV6nZqCYe1b21gx39jCKSXxV" ||
			k == "1bonesB8d7sgzio1hweuk8YgFc2q6HHyo" ||
			k == "1bonesU1GG6ErmNAECq9b62kv21V9s2An") satoshiBonesTx = true;
	}

	return satoshiBonesTx;
}

// check for transactions to user's addresses
let isUserTx = function(txInfo, isCash){
	let vouts = txInfo.out;//.vout;
	let isUserTx = false;
	let address = cashAddress.value;


	if(isCash){
		let toLegacyAddress = bchaddr.toLegacyAddress;
		let isLegacyAddress = bchaddr.isLegacyAddress;
		let isBitpayAddress = bchaddr.isBitpayAddress;
		let isCashAddress = bchaddr.isCashAddress;
		let detectAddressFormat = bchaddr.detectAddressFormat;

		let addrType;
		if (address.length > 0){
			try {
				addrType = detectAddressFormat(address);
			}
			catch (err){
				return;
			}
			if (isLegacyAddress(address) || isBitpayAddress(address) || isCashAddress(address)) address = toLegacyAddress(cashAddress.value);

		}
	}

	vouts.forEach((key)=>{
		if (key.addr == address || key.addr == coreAddress.value) isUserTx = true;
	});
	return isUserTx;
}

let time = 0,
	dt = 0;

// loop through transactions and draw them
function drawVehicles(arr){
	let car = null;
	let y = null;
	let width = null;
	let txWaiting = 0;
	let isCash = true;
	
	arr.forEach(function(item, index, object){

		if(!item.isCash && konamiActive) { 
			car = carSpam;
		} else {
			car = item.car;
		}

		let intro = -car.width - SPEED;
		if (!item.isCash) intro = -car.width - SPEED * SPEED_MODIFIER;

		if (item.x > intro){
			if (!item.isPlaying){
				addTxToList(item.isCash, item.id, item.valueOut, car);
				if ((item.isCash && !isCashMuted) || (!item.isCash && !isCoreMuted)) addSounds(car);
			}
			item.isPlaying = true;

			y = (item.lane * SINGLE_LANE) - SINGLE_LANE;
			width = SINGLE_LANE * (car.width / car.height);

			// segwit swerving
			if (item.car == carSegwit){
				if (!item.y) item.y = 0;
				if (!item.d) item.d = 0.3;
				let top = SINGLE_LANE * (item.lane - 1) - SINGLE_LANE/4;
				let bottom = SINGLE_LANE * (item.lane - 1) + SINGLE_LANE/4;
				if (y + item.y > bottom) item.d = -0.3;
				if (y + item.y < top) item.d = 0.3;
				item.y += (item.d * dt);
				y += item.y;
			}
			ctx.drawImage(car, item.x, y, width, SINGLE_LANE);
			
		} else {
			if (!item.isCash) txWaiting += 1;
		}

		if(item.isCash){
			item.x += (SPEED * dt);
		} else {
			let spd = (SPEED * SPEED_MODIFIER);
			item.x += (spd * dt);
			isCash = false;
		}
		
	});

	// update tx offscreen sign
	transactionsWaiting.textContent = txWaiting;

	// play horns if there's more than 5 vehicles off screen
	if(audioHorns && !isCash && !isCoreMuted){
		if (txWaiting > 5 && !isHornsPlaying){
			audioHorns.loop = true;
			audioHorns.connect(gainNode);
			isHornsPlaying = true;
		} else if (txWaiting == 0 && audioHorns.loop == true){
			isHornsPlaying = false;
			audioHorns.loop = false;
			audioHorns.disconnect();
		}
	}
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

	let now = new Date().getTime();
	dt = now - (time || now);
	dt = dt/(1000/60);
	time = now;

	ctx.clearRect(0,0,WIDTH,HEIGHT);
	drawVehicles(txCash);
	drawVehicles(txCore);
	removeVehicles();

	if(isVisible){
		requestID = requestAnimationFrame(animate);
	} else {
		setTimeout(() => {
			animate();
		}, 1000);
	}
}

// adjust speed on slider change
speedSlider.oninput = function(){
	let newSpeed = 16 * (this.value/100);
	SPEED = newSpeed;
}

volumeSlider.oninput = function(){
	let newVol = this.value/100;
	VOLUME = newVol;
	gainNode.gain.setTargetAtTime(VOLUME, audioContext.currentTime, 0.015);
}

$('#tx-list-button').click(function(){
	if (transactionWrap.style.right == '0%'){
		transactionWrap.style.right = '-151px';
	} else {
		transactionWrap.style.right = '0%';
	}
});

$('.nav .legend').hover(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-car fa-truck')
});

$('.global-mute a').click(function(){
    // $(this).next('ul').slideToggle('500');
    $(this).find('i').toggleClass('fa-volume-up fa-volume-off');
    $(this).find('i').toggleClass('pulse pulse-off');
    $('.cash-mute').click();
    $('.core-mute').click();
    return false;
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

$("input.core-mute").change(function() {
	if(this.checked) {
      muteCore();
    } else {
      muteCore();
    }
});

function muteCore(){
	if (isCoreMuted) {
		isCoreMuted = false;
	} else {
		audioHorns.disconnect();
		isCoreMuted = true;
		isHornsPlaying = false;
	}
}

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

		let img = document.createElement("IMG");
		img.setAttribute("src", "assets/core-mode.png");
		img.setAttribute("class", "core-mode");
		document.body.appendChild(img);

		$( ".core-mode" ).fadeToggle( "slow", "linear" );
	} else if (konamiActive == true) {
		konamiActive = false;
		$( ".core-mode" ).fadeToggle( "slow", "linear" );
	}
});

easter_egg.load();

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
