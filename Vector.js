class Vector
{
    constructor( x, y )
    {
        this.x = x;
        this.y = y;
    }

    get X()
    {
        return Math.round(this.x);
    }

    get Y()
    {
        return Math.round( this.y );
    }
    
    mag() 
    { 
        var mag = Math.sqrt( Math.pow( this.x, 2 ) + Math.pow( this.y, 2 ) );
        return mag;
    };
    
    heading() 
    {
        var heading = Math.atan2( this.x, this.y ) / ( Math.PI / 180 );
        return heading;
    }
    
    add( vector ) 
    {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    };
    
    sub( vector ) 
    {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    mult(factor) 
    {
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    div(factor) 
    {
        this.x = this.x/factor;
        this.y = this.y/factor;
        return this;
    }

    normalize() 
    {
        var m = this.mag();
        return (m) ? this.div(m) : this;
    }

    setMag( mag ) 
    {
        var factor = this.normalize().mult(mag);
        return this;
    }
    
    magSq() 
    {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    };

    limit( limit ) 
    {
        var mSq = this.magSq();
        if (mSq > Math.pow(limit, 2) ) {
            this.div(Math.sqrt(mSq)).mult(limit);
        }
        return this;
    }
    
    fromAngle( radians, length ) 
    {
        if (typeof length === 'undefined') {
            length = 1;
        }
        this.x = length * Math.cos( radians );
        this.y = length * Math.sin( radians );
        return this;
    }

    a2r(angle)
    {
        return angle*Math.PI/180;
    } 
}