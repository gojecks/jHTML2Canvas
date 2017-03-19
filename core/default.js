
var defaultConfiguration = {
		paperHeight : 1319, //A4 paperHeight
		paperWidth : 1019, //A4 paperWidth
		domUrl :  window.URL || window.webkitURL || window
};

var flag = false,
    prevX = 0,
    currX = 0,
    prevY = 0,
    currY = 0,
    dot_flag = false;

var canvasDrawingX = "black",
    canvasDrawingY = 2;