(function(win, doc) {
	var defaultSettings = {
		selector: 'svg', //DOM选择器
		flowChartWidth: '500px', //整个流程图的长度
		flowChartHeight: '500px', //整个流程图的高度
		nodeWidth: 150, //节点（格子）的宽度
		nodeHeight: 150, //节点（格子）的高度
		nodeIntervalWidth: 100, //节点（格子）之间间隔的宽度
		nodeIntervalHeight: 77, //节点（格子）之间间隔的高度
		flowChartBGColor: '#C9CABB', //背景色
		flowChartBorderColor: '#DB9019', //边框颜色
		connectLinColor: '#FF0000', //连接线颜色
		arrowColor: '#FBBD06', //箭头颜色
		arrowPosition: 15, //箭头平移位置量 
		dataSource: [],
		method: "single",
		isLeftToRight: true
	};

	function FlowChart(options) {
		var self = this;

		if(!options) {
			throw new Error("请传入配置参数");
		}
		for(i in defaultSettings) {
			if(options[i] === undefined) {
				options[i] = defaultSettings[i]
			}
		}

		for(i in options) {
			if(options.method == "multiple") {
				self.drawFlowChartMultiple(options);
			} else if(options.method == "single") {
				self.drawFlowChartSingleLine(options);
			}
		}
	}

	FlowChart.prototype = {
		//绘制多行多列
		drawFlowChartMultiple: function(self) {
			function getSVGHtml(x, y, item) {
				return '<foreignobject x="' + x + '" y="' + y + '" width="100" height="100">' +
					'<body xmlns="http://www.w3.org/1999/xhtml">' +
					'	<div class="flowChartBox  flex-text-center" style="background-color:' + self.flowChartBGColor + '">' +
					'<div class="deviceCode ">设备号<br/>' +
					item.deviceCode + '</div>' +
					'<div class="procee-planAndActual">' +
					'<div class="item flex-text-center border-bottom-2">' +
					'	工序名称<br/>' + item.process +
					'</div>' +
					'<div class="item flex-text-center">' +
					'计划/实际</br>' + item.plan + '/' + item.actual +
					'</div>' +
					'</div>' +
					'</div>' +
					'</body>' +
					'</foreignobject>';
			}
			/**
			 * 绘制节点（格子） 
			 */
			var mostRowOfCol, svgDataArr = self.dataSource;
			if(svgDataArr && svgDataArr.length > 0) {
				var svgHtml = '';
				//先找出具有多行节点（格子）的所在列，因为这将决定整个流程图的高度
				mostRowOfCol = Math.max.apply(Math, svgDataArr.map(function(o) {
					var idx = o.order.lastIndexOf("-");
					o.orderNoSeparator = o.order;
					if(idx > 0) {
						o.orderNoSeparator = o.order.substring(0, idx); //当前节点位于第几列（即取出分隔符前面的数字）
						return parseInt(o.orderOfSibing = o.order.substring(idx + 1, o.order.length));
					}
					return 0;
				}));

				//根据order字段进行排序，因为可能服务端返回的数据并没有按照order进行排序
				svgDataArr.sort(function(f, s) {
					var fNum = f.order,
						sNum = s.order;
					var fIdx = fNum.indexOf("-"),
						sIdx = sNum.indexOf("-");
					if(fIdx > 0) {
						fNum = fNum.substring(0, fIdx);
					}
					if(sIdx > 0)
						sNum = sNum.substring(0, sIdx);
					return fNum - sNum;
				});

				var widthX = self.nodeWidth,
					heightY = self.nodeHeight;
				var intervalX = widthX + self.nodeIntervalWidth,
					intervalY = heightY + self.nodeIntervalHeight;
				/**
				 * 绘制节点（流程图格）
				 */
				for(var i = 0; i < svgDataArr.length; i++) {
					var item = svgDataArr[i];
					if(item) {
						var rowAndCol = item.order.split('-');
						if(rowAndCol.length == 1) { //当前列只有一个节点（格子）
							//x = intervalX * (parseInt(rowAndCol[0]) - 1) 确定当前节点（格子）的横坐标：每行占的距离 * 当前行 - 1
							//y = (intervalY * mostRowOfCol) / 2  确定当前节点（格子）的横坐标：为最多行的一半
							svgDataArr[i].widthX = intervalX * (parseInt(rowAndCol[0]) - 1);
							svgDataArr[i].heightY = (intervalY * (mostRowOfCol - 1)) / 2;
							svgHtml += getSVGHtml(svgDataArr[i].widthX, svgDataArr[i].heightY, item);
						} else { //当前列有多个节点（格子）
							//当前列有多少行
							var idxOfitem = item.order.indexOf("-"),
								order = item.order;
							if(idxOfitem > 0) //确定当前order是第几行，便于下面找到当前行有多少列
								order = order.substring(0, idxOfitem);
							var currentColHadRow = Math.max.apply(Math, svgDataArr.map(function(o) {
								//这里不直接判断是否以某个字符串开头的原因：因为3和33都是以3开头
								var idx = o.order.indexOf("-");
								if(idx > 0) {
									var num = o.order.substring(0, idx);
									if(num == order) //order开头为当前列的
										return parseInt(o.order.substring(idx + 1, o.order.length));
								}
								return 0;
							}));
							if(currentColHadRow > 0) {
								var rowOfCol = parseInt(rowAndCol[1]); //当前列的第几行
								//x = intervalX * (parseInt(rowAndCol[0]) - 1) 确定当前节点（格子）的横坐标：每行占的距离 * 当前行 - 1
								//(intervalY * mostRowOfCol) / currentColHadRow：每行占的距离
								//y = (eachColHeight * rowOfCol) -  eachColHeight / 2 再向上移动一半

								//每一行占据的高度
								var eachColHeight = (intervalY * mostRowOfCol) / currentColHadRow;
								svgDataArr[i].widthX = intervalX * (parseInt(rowAndCol[0]) - 1);
								svgDataArr[i].heightY = ((eachColHeight * rowOfCol) - (eachColHeight / 2 + intervalY / 2));
								svgHtml += getSVGHtml(svgDataArr[i].widthX, svgDataArr[i].heightY, item);
							}
						}
					}
				}

				/**
				 * 描绘箭线图的位置
				 */
				for(var i = 0; i < svgDataArr.length; i++) {
					var childNode = 0,
						childNodeOrders = [];
					for(var j = i + 1; j < svgDataArr.length; j++) {
						var orderPreArr = svgDataArr[j].orderPre.split(',');
						for(k = 0; k < orderPreArr.length; k++) {
							if(svgDataArr[i].order == orderPreArr[k]) {
								childNode++;
								var idx = svgDataArr[j].order.lastIndexOf("-");
								if(idx > 0)
									childNodeOrders.push(svgDataArr[j].order.substring(idx + 1, svgDataArr[j].order.length))
								else
									childNodeOrders.push(1);
							}
						}
					}
					svgDataArr[i].childNode = childNode;
					svgDataArr[i].childNodeOrders = childNodeOrders;
					//下一列有多少行
					var nextColHadRow = 0;
					for(var j = i + 1; j < svgDataArr.length; j++) {
						if(parseInt(svgDataArr[i].orderNoSeparator) + 1 == parseInt(svgDataArr[j].orderNoSeparator))
							nextColHadRow++;
					}
					svgDataArr[i].nextColHadRow = nextColHadRow;
				}
				for(var i = 0; i < svgDataArr.length; i++) {
					var item = svgDataArr[i];
					var childNodeOrders = item.childNodeOrders;
					if(childNodeOrders && childNodeOrders.length > 0) {
						for(var j = 0; j < childNodeOrders.length; j++) {
							var extrInterval = 0,
								extrIntervalY = 0;
							var arrowLineColor = self.connectLinColor;
							if(childNodeOrders[j] != item.orderOfSibing && item.nextColHadRow > 1)
								extrInterval = 8 * (j + 1) * (item.orderOfSibing % 2 == 0 ? -1 : 1);

							var commonHeight = (intervalY * (mostRowOfCol)) / item.nextColHadRow;
							commonHeight = (commonHeight * (childNodeOrders[j])) - (commonHeight / 2 + intervalY / 2) + heightY / 2
							svgHtml += '<polyline points="' + (item.widthX + widthX) + ',' + (item.heightY + heightY / 2) + ' ' + (item.widthX + widthX + self.nodeIntervalWidth / 2 + extrInterval) + ',' + (item.heightY + heightY / 2) + ' ' + (item.widthX + widthX + self.nodeIntervalWidth / 2 + extrInterval) + ',' + (commonHeight) + ' ' + (item.widthX + widthX + self.nodeIntervalWidth - self.arrowPosition) + ',' + (commonHeight) + '" fill="none" stroke="' + arrowLineColor + '" stroke-width="2" marker-end="url(#arrow)" marker-start="url(#circle)" />';
						}
					}
				}
				document.getElementById(self.selector).innerHTML = svgHtml;
			}
		},
		
		//绘制单行
		drawFlowChartSingleLine: function(self) {
			function getSVGHtml(x, y, item) {
				return '<foreignobject x="' + x + '" y="' + y + '" width="100" height="100">' +
					'<body xmlns="http://www.w3.org/1999/xhtml">' +
					'	<div class="flowChartBox  flex-text-center" style="background-color:' + self.flowChartBGColor + '">' +
					'<div class="deviceCode ">设备号<br/>' +
					item.deviceCode + '</div>' +
					'<div class="procee-planAndActual">' +
					'<div class="item flex-text-center border-bottom-2">' +
					'	工序名称<br/>' + item.process +
					'</div>' +
					'<div class="item flex-text-center">' +
					'计划/实际</br>' + item.plan + '/' + item.actual +
					'</div>' +
					'</div>' +
					'</div>' +
					'</body>' +
					'</foreignobject>';
			}
			var svgDataArr = self.dataSource,
				isLeftToRight = self.isLeftToRight;
			if(svgDataArr && svgDataArr.length > 0) {
				var svgHtml = '';
				var nodeWidthX = self.nodeWidth,
					nodeHeightY = self.nodeHeight,
					IntervalWidthX = self.nodeIntervalWidth,
					IntervalHeightY = self.nodeIntervalHeight;
				var nodePlusIntervalWidthX = nodeWidthX + IntervalWidthX,
					nodePlusIntervalHeightY = nodeHeightY + IntervalHeightY;

				//根据order字段进行排序，因为可能服务端返回的数据并没有按照order进行排序
				svgDataArr.sort(function(f, s) {
					var fNum = f.order,
						sNum = s.order;
					var fIdx = fNum.indexOf("-"),
						sIdx = sNum.indexOf("-");
					if(fIdx > 0) {
						fNum = fNum.substring(0, fIdx);
					}
					if(sIdx > 0)
						sNum = sNum.substring(0, sIdx);
					return fNum - sNum;
				});

				/**
				 * 绘制节点（流程图格）
				 */
				var containerWidth = 1000;
				var manyColCanDisplay = Math.floor((containerWidth + IntervalWidthX) / nodePlusIntervalWidthX); //最多显示的列数
				var svgLeftAndRightMargin = (containerWidth - (manyColCanDisplay * nodeWidthX + (manyColCanDisplay - 1) * IntervalWidthX)) / 2; //SVG左右边距
				for(var i = 0; i < svgDataArr.length; i++) {
					var item = svgDataArr[i];
					if(item) {
						var commonWidth = svgLeftAndRightMargin + nodePlusIntervalWidthX * (i % manyColCanDisplay);
						item.widthX = isLeftToRight == false ? (Math.floor(i / manyColCanDisplay) % 2 == 1 ? (svgLeftAndRightMargin + nodePlusIntervalWidthX * (manyColCanDisplay - i % manyColCanDisplay - 1)) : commonWidth) : commonWidth;
						item.heightY = Math.floor(i / manyColCanDisplay) == 0 ? IntervalHeightY : IntervalHeightY + nodePlusIntervalHeightY * (Math.floor(i / manyColCanDisplay)); //节点纵坐标

						svgHtml += getSVGHtml(item.widthX, item.heightY, item);
					}
				}

				/**
				 * 绘制箭线图
				 */

				for(var i = 0; i < svgDataArr.length; i++) {
					var item = svgDataArr[i];
					if(item && i < svgDataArr.length - 1) {
						var connectLinColor = self.connectLinColor,
							arrowLineSite = '';
						if(isLeftToRight == false) {
							if(Math.floor(i / manyColCanDisplay) % 2 == 0) {
								if((i + 1) % manyColCanDisplay == 0) {
									arrowLineSite = (item.widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY) + ' ' + (item.widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY + IntervalHeightY - self.arrowPosition);
								} else {
									arrowLineSite = (item.widthX + nodeWidthX) + ',' + (item.heightY + nodeHeightY / 2) + ' ' + (item.widthX + nodeWidthX + IntervalWidthX - self.arrowPosition) + ',' + (item.heightY + nodeHeightY / 2);
								}
							} else {
								if((i + 1) % manyColCanDisplay == 0) {
									arrowLineSite = (item.widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY) + ' ' + (item.widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY + IntervalHeightY - self.arrowPosition);
								} else
									arrowLineSite = item.widthX + ',' + (item.heightY + nodeHeightY / 2) + ' ' + (item.widthX - nodeIntervalWidth + self.arrowPosition) + ',' + (item.heightY + nodeHeightY / 2);
							}
						} else {
							if((i + 1) % manyColCanDisplay == 0) {
								arrowLineSite = (item.widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY) + ' ' + (item.widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY + IntervalHeightY / 2) + ' ' + (svgDataArr[i + 1].widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY + IntervalHeightY / 2) + ' ' + (svgDataArr[i + 1].widthX + nodeWidthX / 2) + ',' + (item.heightY + nodeHeightY + IntervalHeightY - self.arrowPosition)
							} else
								arrowLineSite = (item.widthX + nodeWidthX) + ',' + (item.heightY + nodeHeightY / 2) + ' ' + (item.widthX + nodePlusIntervalWidthX - self.arrowPosition) + ',' + (item.heightY + nodeHeightY / 2)
						} 
						svgHtml += '<polyline points="' + arrowLineSite + '" fill="none" stroke="' + connectLinColor + '" stroke-width="2" marker-end="url(#arrow)" marker-start="url(#circle)" />';
					}

				}

				document.getElementById('svg').innerHTML = svgHtml;
			}
		}

	}
	win.FlowChart = FlowChart;
})(window, document)