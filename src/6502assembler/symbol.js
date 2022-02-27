import { commentChar } from "./utils.js";

function getChar(ctx, isQuote) {
	if (ctx.srcl>=ctx.codesrc.length) return 'EOF';
	if (ctx.srcc>=ctx.codesrc[ctx.srcl].length) {
		ctx.srcc=0;
		ctx.srcl++;
		return '\n';
	}
	else {
		const c= ctx.codesrc[ctx.srcl].charAt(ctx.srcc++);
		if (!isQuote && (c==';') ) {
			ctx.comment= ctx.pass==1 ? c : commentChar;
			while (ctx.srcc<ctx.codesrc[ctx.srcl].length) {
				const c1= ctx.codesrc[ctx.srcl].charAt(ctx.srcc++);
				ctx.comment+=c1;
			}
		}
		else {
			ctx.rawLine+=c;
		}
		return c;
	}
}

export function getSym(ctx) {
	if(ctx.comment) {
		ctx.listing+= ctx.comment+'\n';
		ctx.comment= '';
	}
	ctx.rawLine= '';

	ctx.srcLnNo= ctx.srcl+1;

	let c= getChar(ctx);
	if (c=='EOF') return null;

	let sym=[''],
		s=0,
		m=0,
		quote='';

	while (!(c==';' && !quote) && c!='\n' && c!='EOF') {
		if (m<2 && (c==' ' || c=='\t')) {
			if (m>0) {
				m=0;
				if (sym[s] && sym[s].length) {
					sym[++s]='';
				}
			}
		}
		else if (m<2 && (c=='=')) {
			if (m>0) s++;
			sym[s]=c;
			m=0;
			sym[++s]='';
		}
		else if (m==2) {
			if (c==quote) {
				sym[s]+='"';
				quote='';
				m=1;
			}
			else {
				sym[s]+=c;
			}
		}
		else if (c=='"') {
			sym[s]+='"';
			m=2;
			quote=c;
		}
		else if (c=='\'') {
			sym[s]+=c;
			quote=c;
			m=3;
		}
		else if (m==0 && c=='!') {
			if (sym[s].length) s++;
			sym[s]=c;
			m=1;
			if (s>1) {
				var c1=getChar(ctx, false);
				while (c1=='+' || c1=='-') {
					sym[s]+=c1;
					c1=getChar(ctx, false);
				}
				c=c1;
				continue;
			}
		}
		else {
			if (m==3) {
				sym[s]+=c;
				quote='';
			}
			else {
				sym[s]+=c.toUpperCase();
			}
			m=1;
		}
		c= getChar(ctx, m>=2);
	}
	while (sym.length && sym[sym.length-1]=='') sym.length--;
	return c=='EOF'? null: sym;
}

export function nextSyms(ctx) {
	if (ctx.repeatInterval>0) {
		if (++ctx.repeatCntr>=ctx.repeatInterval) {
			ctx.repeatInterval= ctx.repeatStep= ctx.repeatCntr=0;
		}
		else {
			ctx.sym=[];
			for (let i=0; i<ctx.repeatSym.length; i++) ctx.sym.push(ctx.repeatSym[i]);
			rawLine= ctx.repeatLine;
			return;
		}
	}
	ctx.sym= getSym(ctx);
}
