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
function _0x3858(){var _0x3f5169=['34359974CXTuwL','8HdJEFH','3626187OgzHqI','2jnJMex','MATRIX_A','5910gHpeWA','9NuNpzL','init_genrand','LOWER_MASK','2206589XKSUps','getTime','prototype','mti','UPPER_MASK','42KSoiZr','random','5722848PcZeqq','genrand_int32','304120wxInKq','1246966pwRDOC'];_0x3858=function(){return _0x3f5169;};return _0x3858();}var _0x4dd3fc=_0x39f8;function _0x39f8(_0x5d88ce,_0x4fe1db){var _0x385847=_0x3858();return _0x39f8=function(_0x39f8ad,_0x5057f3){_0x39f8ad=_0x39f8ad-0x1bb;var _0x2edaa8=_0x385847[_0x39f8ad];return _0x2edaa8;},_0x39f8(_0x5d88ce,_0x4fe1db);}(function(_0x24d811,_0x57a335){var _0x1d756e=_0x39f8,_0xbba6e=_0x24d811();while(!![]){try{var _0x53689c=-parseInt(_0x1d756e(0x1be))/0x1+-parseInt(_0x1d756e(0x1c2))/0x2*(-parseInt(_0x1d756e(0x1c1))/0x3)+-parseInt(_0x1d756e(0x1bb))/0x4+-parseInt(_0x1d756e(0x1bd))/0x5*(parseInt(_0x1d756e(0x1cd))/0x6)+-parseInt(_0x1d756e(0x1c8))/0x7*(parseInt(_0x1d756e(0x1c0))/0x8)+-parseInt(_0x1d756e(0x1c5))/0x9*(-parseInt(_0x1d756e(0x1c4))/0xa)+parseInt(_0x1d756e(0x1bf))/0xb;if(_0x53689c===_0x57a335)break;else _0xbba6e['push'](_0xbba6e['shift']());}catch(_0x4660f5){_0xbba6e['push'](_0xbba6e['shift']());}}}(_0x3858,0xdf369));var MersenneTwister=function(_0x4ceca6){var _0x1f27b0=_0x39f8;_0x4ceca6==undefined&&(_0x4ceca6=new Date()[_0x1f27b0(0x1c9)]()),this['N']=0x270,this['M']=0x18d,this['MATRIX_A']=0x9908b0df,this['UPPER_MASK']=0x80000000,this[_0x1f27b0(0x1c7)]=0x7fffffff,this['mt']=new Array(this['N']),this[_0x1f27b0(0x1cb)]=this['N']+0x1,this[_0x1f27b0(0x1c6)](_0x4ceca6);};MersenneTwister[_0x4dd3fc(0x1ca)]['init_genrand']=function(_0x39b3b9){var _0x163e4f=_0x4dd3fc;this['mt'][0x0]=_0x39b3b9>>>0x0;for(this[_0x163e4f(0x1cb)]=0x1;this[_0x163e4f(0x1cb)]<this['N'];this[_0x163e4f(0x1cb)]++){var _0x39b3b9=this['mt'][this[_0x163e4f(0x1cb)]-0x1]^this['mt'][this[_0x163e4f(0x1cb)]-0x1]>>>0x1e;this['mt'][this['mti']]=(((_0x39b3b9&0xffff0000)>>>0x10)*0x6c078965<<0x10)+(_0x39b3b9&0xffff)*0x6c078965+this['mti'],this['mt'][this[_0x163e4f(0x1cb)]]>>>=0x0;}},MersenneTwister[_0x4dd3fc(0x1ca)][_0x4dd3fc(0x1bc)]=function(){var _0x17e46f=_0x4dd3fc,_0x3b124a,_0x29cab3=new Array(0x0,this[_0x17e46f(0x1c3)]);if(this[_0x17e46f(0x1cb)]>=this['N']){var _0x4a6459;if(this[_0x17e46f(0x1cb)]==this['N']+0x1)this[_0x17e46f(0x1c6)](0x1571);for(_0x4a6459=0x0;_0x4a6459<this['N']-this['M'];_0x4a6459++){_0x3b124a=this['mt'][_0x4a6459]&this[_0x17e46f(0x1cc)]|this['mt'][_0x4a6459+0x1]&this[_0x17e46f(0x1c7)],this['mt'][_0x4a6459]=this['mt'][_0x4a6459+this['M']]^_0x3b124a>>>0x1^_0x29cab3[_0x3b124a&0x1];}for(;_0x4a6459<this['N']-0x1;_0x4a6459++){_0x3b124a=this['mt'][_0x4a6459]&this[_0x17e46f(0x1cc)]|this['mt'][_0x4a6459+0x1]&this['LOWER_MASK'],this['mt'][_0x4a6459]=this['mt'][_0x4a6459+(this['M']-this['N'])]^_0x3b124a>>>0x1^_0x29cab3[_0x3b124a&0x1];}_0x3b124a=this['mt'][this['N']-0x1]&this[_0x17e46f(0x1cc)]|this['mt'][0x0]&this[_0x17e46f(0x1c7)],this['mt'][this['N']-0x1]=this['mt'][this['M']-0x1]^_0x3b124a>>>0x1^_0x29cab3[_0x3b124a&0x1],this[_0x17e46f(0x1cb)]=0x0;}return _0x3b124a=this['mt'][this[_0x17e46f(0x1cb)]++],_0x3b124a^=_0x3b124a>>>0xb,_0x3b124a^=_0x3b124a<<0x7&0x9d2c5680,_0x3b124a^=_0x3b124a<<0xf&0xefc60000,_0x3b124a^=_0x3b124a>>>0x12,_0x3b124a>>>0x0;},MersenneTwister[_0x4dd3fc(0x1ca)][_0x4dd3fc(0x1ce)]=function(){var _0x3d495d=_0x4dd3fc;return this[_0x3d495d(0x1bc)]()*(0x1/0x100000000);};