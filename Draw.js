/* Usage 
 * var draw = new Draw({ 
 *     dims: { x: 800, y: 800 }
 * })
 * .context(function( canvas, ctx, self ) {})
 * .filter({ algo: 'floyd', factor: 4 } )
 * .scale(4)
 * .pixelate( 4 )
 * .apply('canvas');

 * draw.init({
 *     dims: { x: 400, y: 400 }
 * }).generateOctaves( 8 )
 * .scale(2)
 * .pixelate( 16 )
 * .apply('canvas');
 */

class Draw  
{
    constructor( opts )
    {
        this.raf = null;
        this.iterateCallback = null;
        this.increment = 0;
        this.stopped = true;

        this.dims = opts.dims || { x: 100, y: 100 };
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = this.dims.x;
        this.canvas.height = this.dims.y;
        return this;
    }

    /* Return the index of the first value for the pixel at x and y coordinates, given the width of the canvas */
    index(x,y, width)
    {
        return (x + y * width) * 4;
    }

    /* Return named keys containing the color values of a pixel that begins at the given index */
    colorIndex( index )
    {
        return {
            r: index,
            g: index+1,
            b: index+2,
            a: index+3
        };
    }
    
    /* Loop through all the pixels of the current context, and pass the color indexs, pixel array, and x and y values to the provided callback */
    pixels( callback )
    {
        this.imageData = this.ctx.getImageData( 0, 0, this.dims.x, this.dims.y );
        var pixels = this.imageData.data;

        for( var y=0; y < this.dims.y; y++ )
        {
            for( var x=0; x < this.dims.x; x++ )
            {
                var i = this.index( x, y, this.dims.x );
                let { r, g, b, a } = this.colorIndex( i );
                var cb = callback.bind( this );
                cb( r, g, b, a, pixels, x, y);
            }
        }
        return this;
    }
    
    /* Put the provided pixel data onto the current context */
    writePixels()
    {
        this.ctx.putImageData(this.imageData, 0, 0);
        return this;
    }
    
    /* pass the current canvas to the provided context. This allows for operations that do not have abstracted methods */
    context( callback )
    {
        var cb = callback.bind(this);
        cb( this.canvas, this.ctx );
        return this;
    }

    /* Filters the current context with one of several dithering algorithms */
    filter(opts)
    {
        var bayerThresholdMap = {
            4: [
                [  15, 135,  45, 165 ],
                [ 195,  75, 225, 105 ],
                [  60, 180,  30, 150 ],
                [ 240, 120, 210,  90 ]
            ],
            8: [
                [ 0, 32,  8, 40,  2, 34, 10, 42],
                [48, 16, 56, 24, 50, 18, 58, 26],
                [12, 44,  4, 36, 14, 46,  6, 38],
                [60, 28, 52, 20, 62, 30, 54, 22],
                [ 3, 35, 11, 43,  1, 33,  9, 41],
                [51, 19, 59, 27, 49, 17, 57, 25],
                [15, 47,  7, 39, 13, 45,  5, 37],
                [63, 31, 55, 23, 61, 29, 53, 21]
            ]
        };
        this.pixels(function( r, g, b, a, pixels, x, y ) 
        {
            var fac = opts.factor || 8;
            var algo = opts.algo || 'bayer';
            var origR = pixels[r];
            var origG = pixels[g];
            var origB = pixels[b];

            if( algo == 'basic' || algo == 'floyd' )
            {
                // Basic Dithering
                pixels[r] = Math.round(pixels[r]/(256/fac))*(256/fac);
                pixels[g] = Math.round(pixels[g]/(256/fac))*(256/fac);
                pixels[b] = Math.round(pixels[b]/(256/fac))*(256/fac);
                pixels[a] = 255;
            }
            if( algo == 'floyd')
            {
                // Floyd-Steinberg Dithering
                var errR = origR - pixels[r];
                var errG = origG - pixels[g];
                var errB = origB - pixels[b];

                var indices = [ 
                    { i: [1, 0], f: 7}, 
                    { i: [-1, 1], f: 3},
                    { i: [0, 1], f: 5},
                    { i: [1, 1], f: 1}
                ];

                for( var t=0; t<indices.length; t++ )
                {
                    var tempI = indices[t].i;
                    var destI = this.index( x + tempI[0], y+tempI[1], this.dims.x );
                    let { r: dr, g: dg, b: db, a: da } = this.colorIndex(destI);

                    var factor = indices[t].f;
                    pixels[dr] = pixels[dr] + errR * (factor/16);
                    pixels[dg] = pixels[dg] + errG * (factor/16);
                    pixels[db] = pixels[db] + errB * (factor/16);
                }
            }
            else if( algo == 'bayer' )
            {
                // Bayer Dithering
                var threshold = 127;
                var level = opts.factor || 4;

                var map = Math.floor( ( pixels[r] + bayerThresholdMap[level][x%level][y%level] ) / Math.pow(level, 1/(level/2)) );
                pixels[r] = (map < threshold) ? 0 : 255;

                map = Math.floor( ( pixels[g] + bayerThresholdMap[level][x%level][y%level] ) / Math.pow(level, 1/(level/2)) );
                pixels[g] = (map < threshold) ? 0 : 255;

                map = Math.floor( ( pixels[b] + bayerThresholdMap[level][x%level][y%level] ) / Math.pow(level, 1/(level/2)) );
                pixels[b] = (map < threshold) ? 0 : 255;
            }

        }).writePixels();
        return this;
    }
    
