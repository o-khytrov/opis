var imageWidth = 50;
var imageHeight = 50;
var maxTolerance = 150;
var TrainingSet = [];
var ToleranceTop = [];
var ToleranceBottom = [];

function train() {
    for (var tolerance = 0; tolerance <= maxTolerance; tolerance++) {
        for (var i = 0; i < TrainingSet.length; i++) {
            var matrix = TrainingSet[i]
        }
    }
}


ImageData.prototype.getPixel = function (x, y) {
    var i = (x + y * this.width) * 4;
    return {
        R: this.data[i],
        G: this.data[i + 1],
        B: this.data[i + 2],
        A: this.data[i + 3]
    }
}

ImageData.prototype.setPixel = function (x, y, c) {
    var i = (x + y * this.width) * 4;
    this.data[i] = c.R;
    this.data[i + 1] = c.G;
    this.data[i + 2] = c.B;
    this.data[i + 3] = c.A;
}


//дистанція Хеммінга
function hemmingDistance(a, b) {
    var dist = 0;
    if (a.length != b.length) throw ("Invalid arguments");
    for (var o = 0; o < a.length; o++) {
        if (a[o] != b[o]) { dist++; }
    }
    return dist;

}

//середнє значення компонент пікселя
function avg(pixel) {
    return Math.round((pixel.R + pixel.G + pixel.B) / 3);
}


function luminosity(pixel) {
    return Math.round(0.21 * pixel.R + 0.72 * pixel.G + 0.07 * pixel.B);
}

class tolerance {

    constructor(top, bottom) {
        this.top = top;
        this.bottom = bottom;
    }
}
function buildMatrix(c, method) {
    var context = c.getContext('2d');
    var imageData = context.getImageData(0, 0, c.width, c.height);
    var matrix = new Array();
    for (var y = 0; y < c.height; y++) {
        matrix.push(new Array());
        for (var x = 0; x < c.width; x++) {
            var pixel = imageData.getPixel(x, y);
            if (method == 'm_avg')
                matrix[y].push(avg(pixel))
            else if (method == 'm_red')
                matrix[y].push(pixel.R)
            else if (method == 'm_green')
                matrix[y].push(pixel.G)
            else if (method == 'm_blue')
                matrix[y].push(pixel.B)
            else if (method == 'm_lum')
                matrix[y].push(luminosity(pixel));
        }
    }
    return matrix;
}

//класс розпізнавання
class item {

    constructor() {
        this.name = '';
        this.matrix = new Array();  //матриця зображення   
        this.center = new Array();  //центр контейнера класу розпізнавання
        this.tolerance = new Array();  //массив структур tollerance, (нижня і верхня межа допуску)
        this.binMatrix = new Array();  //бінатрна матриця
        this.etalon = new Array();  //еталонний вектор класу
    }
    calculateCenter = function (delta) {

        let colNumber = this.matrix[0].length;
        for (var col = 0; col < colNumber; col++) {
            var sum = 0;
            for (var row = 0; row < this.matrix.length; row++) {
                var val = this.matrix[row][col];
                sum += val;
            }
            var avg = Math.round(sum / this.matrix.length);
            this.center.push(avg);
            this.tolerance.push(new tolerance(avg + delta, avg - delta));
        }
    }
    buildBinaryMatrix = function () {
        for (var r = 0; r < this.matrix.length; r++) {
            this.binMatrix.push(new Array());
            for (var c = 0; c < this.matrix[r].length; c++) {
                var tolerance = this.tolerance[c];
                this.binMatrix[r][c] = (this.matrix[r][c] > tolerance.bottom && this.matrix[r][c] < tolerance.top) ? 1 : 0;
            }
        }
        var colNumber = this.binMatrix[0].length;
        for (var c = 0; c < colNumber; c++) {
            var e = 0;
            for (var r = 0; r < this.binMatrix.length; r++) {
                if (this.binMatrix[r][c])
                    e++;
            }
            this.etalon.push(e > (this.binMatrix.length / 2) ? 1 : 0);
        }
    }
}

