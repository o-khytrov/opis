//класс розпізнавання
class item {

    constructor() {
        this.index = 0;
        this.name = '';
        this.matrix = new Array(); //матриця зображення   
        this.center = new Array(); //центр контейнера класу розпізнавання
        this.tolerance = new Array(); //массив структур tollerance, (нижня і верхня межа допуску)
        this.binMatrix = new Array(); //бінатрна матриця
        this.etalon = new Array(); //еталонний вектор класу
        this.trainingResults = new Array();

        this.highlightColor = ''; //колір підсвітки на екзамені
        this.showMatrix = false;
        this.showBinaryMatrix = false;
        this.showTrainingRes = false;
        this.showRadiusChart = false;
        this.showDeltaChart = false;
        this.maxEm = 0;
        this.optimalDelta = 0;
    }
    //створення матриці зображення з об'єкту canvas 
    buildMatrix = function (imageData, method) {
        let width = imageData.width;
        let height = imageData.height;
        this.matrix = new Array();
        for (var y = 0; y < height; y++) {
            this.matrix.push(new Array());
            for (var x = 0; x < width; x++) {
                var pixel = imageData.getPixel(x, y);
                if (method == 'm_avg')
                    this.matrix[y].push(avg(pixel))
                else if (method == 'm_red')
                    this.matrix[y].push(pixel.R)
                else if (method == 'm_green')
                    this.matrix[y].push(pixel.G)
                else if (method == 'm_blue')
                    this.matrix[y].push(pixel.B)
                else if (method == 'm_lum')
                    this.matrix[y].push(luminosity(pixel));
                else if (method == 'm_grayscale')
                    this.matrix[y].push(weighted_grayscale(pixel));
            }
        }

    }
    calculateHistogram = function () {
        this.histogram = new Int16Array(256);
        var i = 0;
        for (var c = 0; c < this.matrix.length; c++) {
            for (var r = 0; r < this.matrix[c].length; r++) {
                var value = this.matrix[r][c];
                this.histogram[value] += 1;
            }

        }
    }
    reset = function () {
        this.matrix = Array();
        this.binMatrix = new Array();
        this.etalon = new Array();
        this.tolerance = new Array();
        this.center = new Array();
        this.trainingResults = new Array();
    }
    // визначення центру 
    calculateCenter = function (delta) {
        this.tolerance = new Array();
        this.center = new Array();
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
        this.binMatrix = new Array();
        this.etalon = new Array();
        for (var r = 0; r < this.matrix.length; r++) {
            this.binMatrix.push(new Array());
            for (var c = 0; c < this.matrix[r].length; c++) {
                var tolerance = this.tolerance[c];
                this.binMatrix[r][c] = (this.matrix[r][c] >= tolerance.bottom &&
                    this.matrix[r][c] <= tolerance.top) ? 1 : 0;
            }
        }
        var colNumber = this.binMatrix[0].length;
        for (var c = 0; c < colNumber; c++) {
            let sum = 0;
            for (let r = 0; r < this.binMatrix.length; r++)
                sum += this.binMatrix[r][c];

            this.etalon.push((sum / this.binMatrix.length) >= 0.5 ? 1 : 0);
        }
        this.distanceToNeighbour = this.etalon.length;
    }
    renderBinaryImage = function () {

        var canvas = document.getElementById("bin_image_" + this.index);
        console.log(canvas);
        var ctx = canvas.getContext("2d");
        let binaryImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log(this.binMatrix);
        for (var by = 0; by < this.binMatrix.length; by++) {
            for (var bx = 0; bx < this.binMatrix[by].length; bx++) {
                var val = this.binMatrix[bx][by];
                var color = {};
                if (val == 0) {
                    color = {
                        R: 0,
                        G: 0,
                        B: 0,
                        A: 255
                    };
                } else {
                    color = {
                        R: 255,
                        G: 255,
                        B: 255,
                        A: 255
                    };
                }
                binaryImageData.setPixel(by, bx, color);
            }
        }
        ctx.putImageData(binaryImageData, 0, 0);
    }
    renderHistogram = function (histogram, threshold) {
        var divClass = '#training_class_' + this.index;
        var histograms = document.querySelectorAll(divClass);
        var fragment = document.createDocumentFragment();
        var max = 0;
        var height = histograms[0].clientHeight;

        for (var i = 0; i < histogram.length; i++) {
            if (histogram[i] > max)
                max = histogram[i];
        }

        for (var i = 0; i < histogram.length; i++) {
            var column = document.createElement('div');
            column.style.height = height / max * histogram[i] + "px";
            fragment.appendChild(column);
        }

        var thresholdLine = document.createElement('div');
        thresholdLine.className = 'threshold';
        thresholdLine.style.left = threshold / 255 * 100 + "%";
        fragment.appendChild(thresholdLine);

        while (histograms[0].firstChild)
            histograms[0].removeChild(histograms[0].firstChild);

        histograms[0].appendChild(fragment);

        // potentially clone the histogram
        for (var i = 1; i < histograms.length; i++) {
            histograms[i].innerHTML = histograms[0].innerHTML;
        }
    }

}

