/*
    Copyright (C) 2011 http://code.google.com/p/monkeylabs

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

 $(document).ready(function() {	
	init();	
	
	var isInit = true;
	animateMsg("데이터 로딩 중입니다.", 60000);	
	
	$("body").ajaxStart(function() {
		console.log("LOADING START");
		$('#loader').show();
	});
	
	$("body").ajaxStop(function() {
		console.log("LOADING END");
		displayData();
		$('#loader').fadeOut("slow");
		
		if (isInit) {
			isInit = false;
			hideAnimateMsg(true);			
			startRefreshTimer();
			startRollingTimer(1);
		}
			
	});
	
	setTimeout(function() {
		request();
	}, 300);
	
	initNav();
});

/***************************************************************
 * 데이터 초기화 및 초기화 함수 호출
 */
 var init = function() {	
	// 전역 상수 
	MENU_HOME = 0;
	MENU_FAVORITE = 1;

	REQUEST_STOCK_SUMMARY = 0;
	REQUEST_ITEM_CODE = 1;
	REQUEST_ITEM_SUMMARY_ADD = 2;
	REQUEST_ITEM_SUMMARY = 3;
	
	M_DAUM_STOCK_URL = "http://m.stock.daum.net/m/item/main.daum?code=";
	PC_DAUM_STOCK_URL = "http://stock.daum.net/item/main.daum?code=";
	
	animateMsgTimer = -1;
	
	// Home 메뉴의 코스피, 코스닥, 선물 요약 정보를 저장하는 전역 변수
	kospiInfo = {
		name: "kospi",
		price: "0",
		fluc: "▼0",
		rate: "0%",
		money: [{"foreigner": "0억", "organization": "0억", "individual": "0억"}],
		time: "-",
		url: "http://stock.daum.net/quote/kospi.daum",
		chartTime: ""
	}
	
	kosdaqInfo = {
		name: "kosdaq",
		price: "0",
		fluc: "▼0",
		rate: "0%",
		money: [{"foreigner": "0억", "organization": "0억", "individual": "0억"}],
		time: "-",
		url: "http://stock.daum.net/quote/kosdaq.daum",
		chartTime: ""
	}	

	futureInfo = {
		name: "future",
		price: "0",
		fluc: "▼0",
		rate: "0%",
		money: [{"foreigner": "0계약", "organization": "0계약", "individual": "0계약"}],
		time: "-",
		url: "http://stock.daum.net/quote/future.daum",
		chartTime: ""
	}
	
	// Footer 링크 클릭 처리 
	$("a").click(function() {
		chrome.tabs.create({
			url: $(this).attr("href")
		});		
	});
	
	// Favorite 항목을 저장하는 전역 변수
	favoriteItems = new Array();
	
	// View 초기화 함수 호출
	setCurrentMenu(MENU_HOME);	
	
	initHomeView();
	initFavoriteView();
 }
 
 var initHomeView = function() {	
	// Home 메뉴 하이라이트 처리
	$("#home .item").hover(
		function() {
			stopRollingTimer();
			highlightHomeItem($(this).index(), false);
		},		
		
		function() {
			startRollingTimer($(this).index() + 1);
		}
	);
	
	// Kospi 클릭 처리
	$("#kospi").click(function() {
		chrome.tabs.create({
			url: kospiInfo.url
		});
	});
	
	// Kosdaq 클릭 처리
	$("#kosdaq").click(function() {
		chrome.tabs.create({
			url: kosdaqInfo.url
		});
	});

	// 선물 클릭 처리
	$("#future").click(function() {
		chrome.tabs.create({
			url: futureInfo.url
		});		
	});
	
	$("#chart-container").click(function() {
		return false;
	})
	
	// Home에서 탭 처리 비활성화
	$("*").keydown(function(event) {
		if (event.keyCode == 9 && getCurrentMenu() == MENU_HOME)
			return false;
	});
 }
 
 var initFavoriteView = function() {
	// 스크롤 처리
	//$("#item-container").scrollbar();	
 	
	// Favorite 메뉴 하이라이트 처리
	$("#favorite .item").live("hover", function() {
		highlightFavoriteItem($(this));
	});
	
	// Favorite 아이템 클릭 처리
	$("#favorite .item").live("click", function() {
		chrome.tabs.create({
			url: favoriteItems[$(this).index()].url
		}, function() {		
		});
	});
	
	// Favorite 아이템 삭제 처리
	$("#favorite .delete-icon").live("click", function() {
		$(this).parent("#favorite .item").fadeOut(400, function() {
			// 내부 리스트에서 데이터 제거 
			removeFavoriteItem($(this).find("div.title").text());
			
			// HTML View 제거
			$(this).remove();
		});
		
		return false;
	});
	
	// Favorite 종목 검색 처리
	$("#search-input").keyup(function(event) {
		if (event.keyCode == '13') {
			if ($(this).val().length > 0)
				$("#search-button").click();
		
			return false;
		}
		return true;
	});
	
	$("#search-button").click(function() {		
		var text = $("#search-input").val();
		if (text.length > 0) {
			var queryUrl = "http://provider.finance.daum.net/xml/widget/stock/widget.xml?item=" + text;
			//console.log("[QUERY FAVORITE ITEMS] " + queryUrl);
			
			var dummy;
			requestAjax(queryUrl, dummy, REQUEST_ITEM_CODE);
			
			$("#search-input").val("");
		}
	});
	
	// 사용자 Favorite 데이터 로드	
	loadUserFavoriteData();

	// 페이지 로드 시 input 요소가 포커스를 가지면서 발생하는 현상 예외 처리
	$("#search-input").hide();
	window.setTimeout(function(){
		$("#search-input").show();	
	}, 500);
 }
 
 var startRefreshTimer = function() {	
	console.log("[STARTREFRESHTIMER]");
	stopRefreshTimer();
	
	window.home["refreshTimer"] = setInterval(function() {
		request();
	}, 60000);
	
	return window.home["refreshTimer"];
 }
 
 var stopRefreshTimer = function() {
	console.log("[STOPREFRESHTIMER]");
	stopTimer(window.home["refreshTimer"]);
 }
 
  var startRollingTimer = function(startIndex) {
	console.log("[STARTROLLINGTIMER]");
	stopRollingTimer();
	
	window.home["rollingTimer"] = setInterval(function() {	
		console.log("onRolling");
		
		if (getCurrentMenu() != MENU_HOME) {
			stopRollingTimer();
		} else {
			highlightHomeItem(startIndex++, true);
		}
	}, 5000);
	
	return window.home["rollingTimer"];
 }
 
 var stopRollingTimer = function() {
	console.log("[STOPROLLINGTIMER]");
	stopTimer(window.home["rollingTimer"]); 
 }
  
 var stopTimer = function(id) {
	clearInterval(id);
 }
 
 var startUITimer = function(menuId) {
 	switch (menuId) {
	case MENU_HOME:
		var $item = $("#home .item");
		var index = 0;
		
		for (index; index < $item.length; index++) {
			if ($item.eq(index).hasClass("highlight"))
				break;
		}
		
		startRollingTimer(index + 1);
		break;
		
	case MENU_FAVORITE:
		break;
	}
 }
 
 var stopUITimer = function(menuId) {
	switch (menuId) {
	case MENU_HOME:
		stopRollingTimer();
		break;
	
	case MENU_FAVORITE:
		break;
	}
 }

