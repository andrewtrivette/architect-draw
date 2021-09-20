class Rand 
{ 
	constructor( min, max, seed, filter )
	{
		this.seed = seed || Math.random()*10000000;
		this.min = min || 0;
		this.max = max || 9999999;
		this.filter = filter || Math.round;

	}
	get()
	{
		this.seed = (this.seed * 9301 + 49297) % 233280;
		var rand = this.seed % ( this.max - this.min + 1 ) + this.min;
		return this.filter(rand);
	}
}
