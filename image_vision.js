// imageVision

(function( window, undefined ) {
    var document = window.document;
    var imgRegex = /.+\.(?:jpg|gif|png)$/;
    
    var imageVision = function(source) {
      return new imageVision.fn.init(source);
    };
  
    imageVision.fn = imageVision.prototype = {
      constructor: imageVision,
      init: function(options) {
        this.queue = new Queue;
  
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.pixels = new pixelData(options.source, this.flush.bind(this), options.width, options.height);
        
        return this;
      },
      flush: function(){
        // continue chain
        this.queue.flush(this);
      },
      getCorrelationCoeffizient: function(x, y, pattern){
        var sumI, sumI2, sumIR;
        for(var j=0; j<pattern.height; j++){
          for(var i=0; i<pattern.width; i++){
            var vI = this.pixels.get(x+i, y+j);
            var vR = pattern.get(i, j);
            sumI += vI;
            sumI2 += vI * vI;
            sumIR += vI * vR;
          }
        }
        var meanI = sumI / nR;
        var sigmaI = Math.sqrt(sumI2 - nR * meanI * meanI);
        var sigmaR = Math.sqrt(sumR2 - nR * meanR * meanR);
        
        return (sumIR - nR * meanI * meanR) / (sigmaI * sigmaR);
      },
      render: function(options){
        this.queue.add( function( self ) {
  
          self.canvas.width = self.pixels.width;
          self.canvas.height = self.pixels.height;
          
          var imgData = self.ctx.createImageData(self.pixels.width, self.pixels.height);
        
          for(var i=0, x=0, l=imgData.data.length; i<l; i+=4, x++){
            var color = self.pixels.data[x];
  
            if(options && options.threshold)
              color = self.pixels.data[x] >= options.threshold ? 255 : 0;
  
            imgData.data[i  ] = color;
            imgData.data[i+1] = color;
            imgData.data[i+2] = color;
            imgData.data[i+3] = 255;
          }
        
          self.ctx.putImageData(imgData, 0, 0);
        });
        return this;
      },
      appendTo: function(selector, fill) {
        this.queue.add( function( self ) {
          var context;
      
          // DOMElement
          if(selector.nodeType){
            context = selector;
          } else {
            // selector
            context = document.querySelector(selector);
          }
        
          if(fill){
            // remove all child elements
            while (context.hasChildNodes()) {
                context.removeChild(context.lastChild);
            }
          }
          
          self.render();
          context.appendChild(self.canvas);
        });
        return this;
      },
      fill: function(selector){
        this.queue.add( function( self ) {
          self.appendTo(selector, true);
        });
        return this;
      },
      on: function(event, callback) {
        this.queue.add( function( self ) {
          // fake callback for everything for now
          callback(self);
        });
        return this;
      },
      threshold: function(value){
        this.queue.add( function( self ) {
          self.render({ threshold: value });
        });
        return this;
      },
      getAdaptiveThreshold: function(){
        return this.pixels.getAdaptiveThreshold();
      },
      getHistogram: function(){
        if(!this.pixels.histogram)
          this.pixels.calculateHistogram();
  
        return this.pixels.histogram;
      },
      binarize: function(){
        this.queue.add( function( self ) {
          self.pixels.binarize();
          self.render();
        });
        return this;
      }
    };
  
    imageVision.fn.init.prototype = imageVision.fn;
  
    window.imageVision = imageVision;
  
  
  
  
  
  
  
  
  
    // HELPERS
  
    function Queue() {
      // store your callbacks
      this._methods = [];
      // keep a reference to your response
      this._response = null;
      // all queues start off unflushed
      this._flushed = false;
    }
  
    Queue.prototype = {
      // adds callbacks to your queue
      add: function(fn) {
        // if the queue had been flushed, return immediately
        if (this._flushed) {
          fn(this._response);
  
        // otherwise push it on the queue
        } else {
          this._methods.push(fn);
        }
      },
  
      flush: function(resp) {
        // note: flush only ever happens once
        if (this._flushed) {
          return;
        }
        // store your response for subsequent calls after flush()
        this._response = resp;
        // mark that it's been flushed
        this._flushed = true;
        // shift 'em out and call 'em back
        while (this._methods[0]) {
          this._methods.shift()(resp);
        }
      }
    };
  
  
  
  
  
    var pixelData = function(source, callback, width, height){
      return new pixelData.fn.init(source, callback, width, height);
    };
      
    pixelData.fn = pixelData.prototype = {
      init: function(source, callback, width, height){
        /* 
          source can be:
            - IMG element
            - a css selector for an image
            - url
        */
        var imgRegex = /.+\.(?:jpg|gif|png)$/;
  
        this.maxWidth = width;
        this.maxHeight = height;
        
        if( source.indexOf('data:image') === 0 || imgRegex.exec(source) ) {
          // Ï€(url)
          this.image = new Image();
          // this.image.crossOrigin = "Anonymous";
          this.image.onload = this.read.bind(this, callback);
          this.image.src = source;
          return;
        }
        else if( source.nodeType ) {
          // Ï€(img DOMElement)
          this.image = source;
        } 
        else {
          // Ï€('img')
          this.image = document.querySelector(source); 
        }
        
        if(this.image.complete){
          this.read(callback);
        } else {
          this.image.onload = this.read.bind(this, callback);
        }
      },
      create: function(data, width, height){
        this.data = data;
        this.length = data.length;
        this.width = width;
        this.height = height;
        return this;
      },
      doesntFit: function(){
        return this.maxWidth && this.image.width > this.maxWidth || 
               this.maxHeight && this.image.height > this.maxHeight;
      },
      fitImageSize: function(callback){
        var source = this.image.src;
        this.image = new Image();
  
        if(this.maxWidth && this.image.width > this.maxWidth)
          this.image.width = this.maxWidth;
        else if (this.maxHeight && this.image.height > this.maxHeight)
          this.image.height = this.maxHeight;
  
        this.image.onload = this.read.bind(this, callback);
        this.image.src = source;
      },
      read: function(callback){
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
  
        if(this.doesntFit())
          this.fitImageSize(callback);
      
        this.width = canvas.width = this.image.width;
        this.height = canvas.height = this.image.height;
      
        ctx.drawImage(this.image, 0, 0);
      
        // read the image data from canvas
        var imgData = ctx.getImageData(0, 0, this.image.width, this.image.height);
        
        this.length = imgData.data.length/4;
        this.data = new Int16Array(this.length);
        
        for(var i=0, n=0, l=imgData.data.length; i<l; i+=4, n++){
          var r = imgData.data[i  ];
          var g = imgData.data[i+1];
          var b = imgData.data[i+2];
          
          // weighted grayscale algorithm
          this.data[n] = Math.round(r * 0.3 + g * 0.59 + b * 0.11);
        }
  
        callback();
      },
      pos: function(x, y){
        return y * this.width + x;
      },
      x: function(i){
        return i % this.width;
      },
      y: function(i){
        return Math.floor(i/this.width);
      },
      //
      // get
      // ---
      //  
      // gets the color value at the given x,y position
      // mirrors values that excede the boundaries
      //
      get: function(x, y){
        if(x >= this.width) x = this.width - (x % this.width);
        if(x < 0) x = -x;
        
        if(y >= this.height) y = this.height - (y % this.height);
        if(y < 0) y = -y;
        
        return this.data[ this.pos(x, y) ];
      },
      set: function(x, y, value){
        var pos = this.pos(x, y);
        
        if(0 <= pos && pos < this.length)
          this.data[ pos ] = value;
      },
      render: function(){
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        
        canvas.width = this.width;
        canvas.height = this.height;
            
        var imgData = ctx.createImageData(this.width, this.height);
      
        for(var i=0, x=0; x<this.length; i+=4, x++){
          var tone = this.data[x];
          imgData.data[i  ] = tone;
          imgData.data[i+1] = tone;
          imgData.data[i+2] = tone;
          imgData.data[i+3] = this.alphaPixels !== undefined ? this.alphaPixels[x] : 255;
        }  
        
        ctx.putImageData(imgData, 0, 0);
        
        return canvas;
      },
      invert: function(){
        for(var y=0; y<this.height; y++){
          for(var x=0; x<this.width; x++){
            this.set(x, y, 255 - this.get(x, y));
          }
        }
      },
      alpha: function(alphaPixels){
        this.alphaPixels = alphaPixels;
      },
      clone: function(){
        var clone = new Int16Array(this.length);
        
        for(var i=0; i<this.length; i++){
          clone[i] = this.data[i];
        }
        
        return clone;
      },
      nonMaximumSuppression: function(min){
        for(var y=0; y<this.height; y++){
          for(var x=0; x<this.width; x++){
            this.inspectNeighbours(x, y, min);
          }
        }
      },
      inspectNeighbours: function(x0, y0, min){
        var value = this.get(x0, y0);
        var width = 3;
        var offset = Math.floor(width/2);
        
        for(var i=0, l=width*width; i<l; i++){
          var x = x0 + (i % width) - offset;
          var y = y0 + Math.floor(i/width) - offset;
          
          if(x !== x0 || y !== y0){
            if(this.get(x, y) <= value){
              this.set(x, y, 0);
            }
          }
        }
        
        if(value < min){
          this.set(x0, y0, 0);
        }
      },
      getAdaptiveThreshold: function(){
        // calculate the histogram
        this.calculateHistogram();
  
        // calculate the threshold
        return this.isoDataAlgorithm();
      },
      //
      // binarize
      // --------
      //
      binarize: function(){
        var threshold = this.getAdaptiveThreshold();
      
        for(var i = 0; i<this.length; i++){
          this.data[i] = this.data[i] < threshold ? 0 : 255;
        }
      },
      //
      // Median
      // ------
      //  
      // returns the median of a section of the histogram
      //
      median: function(start, stop){
        var p = 0;
        var x = 0;
  
        // start and stop might be floats
        start = parseInt(start, 10);
        stop = parseInt(stop, 10);
  
        for(var j = start; j <= stop; j++){
          var value = this.histogram[j];
          p += value;
          x += j*value;
        }
  
        // exceptions
        if( p === 0 ) {
          return start === 0 ? stop : start;
        }
  
        return x/p;
      },
      //
      // Iso Data Algorithm
      // ==================
      //  
      // starts with a default threshold to determine a good threshold
      // by spliting up the histogram in two equal weighted areas
      //
      // this function is recursive - it calls itself until the perfect threshold is found
      //
      isoDataAlgorithm: function(t){
        // default to 128 if no t is given
        if( t === undefined ){
          this.counter = 0;
          t = 128;
        }
  
        var m1 = this.median(0, t-1);
        var m2 = this.median(t, 255);
  
        // calculate new threshold
        tk = ( m1 + m2 ) / 2;
  
        if( t === tk ){
          return Math.round( tk );
        } else {    
          this.counter ++;
          return this.isoDataAlgorithm(tk);
        }
      },
      //
      // Calculate Histogram
      // ==================
      //  
      // creates a (non-normalised) histogram by adding up 
      // the occurence of every gray shade.
      //
      calculateHistogram: function(){  
        this.histogram = new Int16Array(256);
  
        for(var i=0; i<this.length; i++){
          var value = this.data[i];
          this.histogram[value] += 1;
        }
      },
      //
      // Get Correlation Coeffizient
      // ===========================
      //  
      // returns a coeffizient indicating the correlation
      // between the image and another image (pattern)
      // 
      // pattern [pixelData]
      //
      getCorrelationCoeffizient: function(x, y, pattern){
        var sumI, sumI2, sumIR;
        for(var j=0; j<pattern.height; j++){
          for(var i=0; i<pattern.width; i++){
            var vI = this.get(x+i, y+j);
            var vR = pattern.get(i, j);
            sumI += vI;
            sumI2 += vI * vI;
            sumIR += vI * vR;
          }
        }
        var meanI = sumI / nR;
        var sigmaI = Math.sqrt(sumI2 - nR * meanI * meanI);
        var sigmaR = Math.sqrt(sumR2 - nR * meanR * meanR);
        
        return (sumIR - nR * meanI * meanR) / (sigmaI * sigmaR);
      },
    };
  
    pixelData.fn.init.prototype = pixelData.fn;
  
  })( window );