const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');

function loadKorb(cookie,cb){
	const options = { hostname: "bloomtech.de", port: 443, path: "/Warenkorb", method: 'GET', headers: {'Cookie': 'JTLSHOP='+cookie+';'} }
	const req = https.request(options,(res) => {
		let body = "";
		res.on("data", (chunk) => { body += chunk; }); 
		res.on("end", async () => {
			const doc = cheerio.load(body);
			const korb = [];
			for(const input of doc('li')){
				if(input.attribs.class && input.attribs.class == 'sku'){
					korb.push({artNr:input.children[input.children.length-1].data.trim()})
				}
			};
			let i = 0;
			for(const input of doc('input')){
				if(input.attribs.class && input.attribs.class == 'form-control quantity'){
					korb[i].menge=parseInt(input.attribs.value); i++;
				}
			};
			cb(null,korb);
		});
	});
	req.end();
}

function jtllogin(email,password,token,cookie,cb){
	
	const postData = "jtl_token="+token+"&email="+encodeURIComponent(email)+"&passwort="+encodeURIComponent(password)+"&login=1\n";
	const options = {
		hostname: "bloomtech.de", port: 443, path: "/Konto", method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Cookie': 'JTLSHOP='+cookie+';', 
			'Content-Length': postData.length
		}
	}
	const req = https.request(options,(res) => {
		const newcookie = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
		let body = "";
		res.on("data", (chunk) => { body += chunk; }); 
		res.on("end", async () => { loadKorb(newcookie,cb)}); // next step
	});
	req.write(postData);
	req.end();
}

function getKorb(email,password,cb){
	const req = https.request({ hostname: "bloomtech.de", port: 443, path: "/", method: 'GET' },(res) => {
		let body = "";

		const cookie = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
		res.on("data", (chunk) => { body += chunk; });
		res.on("end", async () => {
			try {
				const doc = cheerio.load(body);
				let token;
				for(const input of doc('input')){
					if(input.attribs.name == 'jtl_token'){
						token = input.attribs.value
					}
				};
				jtllogin(email,password,token,cookie,cb);
			} catch (error) {cb(error.message);};
		});
	});
	req.end();
}

/*

	file ".secrets.json" example:

	{
		"email": "yyyyyyyyyy",
		"password": "xxxxxxxxxx"
	}

*/

const dotSecrets = (()=>{try{return JSON.parse(fs.readFileSync('.secrets.json'))}catch{}})();

getKorb(dotSecrets.email,dotSecrets.password,(err,korb)=>{
	
	if(err) console.log('error',err);

	if(!err) console.log('korb',korb);

});