/***************************************************************
 * Ajax 데이터 분석 관련 코드
 */
var requestAjax = function(url, data, type) {
	$.ajax({
		"url": url,
		cache: false,
		success: function(html) {
			switch (type) {
			case REQUEST_STOCK_SUMMARY:
				onRequestStockSummary(html, data);
				break;

			case REQUEST_ITEM_CODE:
				onRqeuestItemCode(html, data)
				break;
			
			case REQUEST_ITEM_SUMMARY_ADD:
				onRequestItemSummary(html, data, true);
				break;
				
			case REQUEST_ITEM_SUMMARY:
				onRequestItemSummary(html, data, false);
				break;
			}		
		}, 
		error: function(xhr, ajaxOptions, thrownError) {
			animateMsg("[" + xhr.statusText + "] " + "데이터를 로드하지 못했습니다.<br /> \
			인터넷 연결 확인 후 다시 실행해보세요.", 60000);
		}
	});
}

var onRequestStockSummary = function(html, data) {
	// 지수
    var regExp = /<em.*"price".*/g;
    var tmp = html.match(regExp) + "";
	 
	regExp = /<em.*">|<.*em>/g;
	var price = tmp.replace(regExp, '');

	// 등락 지수
    regExp = /<em.*"price_fluc".*/g;
    tmp = html.match(regExp) + "";
	 
	regExp = /<em.*">|<.span>|<.em>/g;
	var fluc = tmp.replace(regExp, '');
	
	// 등락 퍼센티지
    regExp = /<em.*"rate_flucs".*/g;
    tmp = html.match(regExp) + "";
	 
	regExp = /<em.*">|<.*em>/g;
	var rate = tmp.replace(regExp, '');
	
	// 투자자별 거래량
    regExp =  /<em.*"price\s.*".*em>/g;
    tmp = html.match(regExp) + "";
	
	regExp = /[^0-9|,억계약-]/g;
	var money = tmp.replace(regExp, '');
	money = money.replace(/억,/g, "억|");
	money = money.replace(/약,/g, "약|");
	var moneyArray = money.split('|');

	// 시간 정보
	regExp = /<span.*timeInfo.*span>/g
	tmp = html.match(regExp) + "";
	
	regExp = /<span.*date.>|<span.*time.>|<.span>|<span.*msg.>|\s/g;
	var time = tmp.replace(regExp, '');
		
	// 차트 시간 정보
	var chartTime = ($(html).find("#1dChart").attr("src"));
	regExp = /date=[0-9]*/g;
	chartTime = chartTime.match(regExp) + "";
	
	console.log(time);
	
	data.price = price;
	data.fluc = fluc;
	data.rate = rate;
	data.money[0].foreigner = moneyArray[0];
	data.money[0].organization = moneyArray[1];
	data.money[0].individual = moneyArray[2];
	data.time = time;
	data.chartTime = chartTime;

	console.log(data.name + ': ' + data.price + ' ' + data.fluc + ' ' + data.rate + ' ' + data.money[0].foreigner + ' ' + data.money[0].organization + ' ' + data.money[0].individual + ' ' + data.chartTime);
}