//Інтерфейс програми
var app = new Vue({
    el: '#app',
    data: {
        activeItem: 'training', // закладка
        method: 'm_avg',        // алгоритм побудови матриці зображення
        delta: 20,              // початкове значення Delta
        items: [],              // массив класів розпізнавання
        trainingComlete:false   // тренування завершене, система готова до екзамену
    },
    mounted: function () {
        loadExamImage();
    },
    methods: {
        buildMatrix: function () {
            this.items = [];
            var canvases = this.$el.querySelectorAll('canvas.training');
            for (var canv = 0; canv < canvases.length; canv++) {
                var c = canvases[canv];
                var i = new item();
                i.name = c.getAttribute('name');
                i.matrix = buildMatrix(c, this.method);
                i.calculateCenter(+this.delta);
                i.buildBinaryMatrix();
                this.items.push(i);
            }
            this.trainingComlete = true;
        },
        addImage: function (event) {

            if (event.target.files.length > 0) {
                for (var i = 0; i < event.target.files.length; i++) {
                    var fr = new FileReader();
                    fr.fileName = event.target.files[i].name;

                    fr.onload = function (e) {
                        var img = new Image();
                        img.onload = function () {
                            w = Math.round(this.width),
                                h = Math.round(this.height),
                                c = document.createElement("canvas");
                            c.className = "training";
                            c.setAttribute("name", fr.fileName);
                            c.width = w; c.height = h;
                            document.getElementById('container').appendChild(c);
                            var context = c.getContext("2d");
                            context.drawImage(this, 0, 0, w, h);
                        }
                        img.src = fr.result;
                    }
                    fr.readAsDataURL(event.target.files[i]);
                }
            }
        },
        exam: function () {
            var canvas = document.getElementById("ExamCanvas");
            var examMatrix = buildMatrix(canvas, this.method);
            var ctx = canvas.getContext("2d");
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            for (var x = 0; x < canvas.width; x += 50)
                for (var y = 0; y < canvas.height; y++)
                    imageData.setPixel(x, y, { R: 255, G: 0, B: 0 });

            for (var y = 0; y < canvas.height; y += 50)
                for (var x = 0; x < canvas.width; x++)
                    imageData.setPixel(x, y, { R: 255, G: 0, B: 0 });

            highlightArea(imageData, 0, 0, 50, 'yellow', 100);
            ctx.putImageData(imageData, 0, 0);
            runExam(examMatrix, this.items)

        },
        isActive(menuItem) {
            return this.activeItem === menuItem
        },
        setActive(menuItem) {
            this.activeItem = menuItem
        }
    }
})

function loadExamImage() {
    var image = new Image();
    image.src = "./Map.png";
    image.onload = function () {
        console.log("image loaded");
        var canvas = document.createElement('canvas');
        canvas.setAttribute("id", "ExamCanvas");
        canvas.height = this.height;
        canvas.width = this.width;
        var ctx = canvas.getContext('2d');
        document.getElementById('exam').appendChild(canvas);
        ctx.drawImage(this, 0, 0, this.width, this.height);
    };
}

function highlightArea(imageData, startX, startY, d, color, intensity) {
    const endY = startY + d;
    const endX = startX + d;
    for (y = startY; y < endY; y++)
        for (x = startX; x < endX; x++) {
            var pixel = imageData.getPixel(x, y);
            switch (color) {
                case 'green':
                    pixel.G = Math.min(255, pixel.G + intensity);
                    break;
                case 'blue':
                    pixel.B = Math.min(255, pixel.B + intensity);
                        break;
                case 'yellow':
                    pixel.R = Math.min(255, pixel.R + intensity);
                    pixel.G = Math.min(255, pixel.G + intensity);
                    break;
                default:
                    break;
            }

            imageData.setPixel(x, y, pixel);
        }
}
function getAreaItem(matrix) {
    var startX = 0;
    var endX = 50;
    var startY = 0;
    var endY = 50;
    var exItem = new item();

    for (var x = startX; x < endX; x++) {
        exItem.matrix.push(new Array());
        for (var y = startY; y < endY; y++) {
            exItem.matrix[x].push(matrix[x][y]);

        }
    }

    exItem.calculateCenter(+app.delta);
    exItem.buildBinaryMatrix();

    return exItem;

}
function runExam(examMatrix, items) {
    var exItem = getAreaItem(examMatrix);
    console.log(exItem.etalon);
    for (var i = 0; i < items.length; i++) {
        var distance = hemmingDistance(exItem.etalon, items[i].etalon);
        console.log(items[i].etalon);
        console.log(items[i].name);
        console.log(distance);
    }
}