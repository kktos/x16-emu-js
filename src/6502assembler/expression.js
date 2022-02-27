import { instrtab, symtab } from "./6502assembler.js";
import { ET_C, ET_P, ET_S } from "./log.js";

function getNumber(s, fromIdx, doubleWord) {
	let c0= s.charAt(fromIdx),
		size= doubleWord? 0xffffffff:0xffff;

	let idx;
	switch(c0) {
		case "$":
		case "&": {
			for(idx=fromIdx+1; idx<s.length; idx++) {
				let c= s.charAt(idx);
				if ((c<'A' || c>'F') && (c<'0' || c>'9'))
					break;
			}
			if(idx==fromIdx+1)
				return {'v': -1, 'idx': idx, 'error': true, 'et': ET_P};
			let n=s.substring(fromIdx+1, idx),
				isWord=(n.length>=4 && n.indexOf('00')==0) || !!doubleWord;
			return {'v': parseInt(n,16)&size, 'idx': idx, 'error': false, 'isWord': isWord};
		}

		case "%": {
			for (idx=fromIdx+1; idx<s.length; idx++) {
				let c=s.charAt(idx);
				if (c!='1' && c!='0') break;
			}
			if (idx==fromIdx+1) return {'v': -1, 'idx': idx, 'error': true, 'et': ET_P};
			return {'v': parseInt(s.substring(fromIdx+1, idx),2)&size, 'idx': idx, 'error': false};
		}

		case "@": {
			for (idx=fromIdx+1; idx<s.length; idx++) {
				let c=s.charAt(idx);
				if (c<'0' || c>'7') break;
			}
			if (idx==fromIdx+1) return {'v': -1, 'idx': idx, 'error': true};
			return {'v': parseInt(s.substring(fromIdx+1, idx),8)&size, 'idx': idx, 'error': false};
		}

		case "'": {
			fromIdx++;
			// let quote=c0;
			if (fromIdx<s.length) {
				let v=s.charCodeAt(fromIdx);
				if (bbcMode && v==0xA3) v=0x60; //£
				else if (convertPi && v==0x03C0) v=0xff; //CBM pi
				if (v>0xff) return {'v': v, 'idx': fromIdx, 'error': true, 'et': ET_P};
				fromIdx++;
				return {'v': charEncoding(v), 'idx': fromIdx, 'error': false};
			}
			return {'v': -1, 'idx': fromIdx, 'error': true};
		}

		case "0": {
			if(s.length==fromIdx+1)
				return {'v': 0, 'idx': fromIdx+1};
			let ofs= fromIdx+1, base=8, c=s.charAt(ofs);
			if (c=='X') {
				base=16;
				ofs++;
			}
			else if (c=='O') {
				base=8;
				ofs++;
			}
			else if (c=='B') {
				base=2;
				ofs++;
			}
			else if (c=='D') {
				base=10;
				ofs++;
			}
			if(ofs>=s.length)
				return {'v': -1, 'idx': s.length, 'error': true, 'et': ET_P};
			let idx;
			for(idx=ofs; idx<s.length; idx++) {
				c=s.charAt(idx);
				if (base==2 && (c!='0' && c!='1')) break;
				if (base==8 && (c<'0' || c>'7')) break;
				if (base==10 && (c<'0' || c>'9')) break;
				if (base==16 && (c<'0' || c>'9') && (c<'A' || c>'F')) break;
			}
			let n= s.substring(ofs, idx),
				isWord= (base==16 && n.length>=4 && n.indexOf('00')==0) || !!doubleWord;
			return {'v': parseInt(n,base)&size, 'idx': idx, 'error': false, 'isWord': isWord, 'lc': base!=8? ofs-1:-1 };
		}

		default: {
			for(idx= fromIdx; idx<s.length; idx++) {
				let c= s.charAt(idx);
				if (c<'0' || c>'9') break;
			}
			if(idx==fromIdx)
				return {'v': -1, 'idx': idx, 'error': true};
			return {'v': parseInt(s.substring(fromIdx, idx),10)&size, 'idx': idx, 'error': false };
		}
	}

}

