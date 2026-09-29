function N(e,n){let i=e.slice(0,n).split(/\r\n|\n|\r/g);return[i.length,i.pop().length+1]}function V(e,n,i){let r=e.split(/\r\n|\n|\r/g),l="",t=(Math.log10(n+1)|0)+1;for(let f=n-1;f<=n+1;f++){let o=r[f-1];o&&(l+=f.toString().padEnd(t," "),l+=":  ",l+=o,l+=`
`,f===n&&(l+=" ".repeat(t+i+2),l+=`^
`))}return l}var a=class extends Error{line;column;codeblock;constructor(n,i){let[r,l]=N(i.toml,i.ptr),t=V(i.toml,r,l);super(`Invalid TOML document: ${n}

${t}`,i),this.line=r,this.column=l,this.codeblock=t}};function s(e,n=0,i=e.length){let r=e.indexOf(`
`,n);return e[r-1]==="\r"&&r--,r<=i?r:-1}function w(e,n){for(let i=n;i<e.length;i++){let r=e[i];if(r===`
`)return i;if(r==="\r"&&e[i+1]===`
`)return i+1;if(r<" "&&r!=="	"||r==="\x7F")throw new a("control characters are not allowed in comments",{toml:e,ptr:n})}return e.length}function m(e,n,i,r){let l;for(;(l=e[n])===" "||l==="	"||!i&&(l===`
`||l==="\r"&&e[n+1]===`
`);)n++;return r||l!=="#"?n:m(e,w(e,n),i)}function E(e,n,i,r,l=!1){if(!r)return n=s(e,n),n<0?e.length:n;for(let t=n;t<e.length;t++){let f=e[t];if(f==="#")t=s(e,t);else{if(f===i)return t+1;if(f===r)return t;if(l&&(f===`
`||f==="\r"&&e[t+1]===`
`))return t}}throw new a("cannot find end of structure",{toml:e,ptr:n})}function x(e,n){let i=e[n],r=i===e[n+1]&&e[n+1]===e[n+2]?e.slice(n,n+3):i;n+=r.length-1;do n=e.indexOf(r,++n);while(n>-1&&i!=="'"&&e[n-1]==="\\"&&e[n-2]!=="\\");return n>-1&&(n+=r.length,r.length>1&&(e[n]===i&&n++,e[n]===i&&n++)),n}var C=/^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}:\d{2}(?:\.\d+)?)?(Z|[-+]\d{2}:\d{2})?$/i,h=class e extends Date{#n=!1;#t=!1;#e=null;constructor(n){let i=!0,r=!0,l="Z";if(typeof n=="string"){let t=n.match(C);t?(t[1]||(i=!1,n=`0000-01-01T${n}`),r=!!t[2],t[2]&&+t[2]>23?n="":(l=t[3]||null,n=n.toUpperCase(),!l&&r&&(n+="Z"))):n=""}super(n),isNaN(this.getTime())||(this.#n=i,this.#t=r,this.#e=l)}isDateTime(){return this.#n&&this.#t}isLocal(){return!this.#n||!this.#t||!this.#e}isDate(){return this.#n&&!this.#t}isTime(){return this.#t&&!this.#n}isValid(){return this.#n||this.#t}toISOString(){let n=super.toISOString();if(this.isDate())return n.slice(0,10);if(this.isTime())return n.slice(11,23);if(this.#e===null)return n.slice(0,-1);if(this.#e==="Z")return n;let i=+this.#e.slice(1,3)*60+ +this.#e.slice(4,6);return i=this.#e[0]==="-"?i:-i,new Date(this.getTime()-i*6e4).toISOString().slice(0,-1)+this.#e}static wrapAsOffsetDateTime(n,i="Z"){let r=new e(n);return r.#e=i,r}static wrapAsLocalDateTime(n){let i=new e(n);return i.#e=null,i}static wrapAsLocalDate(n){let i=new e(n);return i.#t=!1,i.#e=null,i}static wrapAsLocalTime(n){let i=new e(n);return i.#n=!1,i.#e=null,i}};var L=/^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/,P=/^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/,v=/^[+-]?0[0-9_]/,R=/^[0-9a-f]{4,8}$/i,O={b:"\b",t:"	",n:`
`,f:"\f",r:"\r",'"':'"',"\\":"\\"};function y(e,n=0,i=e.length){let r=e[n]==="'",l=e[n++]===e[n]&&e[n]===e[n+1];l&&(i-=2,e[n+=2]==="\r"&&n++,e[n]===`
`&&n++);let t=0,f,o="",c=n;for(;n<i-1;){let u=e[n++];if(u===`
`||u==="\r"&&e[n]===`
`){if(!l)throw new a("newlines are not allowed in strings",{toml:e,ptr:n-1})}else if(u<" "&&u!=="	"||u==="\x7F")throw new a("control characters are not allowed in strings",{toml:e,ptr:n-1});if(f){if(f=!1,u==="u"||u==="U"){let d=e.slice(n,n+=u==="u"?4:8);if(!R.test(d))throw new a("invalid unicode escape",{toml:e,ptr:t});try{o+=String.fromCodePoint(parseInt(d,16))}catch{throw new a("invalid unicode escape",{toml:e,ptr:t})}}else if(l&&(u===`
`||u===" "||u==="	"||u==="\r")){if(n=m(e,n-1,!0),e[n]!==`
`&&e[n]!=="\r")throw new a("invalid escape: only line-ending whitespace may be escaped",{toml:e,ptr:t});n=m(e,n)}else if(u in O)o+=O[u];else throw new a("unrecognized escape sequence",{toml:e,ptr:t});c=n}else!r&&u==="\\"&&(t=n-1,f=!0,o+=e.slice(c,t))}return o+e.slice(c,i-1)}function S(e,n,i){if(e==="true")return!0;if(e==="false")return!1;if(e==="-inf")return-1/0;if(e==="inf"||e==="+inf")return 1/0;if(e==="nan"||e==="+nan"||e==="-nan")return NaN;if(e==="-0")return 0;let r;if((r=L.test(e))||P.test(e)){if(v.test(e))throw new a("leading zeroes are not allowed",{toml:n,ptr:i});let t=+e.replace(/_/g,"");if(isNaN(t))throw new a("invalid number",{toml:n,ptr:i});if(r&&!Number.isSafeInteger(t))throw new a("integer value cannot be represented losslessly",{toml:n,ptr:i});return t}let l=new h(e);if(!l.isValid())throw new a("invalid value",{toml:n,ptr:i});return l}function Z(e,n,i,r){let l=e.slice(n,i),t=l.indexOf("#");t>-1&&(w(e,t),l=l.slice(0,t));let f=l.trimEnd();if(!r){let o=l.indexOf(`
`,f.length);if(o>-1)throw new a("newlines are not allowed in inline tables",{toml:e,ptr:n+o})}return[f,t]}function g(e,n,i,r){if(r===0)throw new a("document contains excessively nested structures. aborting.",{toml:e,ptr:n});let l=e[n];if(l==="["||l==="{"){let[o,c]=l==="["?_(e,n,r):A(e,n,r),u=E(e,c,",",i);if(i==="}"){let d=s(e,c,u);if(d>-1)throw new a("newlines are not allowed in inline tables",{toml:e,ptr:d})}return[o,u]}let t;if(l==='"'||l==="'"){t=x(e,n);let o=y(e,n,t);if(i){if(t=m(e,t,i!=="]"),e[t]&&e[t]!==","&&e[t]!==i&&e[t]!==`
`&&e[t]!=="\r")throw new a("unexpected character encountered",{toml:e,ptr:t});t+=+(e[t]===",")}return[o,t]}t=E(e,n,",",i);let f=Z(e,n,t-+(e[t-1]===","),i==="]");if(!f[0])throw new a("incomplete key-value declaration: no value specified",{toml:e,ptr:n});return i&&f[1]>-1&&(t=m(e,n+f[1]),t+=+(e[t]===",")),[S(f[0],e,n),t]}var j=/^[a-zA-Z0-9-_]+[ \t]*$/;function b(e,n,i="="){let r=n-1,l=[],t=e.indexOf(i,n);if(t<0)throw new a("incomplete key-value: cannot find end of key",{toml:e,ptr:n});do{let f=e[n=++r];if(f!==" "&&f!=="	")if(f==='"'||f==="'"){if(f===e[n+1]&&f===e[n+2])throw new a("multiline strings are not allowed in keys",{toml:e,ptr:n});let o=x(e,n);if(o<0)throw new a("unfinished string encountered",{toml:e,ptr:n});r=e.indexOf(".",o);let c=e.slice(o,r<0||r>t?t:r),u=s(c);if(u>-1)throw new a("newlines are not allowed in keys",{toml:e,ptr:n+r+u});if(c.trimStart())throw new a("found extra tokens after the string part",{toml:e,ptr:o});if(t<o&&(t=e.indexOf(i,o),t<0))throw new a("incomplete key-value: cannot find end of key",{toml:e,ptr:n});l.push(y(e,n,o))}else{r=e.indexOf(".",n);let o=e.slice(n,r<0||r>t?t:r);if(!j.test(o))throw new a("only letter, numbers, dashes and underscores are allowed in keys",{toml:e,ptr:n});l.push(o.trimEnd())}}while(r+1&&r<t);return[l,m(e,t+1,!0,!0)]}function A(e,n,i){let r={},l=new Set,t,f=0;for(n++;(t=e[n++])!=="}"&&t;){if(t===`
`)throw new a("newlines are not allowed in inline tables",{toml:e,ptr:n-1});if(t==="#")throw new a("inline tables cannot contain comments",{toml:e,ptr:n-1});if(t===",")throw new a("expected key-value, found comma",{toml:e,ptr:n-1});if(t!==" "&&t!=="	"){let o,c=r,u=!1,[d,I]=b(e,n-1);for(let p=0;p<d.length;p++){if(p&&(c=u?c[o]:c[o]={}),o=d[p],(u=Object.hasOwn(c,o))&&(typeof c[o]!="object"||l.has(c[o])))throw new a("trying to redefine an already defined value",{toml:e,ptr:n});!u&&o==="__proto__"&&Object.defineProperty(c,o,{enumerable:!0,configurable:!0,writable:!0})}if(u)throw new a("trying to redefine an already defined value",{toml:e,ptr:n});let[T,$]=g(e,I,"}",i-1);l.add(T),c[o]=T,n=$,f=e[n-1]===","?n-1:0}}if(f)throw new a("trailing commas are not allowed in inline tables",{toml:e,ptr:f});if(!t)throw new a("unfinished table encountered",{toml:e,ptr:n});return[r,n]}function _(e,n,i){let r=[],l;for(n++;(l=e[n++])!=="]"&&l;){if(l===",")throw new a("expected value, found comma",{toml:e,ptr:n-1});if(l==="#")n=w(e,n);else if(l!==" "&&l!=="	"&&l!==`
`&&l!=="\r"){let t=g(e,n-1,"]",i-1);r.push(t[0]),n=t[1]}}if(!l)throw new a("unfinished array encountered",{toml:e,ptr:n});return[r,n]}function k(e,n,i,r){let l=n,t=i,f,o=!1,c;for(let u=0;u<e.length;u++){if(u){if(l=o?l[f]:l[f]={},t=(c=t[f]).c,r===0&&(c.t===1||c.t===2))return null;if(c.t===2){let d=l.length-1;l=l[d],t=t[d].c}}if(f=e[u],(o=Object.hasOwn(l,f))&&t[f]?.t===0&&t[f]?.d)return null;o||(f==="__proto__"&&(Object.defineProperty(l,f,{enumerable:!0,configurable:!0,writable:!0}),Object.defineProperty(t,f,{enumerable:!0,configurable:!0,writable:!0})),t[f]={t:u<e.length-1&&r===2?3:r,d:!1,i:0,c:{}})}if(c=t[f],c.t!==r&&!(r===1&&c.t===3)||(r===2&&(c.d||(c.d=!0,l[f]=[]),l[f].push(l={}),c.c[c.i++]=c={t:1,d:!1,i:0,c:{}}),c.d))return null;if(c.d=!0,r===1)l=o?l[f]:l[f]={};else if(r===0&&o)return null;return[f,l,c.c]}function D(e,n){let i=n?.maxDepth??1e3,r={},l={},t=r,f=l;for(let o=m(e,0);o<e.length;){if(e[o]==="["){let c=e[++o]==="[",u=b(e,o+=+c,"]");if(c){if(e[u[1]-1]!=="]")throw new a("expected end of table declaration",{toml:e,ptr:u[1]-1});u[1]++}let d=k(u[0],r,l,c?2:1);if(!d)throw new a("trying to redefine an already defined table or value",{toml:e,ptr:o});f=d[2],t=d[1],o=u[1]}else{let c=b(e,o),u=k(c[0],t,f,0);if(!u)throw new a("trying to redefine an already defined table or value",{toml:e,ptr:o});let d=g(e,c[1],void 0,i);u[1][u[0]]=d[0],o=d[1]}if(o=m(e,o,!0),e[o]&&e[o]!==`
`&&e[o]!=="\r")throw new a("each key-value declaration must be followed by an end-of-line",{toml:e,ptr:o});o=m(e,o)}return r}export{D as parse};
/*! Bundled license information:

smol-toml/dist/error.js:
smol-toml/dist/util.js:
smol-toml/dist/date.js:
smol-toml/dist/primitive.js:
smol-toml/dist/extract.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
