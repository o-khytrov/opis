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
        this.matrix = new Array();      //матриця зображення   
        this.center = new Array();      //центр контейнера класу розпізнавання
        this.tolerance = new Array();   //массив структур tollerance, (нижня і верхня межа допуску)
        this.binMatrix = new Array();   //бінатрна матриця
        this.etalon = new Array();      //еталонний вектор класу
        this.neighbour = -1;            //індекс класу сусіда
        this.distanceToNeighbour = 0;   //відстань до сусіда
        this.maxKFE = -1;
        this.no_rab_obl_max_KFE = -1;
        //this.kodova_vidstan = new Array();
        this.radius = 0;
        this.no_rab_obl_Radius = 0;
        this.no_rab_obl_dostovirn_D1 = 0;
        this.no_rab_pomylka_betta = 0;
        this.dostovirn_D1 = 0;
    }
    // визначення еталонного вектору
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
    // побудова бінарної матриці
    buildBinaryMatrix = function () {
        for (var r = 0; r < this.matrix.length; r++) {
            this.binMatrix.push(new Array());
            for (var c = 0; c < this.matrix[r].length; c++) {
                var tolerance = this.tolerance[c];
                this.binMatrix[r][c] = (this.matrix[r][c] >= tolerance.bottom && this.matrix[r][c] <= tolerance.top) ? 1 : 0;
            }
        }
        var colNumber = this.binMatrix[0].length;
        for (var c = 0; c < colNumber; c++) {
            var sum = 0;
            for (var r = 0; r < this.binMatrix.length; r++)
                sum += this.binMatrix[r][c];

            this.etalon.push((sum / this.binMatrix.length) >= 0.5 ? 1 : 0);
        }
        this.distanceToNeighbour = this.etalon.length;
    }
}

//Критерій Кульбака
function KFE(kodova_vidstan, c) {
    var k1 = 0;
    var k2 = 0;
    var rowNumber = kodova_vidstan[0].length;
    for (var r = 0; r < rowNumber; r++) {
        if (kodova_vidstan[0][r] <= c) k1++;
        if (kodova_vidstan[1][r] <= c) k2++;
    }
    var td1 = k1 / rowNumber;
    var tbetta = 3 / rowNumber;
    var d1b = td1 - tbetta;
    var kfe = d1b * Math.log((1 + d1b + 0.1) / (1 - d1b + 0.1)) / Math.log(2);
    return { td1, tbetta, kfe };
}

function calculateRadius(items) {

    for (var i = 0; i < items.length; i++) {
        var currentItem = items[i];
        var kodova_vidstan = new Array();
        kodova_vidstan.push(new Array());
        kodova_vidstan.push(new Array());
        for (var r = 0; r < currentItem.binMatrix.length; r++) {
            kodova_vidstan[0][r] = 0;
            kodova_vidstan[1][r] = 0;
            for (var c = 0; c < currentItem.binMatrix[r].length; c++) {
                kodova_vidstan[0][r] += Math.abs(currentItem.etalon[c] - currentItem.binMatrix[c][r]);
                kodova_vidstan[1][r] += Math.abs(currentItem.etalon[c] - items[currentItem.neighbour].binMatrix[c][r]);
            }
        }
        for (var c = 0; c < currentItem.binMatrix[0].length; c++) {
            var kfeRes = KFE(kodova_vidstan, c);

            var kfe = kfeRes.kfe;
            var td1 = kfeRes.td1;
            var tbetta = kfeRes.tbetta;

            if (kfe > currentItem.no_rab_obl_max_KFE) {
                currentItem.no_rab_obl_max_KFE = kfe;
                currentItem.no_rab_obl_Radius = c;
                currentItem.no_rab_obl_dostovirn_D1 = td1;
                currentItem.no_rab_pomylka_betta = tbetta;;
            }
            if (td1 >= 0.5 && tbetta < 0.5 && c < currentItem.distanceToNeighbour) {
                console.log(currentItem.maxKFE);
                if (kfe > currentItem.maxKFE) {
                    currentItem.maxKFE = kfe;
                    currentItem.radius = c;
                    currentItem.dostovirn_D1 = td1;
                    currentItem.pomylka_betta = tbetta;
                }
            }

        }
    }

}