var onRqeuestItemCode = function(html, data) {
	var count = $(html).find("data").attr("totalCount");
	var code = $(html).find("list").attr("code");
	var name = $(html).find("stockname").text();
	var url = $(html).find("url").text();
	
	console.log("[ONRQEUESTITEMCODE] " + code + " " + name + " " + url);
	
	if (count > 0) {
		if (!checkDuplicateItem(code)) {	
			var queryUrl = M_DAUM_STOCK_URL + code;
			requestAjax(queryUrl, favoriteItems, REQUEST_ITEM_SUMMARY_ADD);
		}
	} else {
		animateMsg("관련 데이터가 존재하지 않습니다.<br />다시 입력해주세요.", 2000);
	}
}

var onRequestItemSummary = function(html, data, isAppend) {	
	var item = new Object();
	var stockCode = $(html).find("span.stock_code").text();
	
	item = {
		name: $(html).find("h2.name > a").text(), 
		code: stockCode,
		time: $(html).find("span.timeInfo").eq(0).text().trim().split('\t').join(''),
		price: $(html).find("span.price").text(), 
		fluc: $(html).find("span.price_fluc").text(), 
		rate: $(html).find("span.rate_fluc").text(),
		url:  PC_DAUM_STOCK_URL + stockCode
	};	
	
	if (isAppend) {
		data.push(item);
		saveFavoriteItems();
		addFavoriteItemOnView(item.name, item.price, item.fluc, item.rate);
	} else {
		replaceFavoriteItem(item);
		displayFavoriteData();
	}
	
	console.log("[ONREQUESTITEMSUMMARY] " + "COUNT [" + favoriteItems.length + "] " + item.name + " " + item.code + " " + " " + item.time + " " + item.price + " " + item.fluc + " " + item.rate + " " + item.url);
}

var checkDuplicateItem = function(code) {
	var length = favoriteItems.length;
	for (var index = 0; index < length; index++) {
		if (favoriteItems[index].code == code)
			return true;
	}
	
	return false;
}

