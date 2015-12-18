var params = getParams();
params.debug = true;
if (params.embed) {
	document.body.className += " embed";
}

//-----------------------------------------
// public methods
//-----------------------------------------
function trim(s) {
	return s.replace(/^\s+/, '').replace(/\s+$/, '');
}
function getParams() {
	var params = location.hash;
	if (!params || params.length < 2) {
		params = {
			embed: false,
			re: "",
			highlight: true,
			flags: ''
		};
	} else {
		params = params.slice(2);
		params = params.split("&").reduce(function(p, a) {
			a = a.split("=");
			p[a[0]] = a[1];
			return p;
		}, {});
		params.embed = params.embed === 'true';
		params.flags = params.flags || '';
		params.re = params.re ? trim(decodeURIComponent(params.re)) : '';
	}
	return params;
}
function $(id) {
	return document.getElementById(id)
}
function $$(q) {
	return document.querySelector(q)
}

// plugin
var raphael = 'src/libs/raphael';
var visualize = 'src/visualize';
var parse = 'src/parse';
var Kit = 'src/Kit';

if (params.debug) {
	document.write('<script src="src/libs/require.js" charset="utf-8"><' + '/script>');
	window.addEventListener('DOMContentLoaded', function() {
		require([raphael, visualize, parse, Kit], init);
	});
} else {
	document.write('<script src="dest/regulex.js" charset="utf-8"><' + '/script>');
	window.addEventListener('DOMContentLoaded', function() {
		raphael = require('regulex').Raphael;
		parse = require('regulex').parse;
		visualize = require('regulex').visualize;
		Kit = require('regulex').Kit;
		
		init(raphael, visualize, parse, Kit);
	});
}

