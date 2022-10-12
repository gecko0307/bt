const branchRegExp = /^(?:(.+)_)?(\d+P?(?:\(\d+P?(?:-\d+P?)?\))?x\d+P?(?:\(\d+P?(?:-\d+P?)?\))?)(?:_(.+))?$/i;
const versionRegExp = /_?([vr]\d+[a-zA-Z-\d]*)/;
const sizeRegExp = /^(\d+P?)(?:\((\d+P?)?(?:-(\d+P?))?\))?x(\d+P?)(?:\((\d+P?)(?:-(\d+P?))?\))?$/i;

function parse(branchName) {
	const [, version = ""] = branchName.match(versionRegExp) || [];
	const public = (version === "" || version.charAt(0) === "v");
	branchName = branchName.replace(versionRegExp, "");
	
	const branchReg = branchName.match(branchRegExp) || [];
	const [input, creative = "", size = branchName, platform = ""] = branchReg;
	const strict = (input !== undefined);
	
	return {
		creative, size, platform, version, public,
		base: branchName,
		props: strict ? parseSize(size) : {},
	};
}

function parseSize(size){
	const regSize = size.match(sizeRegExp);
	return {
		width: regSize[1],
		minWidth: regSize[2],
		maxWidth: regSize[3],
		height: regSize[4],
		minHeight: regSize[5],
		maxHeight: regSize[6],
	};
}

module.exports = parse;
