const fs = require("fs-extra");
const puppeteer = require("puppeteer");

const script = `
    window._capture = function(data) {
        if (data.command == "capture") {
            var label = data.label;
            var master = window.animation.master;
            if (label in master.labels)
                master.pause(label);
        }
    }
`;

async function capture(cwd) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.evaluateOnNewDocument(script);
    await page.goto("http://localhost:8000/", { waitUntil: ["load", "domcontentloaded", "networkidle0" ] });
    
    const bannerInfo = await page.evaluate(() => {
        const banner = document.getElementById("banner");
        const labels = [];
        
        for (const [key, value] of Object.entries(window.animation.master.labels)) {
            if (key.startsWith("capture ")) {
                labels.push(key);
            }
        }
        
        return {
            width: banner.offsetWidth,
            height: banner.offsetHeight,
            labels: labels
        };
    });
    
    console.log(bannerInfo);
    
    await page.setViewport({
        width: bannerInfo.width,
        height: bannerInfo.height,
        deviceScaleFactor: 1,
    });
    
    for (const label of bannerInfo.labels) {
        await page.evaluate((data) => {
            window._capture({ command: "capture", label: data.label });
        }, { label: label });
        await page.screenshot({ path: `${cwd}/${label}.png` });
    }
    
    await browser.close();
}

module.exports = capture;
