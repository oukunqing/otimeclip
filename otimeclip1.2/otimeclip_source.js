function oTimeClip(id, box, cfg) {
    var _ = this;
    _.id = id || 'otimeclip';
    _.box = box;
    _.config = {
        width: cfg.width || 520,
        height: cfg.height || 50,
        btnWidth: 10,
        clickAble: true,
        moveAble: true,
        moveCall: true,
		dragPlay: cfg.dragPlay || false,
        callback: cfg.callback || null,
        customCallback: cfg.customCallback || {
            save: null, play: null, stop: null
        },
        param: cfg.param || {}
    };

    _.moveAble = false;
	_.btnClick = false;
    _.docMouseMoveEvent = document.onmousemove;
    _.docMouseUpEvent = document.onmouseup;

    _.initial(cfg);

	if(typeof cfg.dragPlay == 'boolean'){
		_.setCache(cfg.dragPlay);
	}
	_.getCache();
}

oTimeClip.prototype.$ = function (id) {
    return document.getElementById(id);
};

oTimeClip.prototype.setting = function (cfg) {
    var _ = this;
    if (typeof cfg != 'undefined') {
        if (typeof cfg.param != 'undefined') {
            _.config.param = cfg.param;
        }
    }
    _.config.lineWidth = _.config.width - _.config.btnWidth * 2;

    _.control = { btnL: null, btnR: null, lineL: null, lineR: null, lblBoard: null };

    _.config.param.playSpeedEnabled = cfg.param.playSpeedEnabled || false;
    _.config.param.playSpeedShow = cfg.param.playSpeedShow || false;

    _.limit = {
        btnW: _.config.btnWidth,
        minL: 0, maxL: _.config.lineWidth, posL: _.config.lineWidth,
        minR: _.config.btnWidth, maxR: _.config.width - _.config.btnWidth, posR: _.config.btnWidth
    };
};

oTimeClip.prototype.initial = function (cfg) {
    var _ = this;

    _.setting(cfg);

    //判断控件是否存在，防止重复
    var oldCanvas = _.$('timeClipCanvas_' + _.id);
    if (oldCanvas != null) {
        _.box.removeChild(oldCanvas);
    }

    _.box.onselectstart = function () { return false; };
    _.box.unselectable = 'on';

    var canvas = document.createElement('div');
    canvas.id = 'timeClipCanvas_' + _.id;
    canvas.className = 'otimeclip-canvas';
    canvas.style.cssText = 'width:' + _.config.width + 'px;';
    canvas.onselectstart = function () { return false; };
    canvas.unselectable = 'on';
	canvas.oncontextmenu = function(){return false;};

    var strSpeed = _.buildPlaySpeed(_.config.param.playSpeed || 1);

    var arrHtml = [
		'<div class="otimeclip-speed" id="divPlaySpeed_' + _.id + '" style="display:none;">' + strSpeed + '</div>',
		'<div class="otimeclip-drag-play"><label><input type="checkbox" class="otimeclip-drag" id="timeClipDrag_' + _.id + '" /><span>拖动播放</span></label></div>',
		'<div class="otimeclip-button" id="timeClipAction_' + _.id + '" style="clear:both;">',
		//'<a class="save" lang="save">保存</a>',
		'<a class="down" lang="down">下载</a>',
		'<a class="play" lang="play">播放</a>',
		'<a class="stop" lang="stop">停止</a>',
		'</div>',
		//微调功能暂时不做
		//'<div class="otimeclip-iconbtn">&nbsp;</div>',
		'<div class="otimeclip-status">截取长度：<label id="timeClipShow_' + _.id + '" class="otimeclip-board">0:00:00</label></div>',
		'<div class="otimeclip-bg" id="timeClipBg_' + _.id + '" lang="B" style="width:' + (_.config.lineWidth) + 'px;"></div>',
		'<div class="otimeclip-line" id="timeClipLineL_' + _.id + '" lang="L" style="width:0px;left:' + (_.config.btnWidth) + 'px;"></div>',
		'<div class="otimeclip-line" id="timeClipLineR_' + _.id + '" lang="R" style="width:0px;right:' + (_.config.width - _.config.btnWidth) + 'px;"></div>',
		'<div class="otimeclip-arrow otimeclip-arrow-left" id="timeClipL_' + _.id + '" lang="L" title="\u5f00\u59cb">&nbsp;</div>',
		'<div class="otimeclip-arrow otimeclip-arrow-right" id="timeClipR_' + _.id + '" lang="R" title="\u7ed3\u675f">&nbsp;</div>'
	];

    canvas.innerHTML = arrHtml.join('');

    _.box.appendChild(canvas);

    _.control = {
        btnL: _.$('timeClipL_' + _.id), btnR: _.$('timeClipR_' + _.id),
        lineB: _.$('timeClipBg_' + _.id), lineL: _.$('timeClipLineL_' + _.id), lineR: _.$('timeClipLineR_' + _.id),
        lblBoard: _.$('timeClipShow_' + _.id), chbDrag: _.$('timeClipDrag_' + _.id)
    };

    for (var key in _.control) {
        var obj = _.control[key];
        obj.onselectstart = function () { return false; };
        obj.unselectable = 'on';
    }

    _.bindEvent();

    var childs = _.$('timeClipAction_' + _.id).childNodes;
    for (var i in childs) {
        if (childs[i].tagName == 'A') {
            childs[i].onclick = function () {
                _.customCallback(this.lang);
            };
        }
    }

    if (_.config.param.playSpeedEnabled) {
        var objSpeed = _.$('playSpeed_' + _.id);
        objSpeed.onchange = function () {
            _.customCallback(this.lang);
        };
        if (_.config.param.playSpeedShow) {
            _.$('divPlaySpeed_' + _.id).style.display = '';
        }
    }

	_.control.chbDrag.onclick = function(){
		_.setCache(this.checked);
	};

    _.showClipTime(_.getLineLength(), _.getClipTime());

    _.initialClip(cfg.param);
};