function caclulateDistanceToNeighbours(items) {
    for (var i = 0; i < items.length; i++) {
        for (var j = 0; j < items.length; j++) {
            if (i == j) continue;
            var sum = 0;
            var currentItem = items[i];
            var neighbour = items[j];
            for (var c = 0; c < currentItem.etalon.length; c++)
                sum += Math.abs(currentItem.etalon[c] - neighbour.etalon[c])
            if (sum <= currentItem.distanceToNeighbour) {
                currentItem.neighbour = j;
                currentItem.distanceToNeighbour = sum;
            }

        }
    }
}

//Інтерфейс програми
var app = new Vue({
    el: '#app',
    data: {
        activeItem: 'training', // закладка
        method: 'm_avg',        // алгоритм побудови матриці зображення
        delta: 10,              // початкове значення Delta
        items: [],              // массив класів розпізнавання
        trainingComlete: false, // тренування завершене, система готова до екзамену
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
            caclulateDistanceToNeighbours(this.items);
            calculateRadius(this.items);
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
            fullExam(this.items, this.method);
        },
        isActive(menuItem) {
            return this.activeItem === menuItem
        },
        setActive(menuItem) {
            this.activeItem = menuItem
        },
        reset:function(){
            resetExam()
        }
    }
})

function fullExam(items, method) {
    var canvas = document.getElementById("ExamCanvas");
    var examMatrix = buildMatrix(canvas, method);
    var ctx = canvas.getContext("2d");
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var step = 50;

    for (var x = 0; x < canvas.width; x += step)
        for (var y = 0; y < canvas.height; y++)
            imageData.setPixel(x, y, { R: 255, G: 0, B: 0 });

    for (var y = 0; y < canvas.height; y += step)
        for (var x = 0; x < canvas.width; x++)
            imageData.setPixel(x, y, { R: 255, G: 0, B: 0 });

    for (var r = 0; r < canvas.height; r += step)
        for (var c = 0; c < canvas.width; c += step) {
            console.log();
            var testArea = getAreaItem(examMatrix, r, c, step);
            var testResult = ExamArea(testArea, items);
            var color = 'yellow';
            if(testResult!=-1)
            color = colors[testResult];
            highlightArea(imageData, r, c, step, color, 100);
        }

    ctx.putImageData(imageData, 0, 0);
}
function resetExam (){
    document.getElementById("ExamCanvas").outerHTML = "";
    loadExamImage();
}
function loadExamImage() {
    var image = new Image();
    image.src = "./Map.png";
    image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.setAttribute("id", "ExamCanvas");
        var height = Math.round(this.height / 50) * 50;
        var width = Math.round(this.width / 50) * 50;
        canvas.height = height;
        canvas.width = width;
        var ctx = canvas.getContext('2d');
        document.getElementById('exam').appendChild(canvas);
        ctx.drawImage(this, 0, 0, width, height);
    };
}

//підсвітка ділянки зображення
function highlightArea(imageData, startY, startX, d, color, intensity) {
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
                case 'red':
                    pixel.R = Math.min(255, pixel.R + intensity);
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

function getAreaItem(matrix, startRow, startCol, distance) {
    console.log(`getting test area ${startRow} ${startCol}`);
    var endRow = startRow + distance;
    var endCol = startCol + distance;
    var exItem = new item();
    var currentRow = 0;
    for (var r = startRow; r < endRow; r++) {
        exItem.matrix.push(new Array());
        for (var c = startCol; c < endCol; c++) {
            exItem.matrix[currentRow].push(matrix[r][c]);
        }
        currentRow++;
    }
    exItem.calculateCenter(+app.delta);
    exItem.buildBinaryMatrix();
    return exItem;
}

//Екзамен
function ExamArea(exItem, items) {
    var maxf = -1;
    for (var i = 0; i < items.length; i++) {
        var rclas = items[i];
        var distance = hemmingDistance(exItem.etalon, rclas.etalon);
        console.log(`distance to ${rclas.name}: ${distance}`);
        var result = 1 - distance / rclas.radius;
        console.log(`result: ${result}`);
        if (maxf < result && result >= 0) {
            console.log(`this is ${rclas.name}`);
            maxf = result;
            return rclas.name;
        }
        if (result <= 0) {
            //console.log(`this is not ${rclas.name}`);
            return -1;
        }
    }
}
var colors = { "forest.png": "green", "water.png": "blue", "field.png": "yellow" }
