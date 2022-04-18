var style = document.createElement("style");
document.head.appendChild(style);
style.type = "text/css";
style.textContent = "#__bs_notify__ { opacity: 0; } #link, #container { left: 0; right: auto; margin: 0; }";
document.querySelectorAll(".dev, .gs-dev-tools, [preview]").forEach(elem => elem.remove());