oTimeClip.prototype.initialClip = function (p) {
    var _ = this, total = _.getTotalSeconds(p.startTime, p.endTime);
    if (isNaN(total)) {
        return false;
    }
    var start = _.toDate(p.startTime).getTime() / 1000;

    var clipStart = _.toDate(p.clipStartTime).getTime() / 1000;
    if (!isNaN(clipStart)) {
        var cl = (clipStart - start) / total * _.config.lineWidth;
        _.setPosition(true, cl, false);
    }

    var clipEnd = _.toDate(p.clipEndTime).getTime() / 1000;
    if (!isNaN(clipEnd)) {
        var cr = (clipEnd - start) / total * _.config.lineWidth + 10;
        _.setPosition(false, cr, false);
    }
};

oTimeClip.prototype.bindEvent = function () {
    var _ = this;
    if (_.config.moveAble) {
        _.control.btnL.onmousedown = function () {
			_.btnClick = true;
            _.mouseDown(event, this);
        };

        _.control.btnR.onmousedown = function () {
			_.btnClick = true;
            _.mouseDown(event, this);
        };
    }
    if (_.config.clickAble) {
        var arr = [_.control.lineB, _.control.lineL, _.control.lineR];
        for (var i in arr) {
            arr[i].onclick = function () {
                _.mouseDown(event, this, true);
            };
        }
    }
};

oTimeClip.prototype.getLineLength = function () {
    var _ = this;
    return { T: _.control.lineB.offsetWidth, L: _.control.lineL.offsetWidth, R: _.control.lineR.offsetWidth };
};

oTimeClip.prototype.setPosition = function (isLeft, x, isLineClick) {
    var _ = this;
    if (isLeft) {
        _.control.btnL.style.left = x + 'px';
        //限位右边按钮
        _.limit.posR = x + _.limit.btnW;
        //设置左边线长
        _.control.lineL.style.width = x + 'px';
    } else {
        _.control.btnR.style.left = x + 'px';
        //限位左边按钮
        _.limit.posL = x - _.limit.btnW;
        //设置右边线长
        _.control.lineR.style.width = (_.config.lineWidth - x + _.limit.btnW) + 'px';
        _.control.lineR.style.left = x + 'px';
    }
    _.callback(isLineClick);
};

