/**
@license

   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote
        products derived from this software without specific prior written
        permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
var _0x6f6b30=_0x48f7;function _0x3920(){var _0xd8a54f=['63482SczaUc','prototype','random','UPPER_MASK','1826436wdxjmL','MATRIX_A','1203020erCRLF','init_genrand','1888785mZucBw','416904ymVSrY','8JYolAE','getTime','mti','8086449euQKXp','LOWER_MASK','4325520XMaIck'];_0x3920=function(){return _0xd8a54f;};return _0x3920();}(function(_0x5bf02a,_0x3813d4){var _0x3106b7=_0x48f7,_0x10b20e=_0x5bf02a();while(!![]){try{var _0x3a32b1=parseInt(_0x3106b7(0x1d2))/0x1+parseInt(_0x3106b7(0x1ce))/0x2+-parseInt(_0x3106b7(0x1d6))/0x3+parseInt(_0x3106b7(0x1dd))/0x4+-parseInt(_0x3106b7(0x1d4))/0x5+parseInt(_0x3106b7(0x1d7))/0x6+parseInt(_0x3106b7(0x1db))/0x7*(-parseInt(_0x3106b7(0x1d8))/0x8);if(_0x3a32b1===_0x3813d4)break;else _0x10b20e['push'](_0x10b20e['shift']());}catch(_0x45bc6c){_0x10b20e['push'](_0x10b20e['shift']());}}}(_0x3920,0xf0253));var MersenneTwister=function(_0x45c287){var _0x5d656d=_0x48f7;_0x45c287==undefined&&(_0x45c287=new Date()[_0x5d656d(0x1d9)]()),this['N']=0x270,this['M']=0x18d,this[_0x5d656d(0x1d3)]=0x9908b0df,this[_0x5d656d(0x1d1)]=0x80000000,this[_0x5d656d(0x1dc)]=0x7fffffff,this['mt']=new Array(this['N']),this[_0x5d656d(0x1da)]=this['N']+0x1,this[_0x5d656d(0x1d5)](_0x45c287);};function _0x48f7(_0x14ce49,_0x4ba26a){var _0x392030=_0x3920();return _0x48f7=function(_0x48f792,_0x1f05c4){_0x48f792=_0x48f792-0x1ce;var _0x39d7ae=_0x392030[_0x48f792];return _0x39d7ae;},_0x48f7(_0x14ce49,_0x4ba26a);}MersenneTwister[_0x6f6b30(0x1cf)][_0x6f6b30(0x1d5)]=function(_0x56f577){var _0x18335f=_0x6f6b30;this['mt'][0x0]=_0x56f577>>>0x0;for(this['mti']=0x1;this[_0x18335f(0x1da)]<this['N'];this['mti']++){var _0x56f577=this['mt'][this['mti']-0x1]^this['mt'][this[_0x18335f(0x1da)]-0x1]>>>0x1e;this['mt'][this[_0x18335f(0x1da)]]=(((_0x56f577&0xffff0000)>>>0x10)*0x6c078965<<0x10)+(_0x56f577&0xffff)*0x6c078965+this[_0x18335f(0x1da)],this['mt'][this[_0x18335f(0x1da)]]>>>=0x0;}},MersenneTwister['prototype']['genrand_int32']=function(){var _0x143c84=_0x6f6b30,_0x541b58,_0x2ccad0=new Array(0x0,this[_0x143c84(0x1d3)]);if(this[_0x143c84(0x1da)]>=this['N']){var _0x49544b;if(this[_0x143c84(0x1da)]==this['N']+0x1)this[_0x143c84(0x1d5)](0x1571);for(_0x49544b=0x0;_0x49544b<this['N']-this['M'];_0x49544b++){_0x541b58=this['mt'][_0x49544b]&this[_0x143c84(0x1d1)]|this['mt'][_0x49544b+0x1]&this[_0x143c84(0x1dc)],this['mt'][_0x49544b]=this['mt'][_0x49544b+this['M']]^_0x541b58>>>0x1^_0x2ccad0[_0x541b58&0x1];}for(;_0x49544b<this['N']-0x1;_0x49544b++){_0x541b58=this['mt'][_0x49544b]&this[_0x143c84(0x1d1)]|this['mt'][_0x49544b+0x1]&this['LOWER_MASK'],this['mt'][_0x49544b]=this['mt'][_0x49544b+(this['M']-this['N'])]^_0x541b58>>>0x1^_0x2ccad0[_0x541b58&0x1];}_0x541b58=this['mt'][this['N']-0x1]&this[_0x143c84(0x1d1)]|this['mt'][0x0]&this[_0x143c84(0x1dc)],this['mt'][this['N']-0x1]=this['mt'][this['M']-0x1]^_0x541b58>>>0x1^_0x2ccad0[_0x541b58&0x1],this[_0x143c84(0x1da)]=0x0;}return _0x541b58=this['mt'][this[_0x143c84(0x1da)]++],_0x541b58^=_0x541b58>>>0xb,_0x541b58^=_0x541b58<<0x7&0x9d2c5680,_0x541b58^=_0x541b58<<0xf&0xefc60000,_0x541b58^=_0x541b58>>>0x12,_0x541b58>>>0x0;},MersenneTwister['prototype'][_0x6f6b30(0x1d0)]=function(){return this['genrand_int32']()*(0x1/0x100000000);};