var request = function() {
	switch(getCurrentMenu()) {
	case MENU_HOME:
		requestAjax("http://m.stock.daum.net/m/quote/kospi.daum", kospiInfo, REQUEST_STOCK_SUMMARY);
		requestAjax("http://m.stock.daum.net/m/quote/kosdaq.daum", kosdaqInfo, REQUEST_STOCK_SUMMARY);
		requestAjax("http://m.stock.daum.net/m/quote/future.daum", futureInfo, REQUEST_STOCK_SUMMARY);	
		break;
		
	case MENU_FAVORITE:
		for (var index = 0; index < favoriteItems.length; index++) {
			requestAjax(M_DAUM_STOCK_URL + favoriteItems[index].code, null, REQUEST_ITEM_SUMMARY);
		}
		break;	
	}
}

var displayData = function() {
	switch(getCurrentMenu()) {
	case MENU_HOME:
		displayFavoriteData();		
		displayHomeData();		
		break;
		
	case MENU_FAVORITE:
		displayHomeData();
		displayFavoriteData();						
		break;	
	}
}

var displayHomeData = function() {
	//////////////////////////////////////////////////////////////
	// 코스피 정보
	var $kospi = $("#kospi span");
	$kospi.eq(0).text(kospiInfo.price);
	$kospi.eq(1).html(kospiInfo.fluc + "<br/>" + kospiInfo.rate);
	styleTextColor(kospiInfo.rate, $("#kospi .text"));	
	
	// 투자자별 거래 동향
	var $money = $("#kospi .money");
	$money.eq(0).text(kospiInfo.money[0].foreigner);
	$money.eq(1).text(kospiInfo.money[0].organization);
	$money.eq(2).text(kospiInfo.money[0].individual);		
	styleTextColor2(kospiInfo.money[0].foreigner, $money.eq(0));
	styleTextColor2(kospiInfo.money[0].organization, $money.eq(1));
	styleTextColor2(kospiInfo.money[0].individual, $money.eq(2));			
	
	//////////////////////////////////////////////////////////////
	// 코스닥 정보 
	var $kosdaq = $("#kosdaq span");
	$kosdaq.eq(0).text(kosdaqInfo.price);
	$kosdaq.eq(1).html(kosdaqInfo.fluc + "<br/>" + kosdaqInfo.rate);
	styleTextColor(kosdaqInfo.rate, $("#kosdaq .text"));

	// 투자자별 거래 동향
	$money = $("#kosdaq .money");
	$money.eq(0).text(kosdaqInfo.money[0].foreigner);
	$money.eq(1).text(kosdaqInfo.money[0].organization);
	$money.eq(2).text(kosdaqInfo.money[0].individual);
	styleTextColor2(kosdaqInfo.money[0].foreigner, $money.eq(0));
	styleTextColor2(kosdaqInfo.money[0].organization, $money.eq(1));
	styleTextColor2(kosdaqInfo.money[0].individual, $money.eq(2));
	
	//////////////////////////////////////////////////////////////
	// 선물 정보
	var $future = $("#future span");
	$future.eq(0).text(futureInfo.price);
	$future.eq(1).html(futureInfo.fluc + "<br/>" + futureInfo.rate);
	styleTextColor(futureInfo.rate, $("#future .text"));
	
	// 투자자별 거래 동향
	$money = $("#future .money");
	$money.eq(0).text(futureInfo.money[0].foreigner);
	$money.eq(1).text(futureInfo.money[0].organization);
	$money.eq(2).text(futureInfo.money[0].individual);		
	styleTextColor2(futureInfo.money[0].foreigner, $money.eq(0));
	styleTextColor2(futureInfo.money[0].organization, $money.eq(1));
	styleTextColor2(futureInfo.money[0].individual, $money.eq(2));
	
	// 차트 정보 업데이트
	var $chart = $("#kospi .chart");
	$chart.eq(0).attr("src", "http://chart.finance.daum.net/time/kospivolume-1-198140.png?" + kospiInfo.chartTime);
	$chart.eq(1).attr("src", "http://chart.finance.daum.net/time/kosdaqvolume-1-198140.png?" + kosdaqInfo.chartTime);
	$chart.eq(2).attr("src", "http://chart.finance.daum.net/time/futurevolume-1-198140.png?" + futureInfo.chartTime);

	// 업데이트 시간 표시
	var $timeInfo = $(".time");
	var $highlightItem = $("#home .highlight");
	switch ($highlightItem.index()) {
		case 0:
			$timeInfo.text(kospiInfo.time);
			break;
		case 1:
			$timeInfo.text(kosdaqInfo.time);
			break;
		case 2:
			$timeInfo.text(futureInfo.time);
			break;
	}
}