oTimeClip.prototype.mouseDown = function (e, obj, isLineClick) {
    var _ = this;
    var pos = this.mouseClick(e);
    var offsetLeft = parseInt(obj.offsetLeft, 10);
    var isLeft = obj.lang == 'L';

    if (isLineClick) {
        var parentOffsetLeft = obj.parentNode.offsetLeft;
        var x = pos.x - offsetLeft - parentOffsetLeft;

        if (obj.lang == 'B') {
            var lineData = _.getLineLength();
            var clipLen = lineData.T - lineData.L - lineData.R;
            //判断落点在左边还是右边
            isLeft = (x - lineData.L) <= Math.floor(clipLen / 2);
            obj = isLeft ? _.control.lineL : _.control.lineR;
        }
        if (isLeft) {
            _.setPosition(true, x, isLineClick);
        } else {
            _.setPosition(false, pos.x - parentOffsetLeft, isLineClick);
        }
		if(_.config.dragPlay){
			_.customCallback('play');
		}
    } else {
        _.moveAble = true;

        obj.onmousemove = _.docMouseMoveEvent;
        obj.onmouseup = _.docMouseUpEvent;
		
        var moveX = e.clientX;
        document.onmousemove = function () {
            if (_.moveAble) {
                var e = _.getEvent();
                var x = offsetLeft + e.clientX - moveX;

                if (isLeft) {
                    if (x >= _.limit.minL && x <= _.limit.posL) {
                        _.setPosition(true, x, isLineClick);
                    }
                } else {
                    if (x <= _.limit.maxR && x >= _.limit.posR) {
                        _.setPosition(false, x, isLineClick);
                    }
                }
            }
        };

        document.onmouseup = function () {
			_.moveAble = false;
			_.callback(true);
			
			if(_.config.dragPlay && _.btnClick){
				_.customCallback('play');
			}
			_.btnClick = false;
        };
    }
};

oTimeClip.prototype.callback = function (isLineClick) {
    var _ = this;
    var param = _.getCallbackParam();

    _.showClipTime(param, param.clipTime);

    if (isLineClick || _.config.moveCall) {
        var func = _.config.callback;
        if (typeof func == 'function') {
            func(param, _);
        }
    }
};

oTimeClip.prototype.customCallback = function (type) {
    var _ = this;
    var func = null;
    var isPlayed = false;
    switch (type) {
        case 'save':
            func = _.config.customCallback.save;
            break;
        case 'down':
            func = _.config.customCallback.down;
            break;
        case 'play':
            func = _.config.customCallback.play;
            isPlayed = true;
            break;
        case 'stop':
            func = _.config.customCallback.stop;
            break;
        case 'speed':
            func = _.config.customCallback.speed;
            break;
    }
    if (typeof func == 'function') {
        //var param = {clipTime: _.getClipTime(), param: _.config.param};
        var param = _.getCallbackParam();
        func(param, _);

        if (isPlayed) {
            //点击播放按钮后，显示播放速度
            _.$('divPlaySpeed_' + _.id).style.display = '';
        }
    }
};

oTimeClip.prototype.showClipTime = function (d, clipTime) {
    if (clipTime.length > 1) {
        this.control.lblBoard.innerHTML = clipTime[2];
    } else {
        this.control.lblBoard.innerHTML = d.T - d.L - d.R;
    }
};

oTimeClip.prototype.getClipTime = function () {
    var _ = this;
    var d = _.getLineLength();
    var startTime = _.config.param.startTime || '';
    var endTime = _.config.param.endTime || '';

    var arr = [];
    var ts = _.getTotalSeconds(startTime, endTime);
    if (ts > 0) {
        //开始秒数
        var ss = parseInt(ts * (d.L / d.T), 10);
        //结束秒数
        var es = parseInt(ts * ((d.T - d.R) / d.T), 10);
        //截取的秒数
        var cs = es - ss;

        arr = [
			_.toString(_.dateAdd(_.toDate(startTime), ss)),
			_.toString(_.dateAdd(_.toDate(startTime), es)),
			_.toTimeFormat(cs),
			cs
		];
    }
    return arr;
};

oTimeClip.prototype.buildPlaySpeed = function (speed) {
    var _ = this;
    var arrSpeed = [];
    if (_.config.param.playSpeedEnabled) {
        arrSpeed.push('播放速度：');
        arrSpeed.push('<select id="playSpeed_' + _.id + '" lang="speed">');

        var arr = [16, 8, 4, 2, 1, -2, -4, -8, -16];

        for (var i in arr) {
            var strSelected = arr[i] == speed ? ' selected="selected"' : '';
            arrSpeed.push('<option value="' + arr[i] + '"' + strSelected + '>' + arr[i] + 'x</option>');
        }

        arrSpeed.push('</select>');
    }
    return arrSpeed.join('');
};

oTimeClip.prototype.getPlaySpeed = function () {
    var speed = 1;
    var obj = document.getElementById('playSpeed_' + this.id);
    if (obj != null) {
        speed = parseInt('0' + obj.value, 10);
        if (speed == 0) {
            speed = 1;
        }
    }
    return speed;
};

oTimeClip.prototype.getCallbackParam = function () {
    var d = this.getLineLength();
    var param = {
        total: d.T, left: d.L, right: d.T - d.R, clip: d.T - d.L - d.R,
        clipTime: this.getClipTime(),
        playSpeed: this.getPlaySpeed(),
        //把参数回传给实例
        param: this.config.param
    };
    return param;
};