function init(R, visualize, parse, K) {
	var paper = R('graphCt', 10, 10);
	// re.input
	var input = $('input');
	var inputCt = $('inputCt');
	// 按钮
	var visualBtn = $('visualIt');
	var embedBtn = $('embedIt');
	var exportBtn = $('exportIt');
	// error信息
	var errorBox = $('errorBox');
	// re.修正符
	var flags = document.getElementsByName('flag');
	var flagBox = $('flagBox');
	
	var source = $('source'),
		reSelect = $("reSelect");
	
	var getInputValue = function() {
		return trim(input.value);
	};
	var setInputValue = function(v) {
		return input.value = trim(v);
	};
	if (params.flags) {
		setFlags(params.flags);
	}
	if (params.re) {
		setInputValue(params.re);
	}
	
	initListeners();
	dragGraph($('graphCt'));
	visualIt();

	function initListeners() {
		var LF = '\n'.charCodeAt(0),CR = '\r'.charCodeAt(0);
		var onKeyupTid;
		
		input.addEventListener('keydown', function onEnter(e) {
			if (e.keyCode === LF || e.keyCode === CR) {
				e.preventDefault();
				e.stopPropagation();
				visualIt();
			}
		});
		input.addEventListener('keyup', function onKeyup(e) {
			if (e.keyCode === LF || e.keyCode === CR) {
				return true;
			}
			clearTimeout(onKeyupTid);
			onKeyupTid = setTimeout(function() {
				var skipError = true;
				visualIt(skipError);
			}, 100);
		});
		input.addEventListener('paste', function(evt) {
			var content = trim(evt.clipboardData.getData('text'));
			if (content[0] === '/' && /\/[img]*$/.test(content)) {
				evt.preventDefault();
				var endIndex = content.lastIndexOf('/');
				setFlags(content.slice(endIndex + 1));
				content = content.slice(1, endIndex);
				setInputValue(content);
			}
			setTimeout(visualIt, 50);
		});
		visualBtn.addEventListener('click', function() {
			visualIt();
		});
		embedBtn.addEventListener('click', function() {
			if (!visualIt()) return false;
			var src = location.href;
			var i = src.indexOf('#');
			src = i > 0 ? src.slice(0, i) : src;
			changeHash();
			var re = getInputValue();
			var html = '<iframe frameborder="0" width="' + Math.ceil(paper.width) + '" height="' + Math.ceil(paper.height) + '" src="' + src + '#!embed=true&flags=' + getFlags() + '&re=' + encodeURIComponent(re) + '"></iframe>'
			window.prompt("Copy the html code:", html);
		});
		exportBtn.addEventListener('click', function() {
			exportImage();
		});
		for (var i = 0, l = flags.length; i < l; i++) {
			flags[i].addEventListener('change', function onChangeFlags(e) {
				setInnerText(flagBox, getFlags());
				visualIt();
				changeHash();
			});
		}
		
		
		source.addEventListener("keydown", check);
		source.addEventListener("keyup", check);
		reSelect.addEventListener("change", check);
	}
	function visualIt(skipError) {
		var re = getInputValue();
		changeHash();
		hideError();
		var ret;
		try {
			ret = parse(re);
			check();
		} catch (e) {
			if (e instanceof parse.RegexSyntaxError) {
				if (!skipError) {
					showError(re, e);
				}
			} else throw e;
			return false;
		}
		visualize(ret, getFlags(), paper);
		return true;
	}
	function changeHash() {
		var re = getInputValue();
		var flags = getFlags();
		location.hash = "#!embed=false&flags=" + flags + "&re=" + encodeURIComponent(params.re = re);
	}
	function getFlags() {
		var fg = '';
		for (var i = 0, l = flags.length; i < l; i++) {
			if (flags[i].checked) fg += flags[i].value;
		}
		return fg;
	}
	function setFlags(fg) {
		for (var i = 0, l = fg.length; i < l; i++) {
			if (~fg.indexOf(flags[i].value)) flags[i].checked = true;
			else flags[i].checked = false;
		}
		setInnerText(flagBox, fg);
	}
	function getInnerText(ele) {
		if (!ele) return '';
		var node = ele.firstChild,results = [];
		if (!node) return '';
		do {
			if (node.nodeType === document.TEXT_NODE) results.push(node.nodeValue);
			else results.push(getInnerText(node));
		} while (node = node.nextSibling);
		return results.join('');
	}
	function setInnerText(ele, s) {
		ele.innerHTML = '';
		var t = document.createTextNode('');
		t.nodeValue = s;
		ele.appendChild(t);
		return s;
	}
	
	function hideError() {
		errorBox.style.display = 'none';
	}
	function showError(re, err) {
		errorBox.style.display = 'block';
		var msg = ["Error:" + err.message, ""];
		if (typeof err.lastIndex === 'number') {
			msg.push(re);
			msg.push(K.repeats('-', err.lastIndex) + "^");
		}
		setInnerText(errorBox, msg.join("\n"));
	}

	function exportImage() {
		svg = graphCt.getElementsByTagName('svg')[0];
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");
		var img = new Image;
		img.setAttribute('src', svgDataURL(svg));
		canvas.setAttribute('width', svg.clientWidth || parseInt(getComputedStyle(svg).width));
		canvas.setAttribute('height', svg.clientHeight || parseInt(getComputedStyle(svg).height));
		img.onload = function() {
			ctx.drawImage(img, 0, 0);
			location.href = canvas.toDataURL("image/png");
		};
	}
	function svgDataURL(svg) {
		var svgAsXML = (new XMLSerializer).serializeToString(svg);
		return "data:image/svg+xml," + encodeURIComponent(svgAsXML);
	}
	function dragGraph(g) {
		g.addEventListener('mousedown', startMove);

		function startMove(e) {
			clearSelect();
			var x = e.clientX,
				y = e.clientY;
			g.addEventListener('mousemove', onMove);
			document.addEventListener('mouseup', unbind, true);
			window.addEventListener('mouseup', unbind, true);

			function unbind(e) {
				g.removeEventListener('mousemove', onMove);
				document.removeEventListener('mouseup', unbind, true);
				window.removeEventListener('mouseup', unbind, true);
			}

			function onMove(e) {
				var dx = x - e.clientX,
					dy = y - e.clientY;
				if (dx > 0 && g.scrollWidth - g.scrollLeft - g.clientWidth < 2 || dx < 0 && g.scrollLeft < 1) {
					document.documentElement.scrollLeft += dx;
					document.body.scrollLeft += dx;
				} else {
					g.scrollLeft += dx;
				}
				if (dy > 0 && g.scrollHeight - g.scrollTop - g.clientHeight < 2 || dy < 0 && g.scrollTop < 1) {
					document.documentElement.scrollTop += dy;
					document.body.scrollTop += dy;
				} else {
					g.scrollTop += dy;
				}
				x = e.clientX;
				y = e.clientY;
			}
		}
	}

	function clearSelect() {
		if (window.getSelection) {
			if (window.getSelection().empty) { // Chrome
				window.getSelection().empty();
			} else if (window.getSelection().removeAllRanges) { // Firefox
				window.getSelection().removeAllRanges();
			}
		} else if (document.selection) { // IE
			document.selection.empty();
		}
	}
	
/**
 * Method 测试正则表达式函数
 * @param method 接收到的正则表达式类的方法
 */
	function check() {
		var reMethod = reSelect.value,
			flags = getFlags(),
			source = $('source').value, 
			reStr = getInputValue();
		
		var destRegex = $("destRegex"),
			expression = $("expression"),
			returnType = $("returnType"),
			matchResult = $("matchResult"),
			lastIndex = $("lastIndex");
		function reset(){
			destRegex.innerHTML = "";
			expression.innerHTML = "";
			returnType.innerHTML = "";
			matchResult.innerHTML = "";
			lastIndex.innerHTML = "";
		}
		if(!source){
			reset();
			return false;
		}
		//将用户输入的正则表达式的标志转换为小写
		// 如果含有不是g、i、m的字符, 则 提示并返回
		if (flags.search(/[^g|i|m]/g) != -1) {
			alert("flags only can be g, i, m");
			return;
		}
		// 利用用户输入的字符串和标志建立正则表达式
		var re = new RegExp(reStr, flags);
		// 获得并显示生成的正则表达式的字符串形式
		destRegex.innerHTML = re.toString() + ' ';
		// 定义 返回值
		var cr, ex = "new RegExp('" + reStr+ "', '" + flags + "').";
		// 根据用户选择的方法, 进行相应的调用
		switch (reMethod) {
			case '0': // 正则表达式的 exec 方法
				cr = re.exec(source);
				ex = ex + "exec('" + source + "')";
				break;
			case '1': // 正则表达式的 test 方法
				cr = re.test(source);
				ex = ex + "test('" + source + "')";
				break;
			case '2': // 字符串类的 match 方法
				cr = source.match(re);
				ex = "'" + source + "'.match(" + re.toString() + ")";
				break;
			case '3': // 字符串类的 search 方法
				cr = source.search(re);
				ex = "'" + source + "'.search(" + re.toString() + ")";
				break;
			case '4': // 字符串类的 replace 方法
				cr = source.replace(re);
				ex = "'" + source + "'.replace(" + re.toString() + ")";
				break;
			case '5': // 字符串类的 split 方法
				cr = source.split(re);
				ex = "'" + source + "'.split(" + re.toString() + ")";
				break;
		}
		// 获得并显示表达式
		expression.innerHTML = ex.toString();
		// 获得并显示计算结果的类型
		returnType.innerHTML = typeof(cr);
		// 定义结果
		var result = '';
		if (cr != null && typeof(cr) == 'object' && cr.length != null){// 如果计算结果是一个数组, 则取出所有数组的值
			for (i = 0; i < cr.length; i++) {
				result += "array[" + i + "] = '" + cr[i] + "'\n";
			}
		} else if (cr != null){ // 如果计算结果不为null, 则取出计算结果的值
			result = cr;
		}
		// 获得并显示结果
		matchResult.innerHTML = result + ' ';
		// 获得并显示正则表达式的lastIndex属性
		lastIndex.innerHTML = re.lastIndex + ' ';
	}
}