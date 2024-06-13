import WaveSurfer from "https://cdn.jsdelivr.net/npm/wavesurfer.js@7/dist/wavesurfer.esm.js";

let defaultClip = 5;
let keyLength = 32;
let longest = 3600;

function populateInputs() {
	let currentTime = new Date();
	let hours = currentTime.getHours();
	let minutes = currentTime.getMinutes();
	let seconds = currentTime.getSeconds();

	let year = currentTime.getFullYear();
	let month = currentTime.getMonth() + 1;
	let day = currentTime.getDate();

	month = (month < 10 ? "0" : "") + month;
	day = (day < 10 ? "0" : "") + day;
	let formattedDate = year + "-" + month + "-" + day;

	let earlyMinutes = minutes;
	let earlyHours = hours;
	if (minutes < defaultClip) {
		earlyHours--;
		earlyMinutes = 60 + minutes - defaultClip;
	} else {
		earlyMinutes -= defaultClip;
	}

	earlyHours = (earlyHours < 10 ? "0" : "") + earlyHours;
	earlyMinutes = (earlyMinutes < 10 ? "0" : "") + earlyMinutes;

	hours = (hours < 10 ? "0" : "") + hours;
	minutes = (minutes < 10 ? "0" : "") + minutes;
	seconds = (seconds < 10 ? "0" : "") + seconds;

	let timeString = hours + ":" + minutes + ":" + seconds;
	let earlyTimeString = earlyHours + ":" + earlyMinutes + ":" + seconds;

	document.getElementById("startInput").value = earlyTimeString;
	document.getElementById("endInput").value = timeString;
	document.getElementById("dateInput").value = formattedDate;
}

function generateKey(length) {
	let result = "";
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(
			Math.floor(Math.random() * charactersLength)
		);
		counter += 1;
	}
	return result;
}

function timeToString(time) {
	let minutes = Math.floor(time / 60);
	let seconds = Math.floor(time % 60);
	minutes = (minutes < 10 ? "0" : "") + minutes;
	seconds = (seconds < 10 ? "0" : "") + seconds;
	return minutes + ":" + seconds;
}

function stringToTime(time) {
	let times = time.split(":");
	let seconds = Number(times[0]) * 60 + Number(times[1]);
	return seconds;
}

function makeClip(key, start, end, date) {
	start = Date.parse(date + " " + start) / 1000;
	end = Date.parse(date + " " + end) / 1000;
	if (end - start > longest || start > end) {
		document.getElementById("clipper").style.display = "none";
		document.getElementById("loading").style.display = "none";
		document.getElementById("exporter").style.display = "none";
		document.getElementById("error").style.display = "block";
	}

	let apiUrl = "/makeaudio/" + key + "/" + start + "/" + end;
	fetch(apiUrl)
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			return response.json();
		})
		.then((data) => {
			wavesurfer.load("/getaudio/" + key + "/");
		})
		.catch((error) => {
			document.getElementById("clipper").style.display = "none";
			document.getElementById("loading").style.display = "none";
			document.getElementById("exporter").style.display = "none";
			document.getElementById("error").style.display = "block";
		});
}

let currentKey = "";

document.getElementById("load").addEventListener("click", async () => {
	currentKey = generateKey(keyLength);
	document.getElementById("clipper").style.display = "none";
	document.getElementById("exporter").style.display = "none";
	document.getElementById("loading").style.display = "block";
	document.getElementById("error").style.display = "none";
	makeClip(
		currentKey,
		document.getElementById("startInput").value,
		document.getElementById("endInput").value,
		document.getElementById("dateInput").value
	);
});

let wavesurfer = WaveSurfer.create({
	container: "#waveform",
	waveColor: "#449183",
	progressColor: "#17473e",
	mediaControls: true,
});

let clipsurfer = WaveSurfer.create({
	container: "#clipWaveform",
	waveColor: "#449183",
	progressColor: "#17473e",
	mediaControls: true,
});

wavesurfer.on("ready", (duration) => {
	document.getElementById("startClip").value = "00:00";
	document.getElementById("endClip").value = timeToString(duration);
	document.getElementById("loading").style.display = "none";
	document.getElementById("clipper").style.display = "block";
});

document.getElementById("setStart").addEventListener("click", async () => {
	document.getElementById("startClip").value = timeToString(
		wavesurfer.getCurrentTime()
	);
});

document.getElementById("setEnd").addEventListener("click", async () => {
	document.getElementById("endClip").value = timeToString(
		wavesurfer.getCurrentTime()
	);
});

document.getElementById("export").addEventListener("click", async () => {
	document.getElementById("error").style.display = "none";
	document.getElementById("loading").style.display = "block";
	document.getElementById("exporter").style.display = "none";
	let start = stringToTime(document.getElementById("startClip").value);
	let end = stringToTime(document.getElementById("endClip").value);
	if (start > end) {
		document.getElementById("clipper").style.display = "none";
		document.getElementById("loading").style.display = "none";
		document.getElementById("exporter").style.display = "none";
		document.getElementById("error").style.display = "block";
	} else {
		let apiUrl = "/makeclip/" + currentKey + "/" + start + "/" + end;
		fetch(apiUrl)
			.then((response) => {
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				return response.json();
			})
			.then((data) => {
				clipsurfer.load("/getclip/" + currentKey);
				wavesurfer.pause();
				document.getElementById("download").href =
					"/getclip/" + currentKey;
				document.getElementById("exporter").style.display = "block";
				document.getElementById("loading").style.display = "none";
			})
			.catch((error) => {
				document.getElementById("clipper").style.display = "none";
				document.getElementById("loading").style.display = "none";
				document.getElementById("exporter").style.display = "none";
				document.getElementById("error").style.display = "block";
			});
	}
});

populateInputs();
