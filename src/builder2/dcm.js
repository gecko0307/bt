function prepare(document) {
    const head = document.getElementsByTagName("head")[0];
    const body = document.getElementsByTagName("body")[0];
    const link = document.getElementById("link");
    
    // TODO: <meta name="ad.size" content="width=300,height=300">
    
    const clickTag = document.createElement("script");
    clickTag.type = "text/javascript";
    clickTag.innerHTML = ' var clickTag = "https://google.com"; ';
    const nl = document.createTextNode("\n");
    head.appendChild(nl);
    head.appendChild(clickTag);
    link.setAttribute("href", "javascript:void(window.open(window.clickTag))");
    link.setAttribute("aria-label", "Перейти по ссылке в баннере");
}

module.exports = prepare;
