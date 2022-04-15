var origin = location.origin; //"https://banners.smarthead.ru";

var params = new URLSearchParams(window.location.search.substring(1));
var bannerUrl = params.get("url") || "/index.html";
