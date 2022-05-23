		function getParam(url, k, v){
			var params = {}, p;
			try {
				p = url.split("?")[1].split("&");
				for (var i = 0, max = p.length, pair; i < max; i++){
					pair = p[i].split("=");
					(pair[0] && pair[1]) && (params[pair[0]] = pair[1]);
				}
				if (params.hasOwnProperty(k)) return unescape(params[k]);
			} catch(e) {}
			return (v == undefined) ? undefined : v;
		}
		var link1 = getParam(document.location.href, "clickTAG"); 
		function href1(element) { 
			element.href = link1;
		}
	