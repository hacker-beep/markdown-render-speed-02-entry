// Direct HTML rendering: block structure first, inline spans after references resolve.
const emptyRefs=Object.freeze(Object.create(null));
const punct = /[\p{P}\p{S}]/u;
const ws = /\s/u;
const escapable = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const tags = new Set('address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem meta nav noframes ol optgroup option p param search section summary table tbody td tfoot th thead title tr track ul frame'.split(' '));
function escape(s, all=false) { return s.replace(all ? /[&<>"']/g : /[<>"']|&(?!(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|\w+);)/g, c=>c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':c==='"'?'&quot;':'&#39;'); }
function unescape(s) { return s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,'$1'); }
function label(s) { return s.trim().replace(/\s+/g,' ').toLowerCase().toUpperCase().toLowerCase(); }
function url(s) { try {return encodeURI(s).replace(/%25/g,'%');} catch {return null;} }
function cells(s, count) {
 s=s.trim(); if(s[0]==='|')s=s.slice(1);if(s.endsWith('|')){let k=s.length-2;while(k>=0&&s[k]==='\\')k--;if((s.length-2-k)%2===0)s=s.slice(0,-1);}
 let a=[],start=0;for(let i=0;i<s.length;i++)if(s[i]==='|'){let n=0,j=i;while(s[--j]==='\\')n++;if(!(n&1)){a.push(s.slice(start,i).trim().replace(/\\\|/g,'|'));start=i+1;}}
 a.push(s.slice(start).trim().replace(/\\\|/g,'|'));if(count!==undefined){a.length=Math.min(a.length,count);while(a.length<count)a.push('');}return a;
}
function bracketEnd(s,start){for(let i=start;i<s.length;i++){let c=s[i];if(c==='\\'){i++;continue;}if(c==='<'){let e=opaque(s,i,emptyRefs);if(e>i){i=e-1;continue;}}if(c===']')return i;if(c==='['){let depth=1,j=i+1;for(;j<s.length&&depth;j++){if(s[j]==='\\'){j++;continue;}if(s[j]==='['){if(++depth>2)return -1;}else if(s[j]===']')depth--;}if(depth)return -1;i=j-1;continue;}if(c==='`'){let n=1;while(s[i+n]==='`')n++;let j=s.indexOf('`',i+n);if(j>=0){while(s[j+1]==='`')j++;let end=bracketEnd(s,j+1);if(end>=0)return end;}if(n>=2&&s[i+n]===']')return i+n;return -1;}}return -1;}