function resolveExpression(ctx, stack, pict, pc, doubleWord) {
	let result=0, item, pr, op='', sign=false, mod=false, modSign=false, isWord=!!doubleWord,
		size=doubleWord? 0xffffffff:0xffff;
	for (let i=0; i<stack.length; i++) {
		item=stack[i];
		switch (item.type) {
			case 'sign':
				sign=true;
				break;
			case 'mod':
				mod=item.v;
				modSign=sign;
				sign=false;
				break;
			case 'num':
			case 'ident':
			case 'paren':
				if (item.type=='paren') {
					if (item.stack.length==0) return { 'v': -1, 'pict': exp.pict+']', 'error': 'unexpected token "]"', 'et': ET_P };
					let exp=resolveExpression(ctx, item.stack, item.pict, pc, doubleWord);
					if (exp.error || exp.undef) return exp;
					if (exp.isWord && !mod) isWord=true;
					pr=exp.v;
				}
				else if (item.type=='num') {
					pr=item.v;
					if (item.isWord && !mod) isWord=true;
				}
				else {
					let sym= symtab[item.v];
					if (!sym) {
						if (ctx.pass==1) return { 'v': 0xffff, 'pict': pict, 'error': false, 'isWord': true, 'undef': item.v };
						else return { 'v': -1, 'pict': pict, 'error': true, 'isWord': true, 'undef': item.v, 'et': ET_C };
					}
					if (!mod && (sym.isWord || sym.pc>pc)) isWord=true;
					pr=sym.v;
				}
				if (sign) {
					pr=size&(-pr);
					sign=false;
				}
				if (mod) {
					if (mod=='>') {
						pr=(pr>>8)&0xff;
					}
					else {
						pr&=0xff;
					}
					if (modSign) pr=size&(-pr);
					modSign=false;
				}
				if (op=='+') result=size&(result+pr);
				else if (op=='-') result=size&(result-pr);
				else if (op=='*') result=size&(result*pr);
				else if (op=='/') {
					if (pr==0) return { 'v': -1, 'pict': pict, 'error': 'division by zero', 'et': ET_C };
					result=size&(result/pr);
				}
				else {
					result=pr;
				}
				op='';
				break;
			case 'op':
				op=item.v;
				break;
		}
	}
	return { 'v': result, 'pict': pict, 'error': false, 'isWord': isWord, 'pc': pc };
}

export function getIdentifier(s, fromIdx, stripColon) {
	let idx;
	for(idx= fromIdx; idx<s.length; idx++) {
		let c= s.charAt(idx);
		if ((c<'A' || c>'Z') && (c<'0' || c>'9') && c!='_') break;
	}
	let end= idx, suffix= '';
	if (stripColon && idx<s.length && s.charAt(idx)==':') idx++;
	let l= Math.min(end-fromIdx, 8);
	return { 'v': s.substring(fromIdx, l)+suffix, 'idx': idx };
}