oTimeClip.prototype.toTimeFormat = function (seconds) {
    var s = seconds % 60;
    var m = parseInt(seconds / 60, 10) % 60;
    var h = parseInt(seconds / 3600, 10) % 24;
    var d = parseInt(seconds / 24 / 3600, 10);

    var arr = [
		h < 10 ? '0' + h : h,
		m < 10 ? '0' + m : m,
		s < 10 ? '0' + s : s
	];
    return (d > 0 ? d + '(days) ' : '') + arr.join(':');
};

oTimeClip.prototype.dateAdd = function (dt, seconds) {
    dt.setSeconds(dt.getSeconds() + seconds);

    return dt;
};

oTimeClip.prototype.toDate = function (str) {
    return new Date(Date.parse(str.replace(/-/g, "/")));
};

oTimeClip.prototype.toString = function (dt) {
    var _ = this;
    var year = dt.getFullYear();
    if (isNaN(year)) {
        return '';
    }
    if (year < 1900) { year += 1900; }
    var d = [
		year,
		_.padLeft(dt.getMonth() + 1),
		_.padLeft(dt.getDate()),
		_.padLeft(dt.getHours()),
		_.padLeft(dt.getMinutes()),
		_.padLeft(dt.getSeconds()),
		dt.getMilliseconds()
	];
    return d[0] + '-' + d[1] + '-' + d[2] + ' ' + d[3] + ':' + d[4] + ':' + d[5];
};

oTimeClip.prototype.padLeft = function (num) {
    return num < 10 ? '0' + num : num;
};

oTimeClip.prototype.getTotalSeconds = function (startTime, endTime) {
    if (startTime.length > 0 && endTime.length > 0) {
        var dtStart = this.toDate(startTime);
        var dtEnd = this.toDate(endTime);

        return (dtEnd - dtStart) / 1000;
    }
    return 0;
};

oTimeClip.prototype.mouseClick = function (ev) {
    ev = ev || window.event;
    return this.mouseCoords(ev);
};

oTimeClip.prototype.mouseCoords = function (ev) {
    if (ev.pageX || ev.pageY) {
        return { x: ev.pageX, y: ev.pageY };
    }
    return {
        x: ev.clientX + document.body.scrollLeft - document.body.clientLeft,
        y: ev.clientY + document.body.scrollTop - document.body.clientTop
    };
};

oTimeClip.prototype.getEvent = function () {
    return window.event || arguments.callee.caller.arguments[0];
};

oTimeClip.prototype.stopBubble = function (ev) {
    if (ev.stopPropagation) { ev.stopPropagation(); } else { ev.cancelBubble = true; }
    if (ev.preventDefault) { ev.preventDefault(); } else { ev.returnValue = false; }
};


//以下功能用于缓存展开的节点，以防止刷新
oTimeClip.prototype.setCookie = function(name, value, expireMinutes){
	var _ = this;
	if (typeof expireMinutes == 'undefined' || expireMinutes <= 0) {
        document.cookie = name + "=" + escape(value) + ";";
    } else {
        var expDate = new Date();
        expDate.setTime(expDate.getTime() + (8*60*60*1000) + expireMinutes * 60 * 1000);
        document.cookie = name + "=" + escape(value) + ";expires=" + expDate.toGMTString();
    }
};

oTimeClip.prototype.getCookie = function(name){
    var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$$)"));
	return arr != null ? unescape(arr[2]) : '';
};

oTimeClip.prototype.delCookie = function(name) {
    var expDate = new Date();
    expDate.setTime(expDate.getTime() - 1);
    var val = this.getCookie(name);
    if (val != null){
		document.cookie = name + "=" + val + ";expires=" + expDate.toGMTString();
	}
};

oTimeClip.prototype._buildCookieName = function(){
	var _ = this;
	var page = location.href.split('?')[0];
	var pos = page.lastIndexOf('/');
	page = page.substr(pos + 1).split('.')[0];
	return _.id + 'TimeClipCache_' + page;
};

oTimeClip.prototype.setCache = function(isDrag){
	var _ = this, name = _._buildCookieName();
	_.control.chbDrag.checked = isDrag;
	_.config.dragPlay = isDrag;
	//设置Cookie，保存30天
	_.setCookie(name, isDrag?1:0, 30*24*60);
};

oTimeClip.prototype.getCache = function(){
	var _ = this, name = _._buildCookieName();
	var isDrag = _.getCookie(name) == '1' ;
	_.control.chbDrag.checked = isDrag;
	_.config.dragPlay = isDrag;
};