    /* Generate a single octave of random data for use in creating a perlin noise field */
    generateOctave( scale, grayscale, weight )
    {
        var tempDraw = new Draw({ 
            dims: { x: scale, y: scale }
        })
        .pixels( function( r, g, b, a, pixels, x, y ) 
        {
            if( grayscale )
            {
                var val = Math.round(Math.random()*256) | 0;
                pixels[r] = pixels[g] = pixels[b] = val;
            }
            else
            {
                pixels[r] = Math.round(Math.random()*255);
                pixels[g] = Math.round(Math.random()*255);
                pixels[b] = Math.round(Math.random()*255);
            }
            pixels[a] = ~~(weight*255);
        }).writePixels();
        return tempDraw;
    }
    
    /* Create a perline noise field with the specified number of layers */
    generateOctaves(layers, grayscale )
    {
        for( var i=0; i < layers; i++ )
        {
            var scale = ( this.dims.x >> ( layers - i ) )
            var temp = this.generateOctave( 
                scale, 
                grayscale, 
                2/scale 
            );
            this.ctx.drawImage( 
                temp.canvas, 
                0, 
                0, 
                this.dims.x, 
                this.dims.y 
            );
        }
        
        return this;
    }

    /* Return the average values of the specified pixel data */
    getAverage( imageData )
    {
        var data = imageData.data;
        var sum = { r: 0, g: 0, b: 0, a:0 };
        for (var i = 0; i < data.length; i += 4) 
        {
            sum.r += data[i];
            sum.g += data[i + 1];
            sum.b += data[i + 2];
            sum.a += data[i + 3];
        }
        return { 
            r: sum.r / ( data.length * 0.25 ),
            g: sum.g / ( data.length * 0.25 ),
            b: sum.b / ( data.length * 0.25 ),
            a: sum.a / ( data.length * 0.25 )
        };
    }
    
    /* Pixelate the current context by the specified level of detail */
    pixelate( detail )
    {
        
        var tempComposite = this.ctx.globalCompositeOperation;
        this.ctx.globalCompositeOperation = 'source-over';

        var qX = Math.ceil( this.canvas.width / detail );
        var qY = Math.ceil( this.canvas.height / detail );
        
        for( var x = 0; x < qX; x++ ) 
        {
            for( var y = 0; y <qY; y++ )
            {
                var temp = this.ctx.getImageData( x*detail, y*detail, detail, detail )
                var avg = this.getAverage( temp );
                this.ctx.fillStyle = `rgba(${avg.r}, ${avg.g}, ${avg.b}, ${avg.a})`;
                this.ctx.fillRect(x*detail, y*detail, detail, detail);
            }
        }
        this.ctx.globalCompositeOperation = tempComposite;
        
        return this;
    }
    
    /* Scale the current context by the specified factor */
    scale( factor )
    {
        var temp = new Draw({ 
            dims: { 
                x: this.dims.x*factor, 
                y: this.dims.y*factor 
            }
        });
        temp.ctx.drawImage(this.canvas, 0, 0, this.dims.x*factor, this.dims.y*factor);

        this.canvas = temp.canvas;
        this.ctx = temp.ctx;
        this.dims = temp.dims;
        
        return this;
    }

    /* Return the x and y value along a quadratic curve */
    getQuadraticXY(t, sx, sy, cp1x, cp1y, ex, ey) 
    {
        // Source: http://www.independent-software.com/determining-coordinates-on-a-html-canvas-bezier-curve.html
        return {
            x: Math.pow(1-t, 2) * sx + 2 * (1-t) * t * cp1x + Math.pow(t, 2) * ex,
            y: Math.pow(1-t, 2) * sy + 2 * (1-t) * t * cp1y + Math.pow(t, 2) * ey
        };
    }
    
    /* Animate a canvas by painting within a RAF loop. */
    loop( callback )
    {
        this.iterateCallback = callback.bind(this);
        this.stopped = false;
        this.raf = requestAnimationFrame( this.iterate.bind(this) );
        return this;
    }
    
    /* Helper method for animation loop */
    iterate()
    {
        this.iterateCallback();
        this.increment++;
        this.raf = ( !this.stopped ) 
            ? requestAnimationFrame( this.iterate.bind(this) ) 
            : null;
    }
    
    /* Helper method to stop an animation loop */
    stop()
    {
        this.stopped = true;
        cancelAnimationFrame(this.raf);
        return this;
    }

    /* Write the current context to a canvas in the dom with the specified id */
    apply( id, opts )
    {
        var canvas = document.getElementById(id);
        var ctx = canvas.getContext('2d');

        var dims = ( typeof opts !== 'undefined' ) ? opts.dims : this.dims;

        canvas.width = dims.x;
        canvas.height = dims.y;

        // Write this.canvas to canvas
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.canvas, 0,0, dims.x, dims.y);
        return this;
    }
}