//структура для зберігання меж допусків
class tolerance {
    constructor(top, bottom) {
        this.top = top;
        this.bottom = bottom;
    }
}

//результати навчання
class trainingResult {
    constructor() {

        this.neighbour = -1; //індекс класу сусіда
        this.distanceToNeighbour = 0; //відстань до сусіда;
        this.maxKFE = 0;
        this.no_rab_obl_max_KFE = -1;
        this.radius = 0;
        this.no_rab_obl_Radius = 0;
        this.no_rab_obl_dostovirn_D1 = 0;
        this.no_rab_pomylka_betta = 0;
        this.dostovirn_D1 = 0;
    }
}
//графік залежності критерію Кульбака від радіусів контейнеру
Vue.component('kfe-radius-chart', {
    extends: VueChartJs.Line,
    props: {
        chartdata: {
            type: Array,
            default: null
        }
    },
    mounted() {
        let data = {
            labels: new Array(),
            datasets: [{
                    label: 'Залежність критерію Кульбака від радіусів контейнеру',
                    data: new Array()
                },
                {
                    label: 'Робоча область',
                    data: new Array(),
                    backgroundColor: '#f87979'
                }
            ]
        };
        const sortedChartData = this.chartdata.concat().sort((a, b) => {
            if (Math.max(a.radius, a.no_rab_obl_Radius) < Math.max(b.radius, b.no_rab_obl_Radius)) return -1;
            return 1;
        });
        for (let i = 0; i < sortedChartData.length; i++) {
            var kfe = Math.max(sortedChartData[i].maxKFE, sortedChartData[i].no_rab_obl_max_KFE);
            
            data.datasets[0].data.push(kfe);
            data.labels.push(Math.max(sortedChartData[i].radius, sortedChartData[i].no_rab_obl_Radius));

            if (this.chartdata[i].dostovirn_D1 > sortedChartData[i].no_rab_pomylka_betta)
                data.datasets[1].data.push(kfe);
            else
                data.datasets[1].data.push(0);


        }
        this.renderChart(data, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Iнформаційна міра"
                    }
                }],
                xAxes: [{
                    //scaleLabel: { display: true, labelString: "Радіус" },
                    scaleLabel: {
                        display: true,
                        labelString: "Radius"
                    }
                }]
            }
        })
    }

})

//графік залежності критерію Кульбака від delta
Vue.component('kfe-delta-chart', {
    extends: VueChartJs.Line,
    props: {
        chartdata: {
            type: Array,
            default: null
        }
    },
    mounted() {
        let data = {
            labels: new Array(),
            datasets: [{
                    label: 'Залежність критерію Кульбака від значення delta',
                    data: new Array()
                },
                {
                    label: 'Робоча область',
                    data: new Array(),
                    backgroundColor: '#f87979'
                }
            ]
        };
        for (let i = 0; i < this.chartdata.length; i++) {
            data.datasets[0].data.push(Math.max(this.chartdata[i].maxKFE, this.chartdata[i].no_rab_obl_max_KFE));
            data.labels.push(this.chartdata[i].delta);
            if (this.chartdata[i].dostovirn_D1 > this.chartdata[i].no_rab_pomylka_betta)
                data.datasets[1].data.push(this.chartdata[i].maxKFE);
            else
                data.datasets[1].data.push(0);

        }
        this.renderChart(data, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Iнформаційна міра"
                    }
                }],
                xAxes: [{
                    //scaleLabel: { display: true, labelString: "Радіус" },
                    scaleLabel: {
                        display: true,
                        labelString: "Deta"
                    }
                }]
            }
        })
    }

})