var displayFavoriteData = function() {
	//////////////////////////////////////////////////////////////
	// Favorite 정보	
	var $items = $("#favorite .item");
	var $timeInfo = $(".time");
	
	var length = favoriteItems.length;	
	for (var index = 0; index < length; index++) {
		$items.eq(index).find(".title").text(favoriteItems[index].name);
		$items.eq(index).find("span").eq(0).html(favoriteItems[index].price + "<br />");
		$items.eq(index).find("span").eq(1).text(favoriteItems[index].fluc + " " + favoriteItems[index].rate);		
		$timeInfo.text(favoriteItems[index].time);
	}	
	 
	$("#favorite .item").each(function() {
		styleTextColor3($(this).find("span").eq(1).text(), $(this).find(".text"));
	});
}

var addFavoriteItemOnView = function(name, price, fluc, rate) {	
	var $item = $("<div></div>").addClass("item").addClass("clickable");
	var $deleteIcon = $("<img />").addClass("delete-icon").attr("src", "images/delete16x16-0.png");
	var $title = $("<div></div>").addClass("title").addClass("text-ellipsis").text(name);
	var $summaryContainer = $("<div></div>").addClass("text");
	var $price = $("<span></span>").addClass("price").html(price + "<br/>");
	var $rate = $("<span></span>").text(fluc + " "+ rate);	
		
	$item.append($deleteIcon).append($title).append($summaryContainer.append($price).append($rate));	
	$("#item-container").append($item);
	
	highlightFavoriteItem($item);
}

var replaceFavoriteItem = function(item) {
	var index = indexFavoriteItem(item.name);
	if (index < 0)
		return -1;

	favoriteItems.splice(index, 1, item);
	return 0;
}

var removeFavoriteItem = function(name) {	
	var index = indexFavoriteItem(name);
	if (index < 0)
		return -1;
		
	favoriteItems.splice(index, 1);
	
	// 디버깅 정보 출력	
	var length = favoriteItems.length;
	for (var i = 0; i < length; i++) {
		console.log("[REMOVEFAVORITEITEM]" + "[" + i + "]" + favoriteItems[i].name);
	}
	
	// 로컬 스토리지에서 제거 후 다시 로드
	clearUserFavoriteData();
	saveFavoriteItems();
	
	return 0;
}

var indexFavoriteItem = function(name) {
	var index = 0;
	var length = favoriteItems.length;
	
	for (index; index < length; index++) {
		if (favoriteItems[index].name == name)
			break;
	}
	
	return index;
}

var styleTextColor = function(value, $target) {		
	revertDefalutColor($target);
	
	if (value.indexOf("-") >= 0)
		$target.addClass("text-blue");
	else if (value.indexOf("+") >= 0)
		$target.addClass("text-red");
	else 
		$target.addClass("text-gray");
}

var styleTextColor2 = function(value, $target) {		
	revertDefalutColor($target);
	
	if (value.indexOf("-") >= 0)
		$target.addClass("text-blue");
	else if (value != "0억" && value != "0계약")
		$target.addClass("text-red");
	else 
		$target.addClass("text-gray");			
}

var styleTextColor3 = function(value, $target) {		
	revertDefalutColor($target);
	
	if (value.indexOf("▼") >= 0 || value.indexOf("↓") >= 0)
		$target.addClass("text-blue");
	else if (value.indexOf("▲") >= 0 || value.indexOf("↑") >= 0)
		$target.addClass("text-red");
	else 
		$target.addClass("text-gray");			
}

var revertDefalutColor = function($target) {
	if ($target.hasClass("text-red"))
		$target.removeClass("text-red");
	
	if ($target.hasClass("text-blue"))
		$target.removeClass("text-blue");

	if ($target.hasClass("text-gray"))
		$target.removeClass("text-gray");
}

/***************************************************************
 * 메뉴 내비게이션 관련 코드
 */