function destination(s, at) {
 let i=at;while(/[ \t\n]/.test(s[i]||'!'))i++;let href='',title='';
 if(s[i]==='<'){let start=++i;while(i<s.length&&s[i]!=='>'&&s[i]!=='\n'){if(s[i]==='\\')i++;i++;}if(s[i]!=='>')return null;href=s.slice(start,i++);if(href.includes('<'))return null;}
 else {let start=i,d=0;for(;i<s.length;i++){let c=s[i];if(c==='\\'){i++;continue;}if(c==='(')d++;else if(c===')'){if(!d)break;d--;}if(/[ \t\n]/.test(c))break;}if(d)return null;href=s.slice(start,i);}
 let end=i;while(/[ \t\n]/.test(s[i]||'!'))i++;
 if(i>end&&(s[i]==='"'||s[i]==="'"||s[i]==='(')){let q=s[i],close=q==='('?')':q,start=++i;while(i<s.length&&s[i]!==close){if(s[i]==='\\')i++;i++;}if(s[i]!==close)return null;title=s.slice(start,i++);while(/[ \t\n]/.test(s[i]||'!'))i++;}
 if(s[i]!==')')return null;return [i+1,unescape(href),unescape(title)];
}
let collecting = false, linkState=false, deferred=null, marker='', paragraphMark='', boundaryMark='';
function inline(s, refs, inLink=undefined, raw=false) {
 if (collecting) return 'x';if(deferred){deferred.push(s);return marker;}let root=inLink===undefined;if(root)inLink=linkState;let memo=null;if(!s.includes('<')){memo=(s.includes('[')?referenceMemo:inlineMemo)[(linkState?2:0)+(raw?1:0)];let hit=memo.get(s);if(hit!==undefined)return hit;}if(plainInline(s,linkState)){if(memo)memo.set(s,s);return s;}let hidden;
 let out='',i=0,autoAt=linkState?Infinity:nextAuto(s,0);
 while(i<s.length){if(i>autoAt)autoAt=nextAuto(s,i);let c=s.charCodeAt(i),ch=s[i];
 if(c===92&&i+1<s.length){if(s[i+1]==='\n'){out+='<br>';i+=2;while(s[i]===' '||s[i]==='\t')i++;continue;}if(escapable.test(s[i+1])){out+=escape(s[i+1],true);i+=2;continue;}}
 if(c===96){let n=1;while(s[i+n]==='`')n++;let j=i+n,found=-1;while((j=s.indexOf('`',j))>=0){let m=1;while(s[j+m]==='`')m++;if(m===n){found=j;break;}j+=m;}if(found>=0){let text=s.slice(i+n,found).replace(/\n/g,' ');if(text[0]===' '&&text.endsWith(' ')&&/[^ ]/.test(text))text=text.slice(1,-1);out+='<code>'+escape(text,true)+'</code>';i=found+n;continue;}out+=s.slice(i,i+n);i+=n;continue;}
 if(c===33&&s[i+1]==='['||c===91){let image=c===33,start=i+(image?2:1),end=bracketEnd(s,start);if(end>=0){let text=s.slice(start,end),d=null,next=end+1;if(s[next]==='(')d=destination(s,next+1);if(!d){let key=text;if(s[next]==='['){let r=s.indexOf(']',next+1);if(r>=0&&!/(^|[^\\])(?:\\\\)*\[/.test(s.slice(next+1,r))){key=s.slice(next+1,r)||text;next=r+1;}}let ref=refs[label(key)];if(ref)d=[next,ref[0],ref[1]];}
 if(d&&!image&&hasExplicitLink(text.replace(/\\([\[\]])/g,'$1'),refs))d=null;if(d){text=text.replace(/\\([\[\]])/g,'$1');let href=url(d[1]);if(href!==null){let title=d[2]?' title="'+escape(d[2])+'"':'';if(image)out+='<img src="'+escape(href)+'" alt="'+plain(text,refs)+'"'+title+'>';else out+='<a href="'+escape(href)+'"'+title+'>'+linkInline(text,refs,raw)+'</a>';i=d[0];continue;}}}}
 if(c===60){let rest=s.slice(i),m;if((m=/^<([a-zA-Z][a-zA-Z\d+.-]{1,31}:[^\s<>]*)>/.exec(rest))){out+='<a href="'+escape(url(m[1])??m[1])+'">'+escape(m[1])+'</a>';i+=m[0].length;continue;}if((m=/^<([a-zA-Z\d.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?(?:\.[a-zA-Z\d](?:[a-zA-Z\d-]*[a-zA-Z\d])?)+)>/.exec(rest))){out+='<a href="mailto:'+escape(m[1])+'">'+escape(m[1])+'</a>';i+=m[0].length;continue;}
 m=/^(?:<!--(?:-?>|[\s\S]*?-->)|<\?[\s\S]*?\?>|<![A-Z][\s\S]*?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/[a-zA-Z][\w:-]*\s*>|<[a-zA-Z][\w-]*(?:\s+[a-zA-Z_:][\w.:-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>)/.exec(rest);
 if(m){let t=m[0];out+=t;if(/^<a\s/i.test(t))linkState=true;else if(/^<\/a>/i.test(t)){linkState=false;autoAt=nextAuto(s,i+t.length);}if(/^<(?:pre|code|kbd|script)(?:\s|>)/i.test(t))raw=true;else if(/^<\/(?:pre|code|kbd|script)(?:\s|>)/i.test(t))raw=false;i+=t.length;continue;}}
 if(c===42||c===95){if(hidden===undefined)hidden=codeMask(s,refs);let n=1;while(s[i+n]===ch)n++;let fl=flanks(s,i,n,ch);if(fl[0]){let match=emphasis(s,i,n,ch,refs,hidden);if(match){let [begin,end,used,closeEnd]=match;out+=s.slice(i,begin);let text=inline(s.slice(begin+used,end),refs,undefined,raw);out+=used===2?'<strong>'+text+'</strong>':'<em>'+text+'</em>';i=closeEnd;continue;}}out+=ch;i++;continue;}
 if(c===126){if(hidden===undefined)hidden=codeMask(s,refs);let n=1;while(s[i+n]==='~')n++;if(n<=2&&!ws.test(s[i+n]||' ')){let j=i+n,depth=n;while(j<s.length){if(hidden&&hidden[j]){j++;continue;}let skip=s[j]==='`'?j:opaque(s,j,refs);if(skip>j){j=skip;continue;}if(s[j]!=='~'){j++;continue;}let m=1;while(s[j+m]==='~')m++;if(m===n){let f=flanks(s,j,m,'~');if(f[0]&&!f[1])depth+=n;else if(f[1])depth-=n;if(depth===0){out+='<del>'+inline(s.slice(i+n,j),refs,undefined,raw)+'</del>';i=j+n;break;}}j+=m;}if(depth===0)continue;}out+=s.slice(i,i+n);i+=n;continue;}
 if(i===autoAt&&!linkState&&(ch==='m'||ch==='x')){let m=/^(mailto:|xmpp:)([A-Za-z0-9._+-]+@[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*[A-Za-z0-9])+(?![\w-]))/.exec(s.slice(i));if(m){let text=m[0];if(m[1]==='xmpp:'){let extra=/^\/[A-Za-z0-9@.]+/.exec(s.slice(i+text.length));if(extra)text+=extra[0];}out+='<a href="'+escape(text,true)+'">'+escape(text,true)+'</a>';i+=text.length;continue;}}
 if(i===autoAt&&!linkState&&(c===104||c===72||c===102||c===70||c===119||c===109||c===120)){let m=/^(?:(?:https?|ftp):\/\/|www\.)[^\s<]+/i.exec(s.slice(i));if(m){let t=trimUrl(m[0]);out+='<a href="'+escape(url(t.startsWith('www.')?'http://'+t:t)??t)+'">'+escape(t)+'</a>';i+=t.length;continue;}}
 if(i===autoAt&&!linkState&&(c>=48&&c<=57||c>=65&&c<=90||c>=97&&c<=122||ch==='_'||ch==='.')){let m=/^[A-Za-z0-9._+-]+@[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*[A-Za-z0-9])+(?![\w-])/.exec(s.slice(i));if(m){out+='<a href="mailto:'+m[0]+'">'+m[0]+'</a>';i+=m[0].length;continue;}}
 if(c===32){let j=i+1;while(s[j]===' ')j++;if(s[j]==='\n'){out+=j-i>=2?'<br>':s.slice(i,j)+'\n';let hard=j-i>=2;i=j+1;if(hard)while(s[i]===' '||s[i]==='\t')i++;continue;}out+=s.slice(i,j);i=j;continue;}
 if(c===10){out+='\n';i++;continue;}
 if(c===38||c===60||c===62||c===34||c===39){if(raw)out+=ch;else if(c===38){let m=/^&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|\w+);/.exec(s.slice(i));if(m){out+=m[0][1]==='#'?escape(numeric(m[0]),true):m[0];i+=m[0].length;continue;}out+='&amp;';}else out+=escape(ch,true);i++;continue;}
 plainRun.lastIndex=i+1;let stop=plainRun.exec(s);let j=stop?stop.index:s.length;if(!linkState&&autoAt>i&&autoAt<j)j=autoAt;out+=s.slice(i,j);i=j;
 }
 if(memo){if(memo.size>24000)memo.clear();memo.set(s,out);}return out;
}
function bullet(s){let c=first(s);if(c!==42&&c!==43&&c!==45&&(c<48||c>57))return null;return /^( {0,3})([*+-]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/.exec(s);}
function hr(s){let c=first(s);if(c!==42&&c!==45&&c!==95)return false;return /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(s);}
function fence(s){let c=first(s);if(c!==96&&c!==126)return null;return /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(s);}
function htmlStart(s){if(first(s)!==60)return null;let m=/^ {0,3}<(\/?)([\w-]+)/.exec(s);if(/^ {0,3}<!--/.test(s))return ['-->'];if(/^ {0,3}<\?/.test(s))return ['?>'];if(/^ {0,3}<!\[CDATA\[/.test(s))return [']]>'];if(/^ {0,3}<![A-Z]/.test(s))return ['>'];if(m){let t=m[2].toLowerCase();if(!m[1]&&/^(script|pre|style|textarea)$/.test(t)&&/^(?:[ \t>]|$)/.test(s.slice(m[0].length)))return ['</'+t+'>'];if(tags.has(t)&&/^(?:[ \t/>]|$)/.test(s.slice(m[0].length)))return [''];}if(/^ {0,3}(?:<\/[a-zA-Z][\w-]*\s*>|<[a-zA-Z][\w-]*(?:\s+[a-zA-Z_:][\w.:-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*\s*\/?>)\s*$/.test(s))return ['',true];return null;}
function interrupt(s,inItem=false){let c=first(s);if(c!==42&&c!==43&&c!==45&&c!==95&&c!==96&&c!==126&&c!==35&&c!==62&&c!==60&&(c<48||c>57))return false;let b=bullet(s),f=fence(s),h=htmlStart(s);return hr(s)||/^ {0,3}(?:#{1,6}(?:\s|$)|>)/.test(s)||f&&!(f[1][0]==='`'&&f[2].includes('`'))||b&&b[4]!==undefined&&(!/\d/.test(b[2][0])||parseInt(b[2])===1||inItem)||h&&!h[1];}
function definition(lines,i,refs){if(!/^ {0,3}\[/.test(lines[i]))return 0;let until=i+1;while(until<lines.length&&lines[until].trim())until++;let src=lines.slice(i,until).join('\n'),m=/^ {0,3}\[((?:\\[^]|[^\[\]\\\n]|\n(?![ \t]*\n))+)\]:[ \t]*(?:\n[ \t]*)?/.exec(src);if(!m||!m[1].trim())return 0;let pos=m[0].length,start=pos,href,title='';if(src[pos]==='<'){start=++pos;while(pos<src.length&&src[pos]!=='>'&&src[pos]!=='\n'){if(src[pos]==='\\')pos++;pos++;}if(src[pos]!=='>')return 0;href=src.slice(start,pos++);if(href.includes('<'))return 0;}else{while(pos<src.length&&!/\s/.test(src[pos])){if(src[pos]==='\\'&&pos+1<src.length)pos++;pos++;}href=src.slice(start,pos);if(!href||href[0]==='<')return 0;}
 let hrefEnd=pos;while(src[pos]===' '||src[pos]==='\t')pos++;if(src[pos]==='\n'){let z=pos+1;while(src[z]===' '||src[z]==='\t')z++;if('"\'('.includes(src[z]||'!'))pos=z;}
 if(pos>hrefEnd&&'"\'('.includes(src[pos]||'!')){let q=src[pos],close=q==='('?')':q,tstart=++pos;while(pos<src.length&&src[pos]!==close&&!/^\n[ \t]*\n/.test(src.slice(pos))){if(src[pos]==='\\')pos++;pos++;}if(src[pos]!==close)return 0;title=src.slice(tstart,pos++);while(src[pos]===' '||src[pos]==='\t')pos++;}
 if(pos<src.length&&src[pos]!=='\n'){if(src.slice(hrefEnd,pos).includes('\n')){pos=hrefEnd;title='';}else return 0;}let key=label(m[1]);if(!refs[key])refs[key]=[unescape(href),unescape(title)];return src.slice(0,pos).split('\n').length;}
function blocks(lines,refs,tight=false,report=null,inItem=false,inQuote=false,initialText=inItem){let out='',i=0,textMode=initialText;
 while(i<lines.length){let line=lines[i];if(line===boundaryMark){i++;continue;}if(!line.trim()){if(report&&out&&lines.slice(i+1).some(x=>x.trim()))report[0]=true;i++;continue;}let m;
 if((m=/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line))){let text=m[2].replace(/(?:^|[ \t]+)#+[ \t]*$/,'').trim();setTail(report,'heading');out+='<h'+m[1].length+'>'+inline(text,refs)+'</h'+m[1].length+'>\n';i++;continue;}
 if(hr(line)){setTail(report,'hr');out+='<hr>\n';i++;continue;}
 let f=fence(line);if(f&&!(f[1][0]==='`'&&f[2].includes('`'))){let j=i+1,content=[],indent=line.length-line.trimStart().length;while(j<lines.length){let z=lines[j],q=/^ {0,3}(`+|~+)[ \t]*$/.exec(z);if(q&&q[1][0]===f[1][0]&&q[1].length>=f[1].length)break;let k=0;if(f[1][0]==='`')while(k<indent&&/\s/.test(z[k]||'!'))k++;content.push(z.slice(k));j++;}setTail(report,'code');let lang=unescape(f[2].trim()).split(/\s+/)[0];let code=content.join('\n');if(j===lines.length&&lines.at(-1)==='')code=code.slice(0,-1);out+='<pre><code'+(lang?' class="language-'+escape(lang)+'"':'')+'>'+escape(code,true)+(code&&!code.endsWith('\n')?'\n':'')+'</code></pre>\n';i=j<lines.length?j+1:j;continue;}
 if(/^(?: {4}| {0,3}\t)/.test(line)){let j=i,content=[];while(j<lines.length&&(!lines[j].trim()||/^(?: {4}| {0,3}\t)/.test(lines[j]))){content.push(lines[j].replace(/^(?: {0,3}\t| {1,4})/,''));j++;}while(content.length&&!content.at(-1).trim())content.pop();setTail(report,'code');out+='<pre><code>'+escape(content.join('\n'),true)+'\n</code></pre>\n';i=j;continue;}
 let h=htmlStart(line);if(h){setTail(report,'html');let j=i+1;if(h[0]){while(!lines[j-1].toLowerCase().includes(h[0])&&j<lines.length)j++;}else{while(j<lines.length&&lines[j].trim())j++;}out+=lines.slice(i,j).join('\n')+(j<lines.length&&(lines[j].trim()!==''||j===lines.length-1||h[0]&&lines[j]!=='')?'\n':'');i=j;continue;}
 if(/^ {0,3}>/.test(line)){let j=i,inner=[],blank=false,lazyTail=null,lazy=false,lazyCode=false;
 while(j<lines.length){let z=lines[j];if(z===boundaryMark)break;
 if(/^ {0,3}>/.test(z)){if(lazy&&lazyTail&&(lazyTail[1]==='list'||lazyTail[1]==='quote'&&lazyTail[2]==='list'))inner.push(boundaryMark);lazy=false;lazyCode=false;lazyTail=null;inner.push(expandQuote(z).replace(/^ {0,3}>[ \t]?/,''));blank=!inner.at(-1).trim();j++;continue;}
 if(!z.trim()||blank||interrupt(z)||bullet(z))break;
 if(!lazyTail){let saved=collecting;collecting=true;lazyTail=[false];blocks(inner,refs,false,lazyTail,false,true);collecting=saved;}
 let terminal=lazyTail[2]||lazyTail[1];if(['code','heading','hr','html','table'].includes(terminal))break;
 lazyCode=(!lazy||lazyCode)&&/^(?: {4}| {0,3}\t)/.test(z);if(lazyCode){let set=quoteLazy.get(inner);if(!set)quoteLazy.set(inner,set=new Set());set.add(inner.length);}inner.push(/^ {0,3}(?:=+|-+)[ \t]*$/.test(z)?'    '+z:z);lazy=true;j++;
 }
 let state=[false];out+='<blockquote>\n'+blocks(inner,refs,false,state,false,true)+'</blockquote>\n';setTail(report,'quote',state[2]||state[1]);i=j;continue;}
 let b=bullet(line);if(b){let ordered=/\d/.test(b[2][0]),mark=ordered?b[2].at(-1):b[2],start=parseInt(b[2]),j=i,items=[],loose=false;
 while(j<lines.length){let normalized=expandLeading(lines[j]);let q=bullet(normalized);if(!q||(/\d/.test(q[2][0]))!==ordered||(ordered?q[2].at(-1):q[2])!==mark||hr(lines[j]))break;
 let prefix=q[1].length+q[2].length,space=expandTabs(q[3]||' ',prefix).length,text=q[4]||'';if(!text)space=1;if(space>4){text=' '.repeat(space-1)+text;space=1;}let indent=prefix+space,inner=[text],k=j+1,pending=false,itemFence=validFence(text)?.[1]||null;
 while(k<lines.length){let z=expandLeading(lines[k]);if(z===boundaryMark)break;let nb=bullet(z);if(nb&&nb[1].length<indent)break;if(!z.trim()){if(!text&&inner.length===1){if(k+1<lines.length&&bullet(lines[k+1]))loose=true;k++;break;}inner.push('');pending=true;k++;continue;}let leading=z.match(/^ */)[0].length;if(leading>=indent){let part=z.slice(indent),ff=validFence(part);if(ff){if(!itemFence)itemFence=ff[1];else if(ff[1][0]===itemFence[0]&&ff[1].length>=itemFence.length)itemFence=null;}inner.push(part);pending=false;k++;continue;}if(pending||interrupt(z)||/^ {0,3}(?:`{3,}|~{3,})/.test(z)||listPreviousStops(k===j+1?' '.repeat(space)+text:expandLeading(lines[k-1]).slice(indent))||/^(?: {4}| {0,3}\t)/.test(k===j+1?text:expandLeading(lines[k-1]).slice(indent)))break;inner.push(z);k++;}
 if(inner.length>1&&inner.at(-1)===''&&k<lines.length){let next=bullet(lines[k]);if(next&&!hr(lines[k])&&(/\d/.test(next[2][0]))===ordered&&(ordered?next[2].at(-1):next[2])===mark)loose=true;}items.push(inner);j=k;let next=j<lines.length?bullet(lines[j]):null;if(!next||(/\d/.test(next[2][0]))!==ordered||(ordered?next[2].at(-1):next[2])!==mark){while(j>i&&lines[j-1].trim()==='')j--;break;}}
 let bodies=[],lastState=null;for(let itemIndex=0;itemIndex<items.length;itemIndex++){let inner=items[itemIndex];if(itemIndex===items.length-1){while(inner.length&&inner.at(-1).trim()==='')inner.pop();if(inner.length)inner[inner.length-1]=inner.at(-1).trimEnd();}let task=/^\[([ xX])\][ \t]+(?=\S)/.exec(inner[0]||''),check='';if(task){check='<input '+(task[1].toLowerCase()==='x'?'checked="" ':'')+'disabled="" type="checkbox"> ';}let state=[false],queueStart=deferred?.length||0,body=blocks(inner,refs,false,state,true);if(task&&deferred&&deferred.length>queueStart)deferred[queueStart]=deferred[queueStart].replace(/^\[[ xX]\][ \t]+/,'');lastState=state;if(state[0])loose=true;if(check){if(body.startsWith(paragraphMark+'+'))body=paragraphMark+'+'+check+body.slice(paragraphMark.length+1);else body=check+body;}bodies.push(body);}
 out+='<'+(ordered?'ol'+(start!==1?' start="'+start+'"':''):'ul')+'>\n';for(let body of bodies){body=body.replaceAll(paragraphMark+'+',loose?'<p>':'').replaceAll(paragraphMark+'-',loose?'</p>\n':'');out+='<li>'+body+'</li>\n';}out+='</'+(ordered?'ol':'ul')+'>\n';setTail(report,'list',lastState?.[2]||lastState?.[1]);textMode=false;i=j;continue;}
 let def=definition(lines,i,refs);if(def){i+=def;continue;}
 if(i+1<lines.length&&/^ {0,3}(?:=+|-+)[ \t]*$/.test(lines[i+1])){let level=lines[i+1].trim()[0]==='='?1:2;setTail(report,'heading');out+='<h'+level+'>'+inline(line.trim(),refs)+'</h'+level+'>\n';i+=2;continue;}
 if(i+1<lines.length&&/[:|]/.test(lines[i+1])&&/^ {0,3}\|?[ :\-]+(?:\|[ :\-]+)*\|?[ \t]*$/.test(lines[i+1])){let heads=cells(line),aligns=cells(lines[i+1]);if(heads.length===aligns.length&&aligns.every(x=>/^:?-+:?$/.test(x.replace(/ /g,'')))){setTail(report,'table');let align=aligns.map(x=>x[0]===':'?(x.endsWith(':')?'center':'left'):x.endsWith(':')?'right':'');let cell=(text,k,tag)=>'<'+tag+(align[k]?' align="'+align[k]+'"':'')+'>'+inline(text,refs)+'</'+tag+'>\n';out+='<table>\n<thead>\n<tr>\n'+heads.map((x,k)=>cell(x,k,'th')).join('')+'</tr>\n</thead>\n';let j=i+2,rows='';while(j<lines.length&&!/^ *$/.test(lines[j])&&!interrupt(lines[j])&&!/^(?: {4}| {0,3}\t)[^\n]/.test(lines[j])){rows+='<tr>\n'+cells(lines[j],heads.length).map((x,k)=>cell(x,k,'td')).join('')+'</tr>\n';j++;}if(rows)out+='<tbody>'+rows+'</tbody>';out+='</table>\n';i=j;continue;}}
 let j=i+1;while(j<lines.length&&lines[j]!==boundaryMark&&(lines[j].trim()||lines[j]!==''&&j===lines.length-1||textMode&&codeContinues(lines,i,j))&&!interrupt(lines[j],textMode)){if(tablePair(lines,j)||/^ {0,3}(?:=+|-+)[ \t]*$/.test(lines[j]))break;j++;}
 if(j<lines.length&&/^ {0,3}(?:=+|-+)[ \t]*$/.test(lines[j])){let level=lines[j].trim()[0]==='='?1:2;setTail(report,'heading');out+='<h'+level+'>'+inline(lines.slice(i,j).join('\n').trim(),refs)+'</h'+level+'>\n';i=j+1;continue;}
 setTail(report,'paragraph');let source=paragraphSource(lines,i,j,textMode,inQuote);if(j<lines.length&&/^(?: {4}| {0,3}\t)/.test(lines[j])&&tablePair(lines,j)){let code=[];while(j<lines.length&&/^(?: {4}| {0,3}\t)/.test(lines[j]))code.push(lines[j++].replace(/^(?: {0,3}\t| {1,4})/,''));source+='\n'+code.join('\n')+'\n';}let text=inline(source,refs);out+=inItem&&report?paragraphMark+'+'+text+paragraphMark+'-':tight?text:'<p>'+text+'</p>\n';i=j;
 }
 if(tight&&out.endsWith('\n')&&!out.endsWith('>\n'))out=out.slice(0,-1);return out;
}
export function parse(markdown){referenceMemo=[new Map(),new Map(),new Map(),new Map()];let source=markdown.replace(/\r\n?/g,'\n'),lines=source.split('\n'),refs=Object.create(null);marker='\0';while(source.includes(marker))marker+='\0';paragraphMark='\x01';while(source.includes(paragraphMark))paragraphMark+='\x01';boundaryMark='\x02';while(source.includes(boundaryMark))boundaryMark+='\x02';deferred=[];collecting=false;let template=blocks(lines,refs),pending=deferred;deferred=null;linkState=false;let parts=template.split(marker),html=parts[0];for(let i=0;i<pending.length;i++)html+=inline(pending[i],refs)+parts[i+1];return html;}

function numeric(s){let v=s[2].toLowerCase()==='x'?parseInt(s.slice(3),16):parseInt(s.slice(2),10);if(!v||v>0x10ffff||v>=0xd800&&v<=0xdfff)return '\ufffd';return String.fromCodePoint(v);}
function flanks(s,i,n,ch){let after=s[i+n]||' ';while(i&&s[i-1]===ch)i--;let before=i?s[i-1]:' ';let bp=isPunct(before),ap=isPunct(after),bw=isSpace(before),aw=isSpace(after);let l=!aw&&(!ap||bw||bp),r=!bw&&(!bp||aw||ap);return ch==='_'?[l&&(!r||bp),r&&(!l||ap)]:[l,r];}
function opaque(s,i,refs){let c=s[i];if(c==='\\')return Math.min(s.length,i+2);if(c==='`'){let n=1;while(s[i+n]==='`')n++;let j=i+n;while((j=s.indexOf('`',j))>=0){let m=1;while(s[j+m]==='`')m++;if(m===n)return j+m;j+=m;}return i+n;}
 if(c==='<'){let m=/^(?:<[^<>\n]+>|<!--(?:-?>|[\s\S]*?-->))/.exec(s.slice(i));if(m)return i+m[0].length;}
 if(c==='['||c==='!'&&s[i+1]==='['){let image=c==='!',start=i+(image?2:1),end=bracketEnd(s,start);if(end>=0){let next=end+1;if(s[next]==='('){let d=destination(s,next+1);if(d)return d[0];}let key=s.slice(start,end);if(s[next]==='['){let z=s.indexOf(']',next+1);if(z>=0){key=s.slice(next+1,z)||key;next=z+1;}}if(refs[label(key)])return next;}}
 return i;
}
function emphasis(s,i,n,ch,refs,mask){let depth=n,ignored=0,start=i;while(start&&s[start-1]===ch)start--;let original=n+i-start,before=maskedChar(s,start-1,mask),after=maskedChar(s,i+n,mask);let initialSpecial=!isSpace(before)&&(isPunct(after)||ch==='*'&&!isPunct(before)),continued=i>start;
 let j=i+n,other=ch==='*'?'_':'*',p=j;while(p<s.length&&s[p]!=='*'&&s[p]!=='_')p++;if(s[p]===other&&s[p+1]===other){let q=p+2;while(q<s.length&&s[q]!=='*'&&s[q]!=='_')q++;if(s[q]===ch&&s[q+1]!==ch){let r=q+1;while(r<s.length&&s[r]!=='*'&&s[r]!=='_')r++;if(s[r]===other&&s[r+1]===other)j=r;}}
 for(;j<s.length;){if(mask&&mask[j]||s[j]!==ch){j++;continue;}let m=1;while(s[j+m]===ch&&!(mask&&mask[j+m]))m++;let b=maskedChar(s,j-1,mask),a=maskedChar(s,j+m,mask),bp=isPunct(b)||ch==='_'&&b==='~',ap=isPunct(a)||ch==='_'&&a==='~',bw=isSpace(b),aw=isSpace(a),bn=!bp&&!bw,an=!ap&&!aw;
 let opener=(bp||bw)&&an||bw&&ap,closer=bp&&aw||bn&&(ap||aw),dual=bp&&ap||ch==='*'&&bn&&an;
 if(opener){depth+=m;j+=m;continue;}if(!closer&&!dual){j+=m;continue;}if(dual||initialSpecial){if(continued&&dual)break;if(original%3&&(original+m)%3===0){ignored+=m;j+=m;continue;}}
 depth-=m;if(depth<=0){let consumed=Math.min(m,m+depth+ignored),used=Math.min(n,consumed)%2?1:2;return [i,j+consumed-used,used,j+consumed];}j+=m;
 }return null;}
function maskedChar(s,i,mask){if(i<0||i>=s.length)return ' ';return mask&&mask[i]?(mask[i]===2?'[':mask[i]===3?']':mask[i]===4?'+':'a'):s[i];}

function plain(s,refs){return linkInline(s,refs,false).replace(/<img [^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<\/?(?:a|em|strong|del|code)(?: [^>]*)?>/g,'');}

function expandLeading(line){if(!line.includes('\t'))return line;return line.replace(/^[ \t]+/,prefix=>expandTabs(prefix));}
function expandTabs(prefix,col=0){let out='';for(let c of prefix){if(c==='\t'){let n=4-col%4;out+=' '.repeat(n);col+=n;}else{out+=c;col++;}}return out;}
function expandQuote(line){return line.replace(/^( {0,3}>)([ \t]+)/,(all,mark,space)=>mark+expandTabs(space,mark.length));}

function codeMask(s,refs){
 if(!/[`[<\\]/.test(s))return null;
 let chars=null;
 for(let i=s.indexOf('[');i>=0;i=s.indexOf('[',i+1)){let end=bracketEnd(s,i+1);if(end<0)continue;let next=end+1,key=s.slice(i+1,end);if(s[next]==='['){let r=s.indexOf(']',next+1);if(r<0)continue;key=s.slice(next+1,r)||key;next=r+1;}else if(s[next]==='(')continue;if(refs[label(key)]){if(!chars)chars=s;if(hasExplicitLink(s.slice(i+1,end),refs)){if(next>end+3)chars=chars.slice(0,end+2)+'a'.repeat(next-end-3)+chars.slice(next-1);continue;}chars=chars.slice(0,i)+'['+'a'.repeat(next-i-2)+']'+chars.slice(next);i=next-1;}}
 let base=chars||s;chars=null;
 for(let i=nextMaskEscape(base,0);i>=0;i=nextMaskEscape(base,i+1)){if(base[i]==='\\'&&i+1<base.length&&punct.test(base[i+1])){if(!chars)chars=base;chars=chars.slice(0,i)+'++'+chars.slice(i+2);i++;continue;}if(base[i]!=='`')continue;let n=1;while(base[i+n]==='`')n++;let end=opaque(base,i,emptyRefs);if(end>i+n){let k=base.indexOf('`',i+n);while(k>=0&&k<end-n){if(!chars)chars=base;chars=chars.slice(0,k)+'+'+chars.slice(k+1);k=base.indexOf('`',k+1);}i=end-1;}else i+=n-1;}
 base=chars||base;let mask=new Uint8Array(s.length);if(base!==s)for(let i=0;i<base.length;i++)if(base[i]!==s[i])mask[i]=base[i]==='+'?4:base[i]==='['?2:base[i]===']'?3:1;for(let i=nextMaskToken(base,0);i>=0;i=nextMaskToken(base,i+1)){
 let end=-1;if(base[i]==='<'&&base[i+1]!==' '){let q=base.indexOf('>',i+1);if(q>=0&&!base.slice(i+1,q).includes('<'))end=q+1;}
 if(base[i]==='['){let q=i+1;while(q<base.length&&base[q]!==']'&&base[q]!=='['){if(base[q]==='`'){let n=1;while(base[q+n]==='`')n++;let z=opaque(base,q,emptyRefs);if(z===q+n)break;q=z;continue;}q++;}if(base[q]===']'&&base[q+1]==='('){let k=q+2,depth=1,max=1;for(;k<base.length&&depth;k++){if(base[k]==='\\'){k++;continue;}if(base[k]==='('){depth++;max=Math.max(max,depth);}if(base[k]===')')depth--;}if(!depth&&max<=2)end=k;}}
 if(base[i]==='`'&&(i===0||base[i-1]!=='`')){let n=1;while(base[i+n]==='`')n++;let q=base.indexOf('`',i+n);if(q>i+n&&base.slice(q,q+n)==='`'.repeat(n)&&base[q+n]!=='`')end=q+n;}
 if(end>i+1){mask.fill(1,i,end);mask[i]=2;mask[end-1]=3;i=end-1;}}
 return mask;
}
function linkInline(s,refs,raw){let saved=linkState;linkState=true;let html=inline(s,refs,undefined,raw);linkState=saved;return html;}

function trimUrl(s){s=s.replace(/&[A-Za-z0-9]+;$/,'');let valid=0;for(let i=0;i<s.length;i++){let c=s[i];if(c==='('){let end=s.indexOf(')',i+1);if(end<0)break;i=end;valid=i+1;}else if(!'?!.,:;*_\"\'~)'.includes(c))valid=i+1;}return s.slice(0,valid);}

function first(s){let i=0;while(i<4&&s.charCodeAt(i)===32)i++;return i===4?0:s.charCodeAt(i);}

const autoSearch=/[hH][tT][tT][pP][sS]?:\/\/|[fF][tT][pP]:\/\/|www\.|@/g;
const emailAt=/^[A-Za-z0-9._+-]+@[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*[A-Za-z0-9])+(?![\w-])/;
function emailChar(c){return c>=65&&c<=90||c>=97&&c<=122||c>=48&&c<=57||c===46||c===95||c===43||c===45;}
function nextAuto(s,i){autoSearch.lastIndex=i;let m;while(m=autoSearch.exec(s)){if(m[0]!=='@')return m.index;let start=m.index;while(start>i&&emailChar(s.charCodeAt(start-1)))start--;if(start===m.index||!emailAt.test(s.slice(start)))continue;if(start-i>=7&&s.slice(start-7,start)==='mailto:')start-=7;else if(start-i>=5&&s.slice(start-5,start)==='xmpp:')start-=5;return start;}return Infinity;}

function isPunct(c){let n=c.charCodeAt(0);return n<128?n!==126&&(n>=33&&n<=47||n>=58&&n<=64||n>=91&&n<=96||n>=123&&n<=125):punct.test(c);}
function isSpace(c){let n=c.charCodeAt(0);return n<128?n===32||n>=9&&n<=13:ws.test(c);}
const quoteLazy=new WeakMap();
function paragraphSource(lines,start,end,inItem,inQuote){if(!inItem){let lazy=quoteLazy.get(lines),out=lines[start],code=false;for(let i=start+1;i<end;i++){let z=lines[i],ind=!!lazy?.has(i);out+='\n'+(code&&!ind?'\n':'')+(ind?z.replace(/^(?: {0,3}\t| {4})/,''):inQuote?z.replace(/^ {4}(?=[*+-] )/,''):z);code=ind;}return out;}let out=lines[start],code=false;for(let i=start+1;i<end;i++){let z=lines[i],indent=/^(?: {0,3}\t| {4})/.test(z),blank=!z.trim();out+='\n'+(code&&!indent&&!blank?'\n':'')+(indent?z.replace(/^(?: {0,3}\t| {4})/,''):blank?'':z);if(!blank)code=indent;}if(code&&end<lines.length&&lines[end].trim())out+='\n';return out;}

function nestedQuoteCode(lines){let line=lines.at(-1)||'';if(!/^ {0,3}>/.test(line))return false;line=line.replace(/^(?: {0,3}>[ \t]?)+/,'');let f=fence(line);return !!f&&!f[2].includes('`')||/^ {4}/.test(line);}

function validFence(s){let f=fence(s);return f&&!(f[1][0]==='`'&&f[2].includes('`'))?f:null;}

function listPreviousStops(s){return !!fence(s)||/^ {0,3}#{1,6}(?:\s|$)/.test(s)||hr(s)||!!htmlStart(s)&&!htmlStart(s)[1];}

function setTail(report,type,leaf=type){if(report){report[1]=type;report[2]=leaf;}}

function hasExplicitLink(s,refs){if(!s.includes('['))return false;for(let i=0;i<s.length;i++){if(s[i]==='\\'){i++;continue;}if(s[i]==='`'){i=opaque(s,i,emptyRefs)-1;continue;}if(s[i]!=='[')continue;let image=s[i-1]==='!',end=bracketEnd(s,i+1);if(end<0)continue;let next=end+1;if(s[next]==='('){let d=destination(s,next+1);if(d){if(!image)return true;i=d[0]-1;continue;}}let key=s.slice(i+1,end);if(s[next]==='['){let z=s.indexOf(']',next+1);if(z<0)continue;key=s.slice(next+1,z)||key;}if(refs[label(key)]){if(!image)return true;if(s[next]==='['){let e=s.indexOf(']',next+1);if(e>=0)i=e;}else i=end;}}return false;}

function tablePair(lines,i){return i+1<lines.length&&/[:|]/.test(lines[i+1])&&/^ *[^ ].*/.test(lines[i])&&/^ {0,3}\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/.test(lines[i+1]);}

function codeContinues(lines,start,i){if(i<=start+1||!/^(?: {4}| {0,3}\t)/.test(lines[i-1]))return false;let j=i+1;while(j<lines.length&&!lines[j].trim())j++;return j<lines.length&&/^(?: {4}| {0,3}\t)/.test(lines[j]);}

const inlineMemo=[new Map(),new Map(),new Map(),new Map()];

function plainInline(s,inLink){if(!inLink&&(s.includes('@')||s.includes('://')||s.includes('www.')))return false;for(let i=0;i<s.length;i++){let c=s.charCodeAt(i);if(c===92||c===96||c===33||c===91||c===60||c===42||c===95||c===126||c===10||c===38||c===62||c===34||c===39)return false;}return true;}

let referenceMemo;

const plainRun=/[\\`!\[<*_~\n&>"']| (?= |\n)/g;

const maskEscape=/[`\\]/g,maskToken=/[<`\[]/g;
function nextMaskEscape(s,i){maskEscape.lastIndex=i;let m=maskEscape.exec(s);return m?m.index:-1;}
function nextMaskToken(s,i){maskToken.lastIndex=i;let m=maskToken.exec(s);return m?m.index:-1;}
