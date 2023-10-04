
export const fontSizes= {
	14: {
		40: {
			h: 14,
			w: 14,
			top: 2,
			left: 3
		},
		80: {
			h: 12,
			w: 7,
			top: 2,
			left: 3
		}

	},
	16: {
		80: {
			h: 14,
			w: 7,
			top: 2,
			left: 3
		}
	}
};

export const textColors= [
	{ name:"Black"      , color: "#000000" },
	{ name:"Deep Red"   , color: "#DD0033" },
	{ name:"Dark Blue"  , color: "#000099" },
	{ name:"Purple"     , color: "#DD22DD" },
	{ name:"Dark Green" , color: "#007722" },
	{ name:"Dark Gray"  , color: "#555555" },
	{ name:"Medium Blue", color: "#2222FF" },
	{ name:"Light Blue" , color: "#66AAFF" },
	{ name:"Brown"      , color: "#885500" },
	{ name:"Orange"     , color: "#FF6600" },
	{ name:"Light Gray" , color: "#AAAAAA" },
	{ name:"Pink"       , color: "#FF9988" },
	{ name:"Light Green", color: "#11DD00" },
	{ name:"Yellow"     , color: "#ffff00" },
	{ name:"Aquamarine" , color: "#41FF99" },
	{ name:"White"      , color: "#FFFFFF" },
];

// export const colorAddr= 0x020400;

export const MON_WNDLEFT= 	0x20; //left column of scroll window
export const MON_WNDWDTH= 	0x21; //width of scroll window
export const MON_WNDTOP=  	0x22; //top of scroll window
export const MON_WNDBTM=  	0x23; //bottom of scroll window

export const MON_CH=      	0x24; //cursor horizontal displacement
export const MON_CV=      	0x25; //cursor vertical displacement

export const MON_BASL=    	0x28; //base address for text output (lo)
export const MON_BASH=    	0x29; //base address for text output (hi)

export const MON_CSWL=    	0x36; //character output hook (lo)
export const MON_CSWH=    	0x37; //character output hook (hi)
export const OURCH=			0x57B; //80-col CH
export const OURCV=         0x5FB; //80-col CV