export function getExpression(ctx, s, pc, doubleWord) {
	let idx=0, c, v, r, state=0, max=s.length, root=[], stack=root, parent=[], pict='', last='', lvl=0;
		// size=doubleWord? 0xffffffff:0xffff;

	function state0() {
		state++;

		if (c=='-') {
			pict+=c;
			stack.push({'type': 'sign'});
			idx++;
			if (idx<max) {
				c=s.charAt(idx);
				if (c=='>'||c=='<') {
					stack.push({'type': 'mod', 'v': c});
					idx++;
				}
			}
			return true;
		}

		if (c=='>'||c=='<') {
			pict+=c;
			stack.push({'type': 'mod', 'v': c});
			idx++;
			if (idx<max) {
				c=s.charAt(idx);
				if (c=='-') {
					pict+=c;
					stack.push({'type': 'sign'});
					idx++;
				}
			}
			return true;
		}

		return false;
	}

	function state1() {
		if (c=='$' || c=='%' || c=='@' || c=='&' || (c>='0' && c<='9') || c=='\'') {
			r= getNumber(s, idx, doubleWord);
			let ns=(r.lc && r.lc>0)?
				s.substring(idx, r.lc)+s.charAt(r.lc).toLowerCase()+s.substring(r.lc+1, r.idx):
				s.substring(idx, r.idx);
			if (ns && ns.charAt(0)=='"') ns='\''+ns.substring(1,2);
			pict+=ns;
			if (r.error) {
				if (!(c>='0' && c<='9') && r.idx-idx<=1 && r.idx<s.length) pict+=s.charAt(r.idx);
				if (c=='\'' && r.v>=0) return { 'v': -1, 'pict': pict, 'error': 'illegal quantity', 'et': ET_P };
				return { 'v': -1, 'pict': pict, 'error': 'number character expected', 'et': ET_P };
			}
			stack.push({'type': 'num', 'v': r.v, 'isWord': r.isWord||false});
			idx= r.idx;
			last= 'figure';
		}
		else if ((c>='A' && c<='Z') || c=='_') {
			if (c=='P' && idx+1<max && s.charAt(idx+1)=='%') {
				pict+='P%';
				stack.push({'type': 'num', 'v': pc});
				idx+=2;
				last='';
			}
			else if (c=='R' && idx+1<max && s.charAt(idx+1)=='%') {
				pict+='R%';
				stack.push({'type': 'num', 'v': repeatCntr*repeatStep});
				idx+=2;
				last='';
			}
			else {
				r=getIdentifier(s, idx);
				pict+=r.v;
				if (instrtab[r.v]) return {'v': -1, 'pict': pict, 'error': 'illegal identifier (opcode '+r.v+')', 'et': ET_P};
				if (ctx.pass==2 && typeof symtab[r.v] == 'undefined') return { 'v': -1, 'pict': pict, 'error': 'undefined symbol', 'undef': r.v, 'et': ET_C };
				stack.push({'type': 'ident', 'v': r.v});
				idx=r.idx;
				last='name character';
			}
		}
		else if (c=='.') {
			pict+='.';
			stack.push({'type': 'num', 'v': pc});
			idx++;
			last='';
		}
		else if (c=='*') {
			pict+='*';
			stack.push({'type': 'num', 'v': pc});
			idx++;
			last='';
		}
		else if (c=='[') {
			pict+=c;
			parent[lvl]=stack;
			stack=[];
			parent[lvl++].push({'type': 'paren', 'stack': stack, 'pict': pict});
			state=0;
			idx++;
			return true;
		}
		else {
			pict+=c;
			return { 'v': -1, 'pict': pict, 'error': 'number or identifier expected', 'et': ET_P };
		}
		state++;
		return false;
	}

	function state2() {
		pict+=c;
		if (c=='+' || c=='-' || c=='*' || c=='/') {
			stack.push({'type': 'op', 'v': c});
			idx++;
			state=0;
		}
		else if (c==']') {
			lvl--;
			if (lvl<0) return { 'v': -1, 'pict': pict, 'error': 'non matching parenthesis "]"', 'et': ET_P };
			stack=parent[lvl];
			stack[stack.length-1].pict=pict;
			idx++;
			state=2;
		}
		else {
			var message = last? last+' or operator expected':'operator expected';
			return { 'v': -1, 'pict': pict, 'error': 'unexpected token, '+message, 'et': ET_P };
		}
		return false;
	}

	while (idx < max) {
		c= s.charAt(idx);
		switch(state) {
			case 0: {
				if(state0())
					continue;
				break;
			}
			case 1: {
				const op= state1();
				if(op === true)
					continue;
				if(op !== false)
					return err;
				break;
			}
			case 2: {
				const err= state2();
				if(err)
					return err;
				break;
			}
		}
	}

	if (state != 2)
		return { 'v': -1, 'pict': pict, 'error': 'number or identifier expected', 'et': ET_P };
	if (lvl != 0)
		return { 'v': -1, 'pict': pict, 'error': 'non matching parenthesis, "]" expected.', 'et': ET_S };
	return resolveExpression(ctx, root, pict, pc, doubleWord);
}