var initNav =  function() {
	var canvas = document.getElementById("nav");
	var context = canvas.getContext("2d");
	
	// init font sytle
	context.font = "bold 12px '맑은 고딕', gulim, sans-serif";
		
	var homeText = " Home ";
	var favoriteText = " Favorite ";
	var homeWidth = drawMeasureNavText(context, homeText).width;
	var favoriteWidth = drawMeasureNavText(context, favoriteText).width;	
	
	// resize canvas
	canvas.width = homeWidth + favoriteWidth;
	canvas.height = 22;
	
	// draw text home	
	drawNavText(context, homeText, 0, 15);
	drawNavText(context, favoriteText, homeWidth, 15);	
		
	// draw indicator
	drawNavIndicator(context, 0);
	
	// set mouse hover handler
	$('#nav').hover(
		function(event) {
			$('#nav').addClass('clickable');
		},
		function(event) {
			$('#nav').removeClass('clickable');
		}
	);
	
	var isSliding = false;
	
	// set mouse click handler
	$('#nav').click(function(event) {
		var posX = event.clientX - 8; // 8 is padding
		drawNavIndicator(context, posX);
		
		// 슬라이딩 처리		
		var width = $("body").css('width');						
		var $home = $("#pannel");
		
		if (isHomeRequested(context, posX)) {
			console.log("left: " + $("#pannel").offset().left);
			
			if ($home.offset().left != 8 && !isSliding) {
				console.log("[START PANNEL ANIMATION - Home] " + isSliding);				
				isSliding = true;
				
				$("#pannel").animate({left: "+=" + width}, {complete: function() {
					console.log("[END PANNEL ANIMATION - Home] " + isSliding);
					
					isSliding = false;
					setCurrentMenu(MENU_HOME);	
					stopUITimer(MENU_FAVORITE);
					startUITimer(MENU_HOME);
					request();
				}});
			}
		} else if (isFavoriteRequested(context, posX)) {
			console.log('left: ' + $("#pannel").offset().left + " " + width.slice(0, -2));			
			
			if ($home.offset().left != (width.slice(0, -2) - 8) * -1 && !isSliding) {
				console.log("[START PANNEL ANIMATION - Favolite] " + isSliding);				
				isSliding = true;
				
				$("#pannel").animate({left: "-=" + width}, {complete: function() {
					console.log("[END PANNEL ANIMATION - Favolite] " + isSliding);

					isSliding = false;
					setCurrentMenu(MENU_FAVORITE);
					stopUITimer(MENU_HOME);
					startUITimer(MENU_FAVORITE);
					request();
				}});
			}
		}
	});
}

var drawNavText = function(context, text, x, y) {
	context.font = "bold 12px '맑은 고딕', gulim, sans-serif";
	context.fillStyle = "#EEEEEE";
	context.fillText(text, x, y);
}

var drawMeasureNavText = function(context, text) {
	return context.measureText(text);
}

var drawNavIndicator = function(context, currentPosX) {
	var homeWidth = drawMeasureNavText(context, " Home ").width;
	var favoriteWidth = drawMeasureNavText(context, " Favorite ").width;
	var indicatorBgWidth = homeWidth + favoriteWidth;	
	
	if (isHomeRequested(context, currentPosX)) {
		// draw bg
		context.fillStyle = "lightgray";
		context.fillRect(0, 0, indicatorBgWidth, 2);	
		
		// draw current indicator	
		context.fillStyle = "#FC575E";	// red
		context.fillRect(0, 0, homeWidth, 2);				
		
	} else if (isFavoriteRequested(context, currentPosX)) {
	
		context.fillStyle = "lightgray";
		context.fillRect(0, 0, indicatorBgWidth, 2);	
		
		context.fillStyle = "#4EBAFF"; // blue
		context.fillRect(homeWidth, 0, favoriteWidth, 2);		
	}
}

var isHomeRequested = function(context, posX) {
	var homeWidth = drawMeasureNavText(context, " Home ").width;
	var result = false;
	
	if (posX >= 0 && posX < homeWidth) {
		result = true;
	}
	
	return result;
}

var isFavoriteRequested = function(context, posX) {
	var homeWidth = drawMeasureNavText(context, " Home ").width;
	var favoriteWidth = drawMeasureNavText(context, " Favorite ").width;
	var indicatorBgWidth = homeWidth + favoriteWidth;	
	var result = false;
	
	if (posX >= homeWidth && posX < indicatorBgWidth) {	
		result = true;
	}
	
	return result;
}

var setCurrentMenu = function(menuId) {
	window.currentMenu = menuId;
}

var getCurrentMenu = function() {
	return window.currentMenu;
}

/***************************************************************
 * 기타 UI 관련 코드 
 */
var highlightHomeItem = function(index, animation) {
	var $item = $("#home .item");
	var $chart = $("#home .chart");
	var $moneySummary =	$("#home .money-summary");
	var $timeInfo = $(".time");
	
	switch (index % 3) {
		case 0:
			$moneySummary.eq(1).hide();
			$moneySummary.eq(2).hide();
			$moneySummary.eq(0).show();

			$chart.eq(1).hide();
			if (animation) {
				$chart.eq(2).fadeOut("fast", function(){
					$chart.eq(0).fadeIn("fast");
				});
			} else {
				$chart.eq(2).hide();
				$chart.eq(0).show();
			}
			
			$item.eq(1).removeClass("highlight");		
			$item.eq(2).removeClass("highlight");		
			$item.eq(0).addClass("highlight");

			
			$timeInfo.text(kospiInfo.time);						
			break;
		case 1:
			$moneySummary.eq(2).hide();
			$moneySummary.eq(0).hide();
			$moneySummary.eq(1).show();			
			
			$chart.eq(2).hide();
			if (animation) {
				$chart.eq(0).fadeOut("fast", function(){
					$chart.eq(1).fadeIn("fast");
				});			
			} else {
				$chart.eq(0).hide();
				$chart.eq(1).show();
			}
			
			$item.eq(2).removeClass("highlight");		
			$item.eq(0).removeClass("highlight");			
			$item.eq(1).addClass("highlight");
			
			$timeInfo.text(kosdaqInfo.time);
			
			break;
		case 2:
			$moneySummary.eq(0).hide();
			$moneySummary.eq(1).hide();
			$moneySummary.eq(2).show();

			$chart.eq(0).hide();
			if (animation) {
				$chart.eq(1).fadeOut("fast", function(){
					$chart.eq(2).fadeIn("fast");
				});			
			} else {
				$chart.eq(1).hide();
				$chart.eq(2).show();
			}			

			$item.eq(0).removeClass("highlight");		
			$item.eq(1).removeClass("highlight");	
			$item.eq(2).addClass("highlight");		
			
			$timeInfo.text(futureInfo.time);			
			break;
	}
}

var highlightFavoriteItem = function(item) {
	var $highlightItem = $("#favorite .highlight");
	if ($highlightItem.length > 0) {
		$highlightItem.removeClass("highlight");
		$highlightItem.find("img").hide();		
	}
	
	item.addClass("highlight");
	item.find("img").attr("src", "images/delete16x16-" + (item.index() % 6) + ".png").show();	
}

var animateMsg = function(msg, duration) {
	hideAnimateMsg(false);

	var $animateMsg = $('.animateMsg');

	$animateMsg.html(msg);
	$animateMsg.fadeIn(1000);

	animateMsgTimer = setTimeout(function() {
		$animateMsg.fadeOut(1000);
	}, duration);
}

var isAnimateMsgShown = function() {
	var shown = false;
	
	if ($('.animateMsg:visible').length > 0)
		return shown;
	
	return shown;	
}

var hideAnimateMsg = function(effect) {
	if ($('.animateMsg:visible').length > 0) {
		window.clearTimeout(animateMsgTimer);
		effect ? $('.animateMsg').fadeOut(1000) : $('.animateMsg').hide();		
	}
}
	
/***************************************************************
 * 사용자 데이터 저장 관련 코드
 */
 var loadUserFavoriteData = function() {
 	var userItems = loadFavoriteItems();
	
	for (var index = 0; index < userItems.length; index++) {		
		var queryUrl = M_DAUM_STOCK_URL + userItems[index];
		requestAjax(queryUrl, favoriteItems, REQUEST_ITEM_SUMMARY_ADD);
	}
 }
 
 var clearUserFavoriteData = function() {
	localStorage.clear();	
 }
 
 var saveFavoriteItems = function() {	
	clearUserFavoriteData();
	
	for (var index = 0; index < favoriteItems.length; index++) {
		localStorage.setItem("item" + index, favoriteItems[index].code);
	}
 }
 
 var loadFavoriteItems = function() {
	var codeArray = new Array();
	
	for (var index = 0; index < localStorage.length; index++) {
		var code = localStorage.getItem("item" + index)
		if (code.length > 0)
			codeArray.push(code);		
	}
	
	console.log("[LOADFAVORITEITEMS]" + "[" + localStorage.length + "]" + codeArray);
	return codeArray;
 }
 
