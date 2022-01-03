(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.WaveformData = factory());
})(this, (function () { 'use strict';

  /**
   * Provides access to the waveform data for a single audio channel.
   */
  function WaveformDataChannel(waveformData, channelIndex) {
    this._waveformData = waveformData;
    this._channelIndex = channelIndex;
  }
  /**
   * Returns the waveform minimum at the given index position.
   */


  WaveformDataChannel.prototype.min_sample = function (index) {
    var offset = (index * this._waveformData.channels + this._channelIndex) * 2;
    return this._waveformData._at(offset);
  };
  /**
   * Returns the waveform maximum at the given index position.
   */


  WaveformDataChannel.prototype.max_sample = function (index) {
    var offset = (index * this._waveformData.channels + this._channelIndex) * 2 + 1;
    return this._waveformData._at(offset);
  };
  /**
   * Sets the waveform minimum at the given index position.
   */


  WaveformDataChannel.prototype.set_min_sample = function (index, sample) {
    var offset = (index * this._waveformData.channels + this._channelIndex) * 2;
    return this._waveformData._set_at(offset, sample);
  };
  /**
   * Sets the waveform maximum at the given index position.
   */


  WaveformDataChannel.prototype.set_max_sample = function (index, sample) {
    var offset = (index * this._waveformData.channels + this._channelIndex) * 2 + 1;
    return this._waveformData._set_at(offset, sample);
  };
  /**
   * Returns all the waveform minimum values as an array.
   */


  WaveformDataChannel.prototype.min_array = function () {
    return this._waveformData._offsetValues(0, this._waveformData.length, this._channelIndex * 2);
  };
  /**
   * Returns all the waveform maximum values as an array.
   */


  WaveformDataChannel.prototype.max_array = function () {
    return this._waveformData._offsetValues(0, this._waveformData.length, this._channelIndex * 2 + 1);
  };

  /**
   * AudioBuffer-based WaveformData generator
   *
   * Adapted from BlockFile::CalcSummary in Audacity, with permission.
   * See https://code.google.com/p/audacity/source/browse/audacity-src/trunk/src/BlockFile.cpp
   */
  var INT8_MAX = 127;
  var INT8_MIN = -128;

  function calculateWaveformDataLength(audio_sample_count, scale) {
    var data_length = Math.floor(audio_sample_count / scale);
    var samples_remaining = audio_sample_count - data_length * scale;

    if (samples_remaining > 0) {
      data_length++;
    }

    return data_length;
  }

  function generateWaveformData(options) {
    var scale = options.scale;
    var amplitude_scale = options.amplitude_scale;
    var split_channels = options.split_channels;
    var length = options.length;
    var sample_rate = options.sample_rate;
    var channels = options.channels.map(function (channel) {
      return new Float32Array(channel);
    });
    var output_channels = split_channels ? channels.length : 1;
    var version = output_channels === 1 ? 1 : 2;
    var header_size = version === 1 ? 20 : 24;
    var data_length = calculateWaveformDataLength(length, scale);
    var total_size = header_size + data_length * 2 * output_channels;
    var buffer = new ArrayBuffer(total_size);
    var data_view = new DataView(buffer);
    var scale_counter = 0;
    var offset = header_size;
    var channel, i;
    var min_value = new Array(output_channels);
    var max_value = new Array(output_channels);

    for (channel = 0; channel < output_channels; channel++) {
      min_value[channel] = Infinity;
      max_value[channel] = -Infinity;
    }

    data_view.setInt32(0, version, true); // Version

    data_view.setUint32(4, 1, true); // Is 8 bit?

    data_view.setInt32(8, sample_rate, true); // Sample rate

    data_view.setInt32(12, scale, true); // Scale

    data_view.setInt32(16, data_length, true); // Length

    if (version === 2) {
      data_view.setInt32(20, output_channels, true);
    }

    for (i = 0; i < length; i++) {
      var sample = 0;

      if (output_channels === 1) {
        for (channel = 0; channel < channels.length; ++channel) {
          sample += channels[channel][i];
        }

        sample = Math.floor(INT8_MAX * sample * amplitude_scale / channels.length);

        if (sample < min_value[0]) {
          min_value[0] = sample;

          if (min_value[0] < INT8_MIN) {
            min_value[0] = INT8_MIN;
          }
        }

        if (sample > max_value[0]) {
          max_value[0] = sample;

          if (max_value[0] > INT8_MAX) {
            max_value[0] = INT8_MAX;
          }
        }
      } else {
        for (channel = 0; channel < output_channels; ++channel) {
          sample = Math.floor(INT8_MAX * channels[channel][i] * amplitude_scale);

          if (sample < min_value[channel]) {
            min_value[channel] = sample;

            if (min_value[channel] < INT8_MIN) {
              min_value[channel] = INT8_MIN;
            }
          }

          if (sample > max_value[channel]) {
            max_value[channel] = sample;

            if (max_value[channel] > INT8_MAX) {
              max_value[channel] = INT8_MAX;
            }
          }
        }
      }

      if (++scale_counter === scale) {
        for (channel = 0; channel < output_channels; channel++) {
          data_view.setInt8(offset++, min_value[channel]);
          data_view.setInt8(offset++, max_value[channel]);
          min_value[channel] = Infinity;
          max_value[channel] = -Infinity;
        }

        scale_counter = 0;
      }
    }

    if (scale_counter > 0) {
      for (channel = 0; channel < output_channels; channel++) {
        data_view.setInt8(offset++, min_value[channel]);
        data_view.setInt8(offset++, max_value[channel]);
      }
    }

    return buffer;
  }

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function isJsonWaveformData(data) {
    return data && _typeof(data) === "object" && "sample_rate" in data && "samples_per_pixel" in data && "bits" in data && "length" in data && "data" in data;
  }
  function isBinaryWaveformData(data) {
    var isCompatible = data && _typeof(data) === "object" && "byteLength" in data;

    if (isCompatible) {
      var view = new DataView(data);
      var version = view.getInt32(0, true);

      if (version !== 1 && version !== 2) {
        throw new TypeError("WaveformData.create(): This waveform data version not supported");
      }
    }

    return isCompatible;
  }
  function convertJsonToBinary(data) {
    var waveformData = data.data;
    var channels = data.channels || 1;
    var header_size = 24; // version 2

    var bytes_per_sample = data.bits === 8 ? 1 : 2;
    var expected_length = data.length * 2 * channels;

    if (waveformData.length !== expected_length) {
      throw new Error("WaveformData.create(): Length mismatch in JSON waveform data");
    }

    var total_size = header_size + waveformData.length * bytes_per_sample;
    var array_buffer = new ArrayBuffer(total_size);
    var data_object = new DataView(array_buffer);
    data_object.setInt32(0, 2, true); // Version

    data_object.setUint32(4, data.bits === 8, true);
    data_object.setInt32(8, data.sample_rate, true);
    data_object.setInt32(12, data.samples_per_pixel, true);
    data_object.setInt32(16, data.length, true);
    data_object.setInt32(20, channels, true);
    var index = header_size;
    var i;

    if (data.bits === 8) {
      for (i = 0; i < waveformData.length; i++) {
        data_object.setInt8(index++, waveformData[i], true);
      }
    } else {
      for (i = 0; i < waveformData.length; i++) {
        data_object.setInt16(index, waveformData[i], true);
        index += 2;
      }
    }

    return array_buffer;
  }

  var WorkerClass = null;

  try {
      var WorkerThreads =
          typeof module !== 'undefined' && typeof module.require === 'function' && module.require('worker_threads') ||
          typeof __non_webpack_require__ === 'function' && __non_webpack_require__('worker_threads') ||
          typeof require === 'function' && require('worker_threads');
      WorkerClass = WorkerThreads.Worker;
  } catch(e) {} // eslint-disable-line

  function decodeBase64$1(base64, enableUnicode) {
      return Buffer.from(base64, 'base64').toString(enableUnicode ? 'utf16' : 'utf8');
  }

  function createBase64WorkerFactory$2(base64, sourcemapArg, enableUnicodeArg) {
      var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
      var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
      var source = decodeBase64$1(base64, enableUnicode);
      var start = source.indexOf('\n', 10) + 1;
      var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
      return function WorkerFactory(options) {
          return new WorkerClass(body, Object.assign({}, options, { eval: true }));
      };
  }

  function decodeBase64(base64, enableUnicode) {
      var binaryString = atob(base64);
      if (enableUnicode) {
          var binaryView = new Uint8Array(binaryString.length);
          for (var i = 0, n = binaryString.length; i < n; ++i) {
              binaryView[i] = binaryString.charCodeAt(i);
          }
          return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
      }
      return binaryString;
  }

  function createURL(base64, sourcemapArg, enableUnicodeArg) {
      var sourcemap = sourcemapArg === undefined ? null : sourcemapArg;
      var enableUnicode = enableUnicodeArg === undefined ? false : enableUnicodeArg;
      var source = decodeBase64(base64, enableUnicode);
      var start = source.indexOf('\n', 10) + 1;
      var body = source.substring(start) + (sourcemap ? '\/\/# sourceMappingURL=' + sourcemap : '');
      var blob = new Blob([body], { type: 'application/javascript' });
      return URL.createObjectURL(blob);
  }

  function createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg) {
      var url;
      return function WorkerFactory(options) {
          url = url || createURL(base64, sourcemapArg, enableUnicodeArg);
          return new Worker(url, options);
      };
  }

  var kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';

  function isNodeJS() {
      return kIsNodeJS;
  }

  function createBase64WorkerFactory(base64, sourcemapArg, enableUnicodeArg) {
      if (isNodeJS()) {
          return createBase64WorkerFactory$2(base64, sourcemapArg, enableUnicodeArg);
      }
      return createBase64WorkerFactory$1(base64, sourcemapArg, enableUnicodeArg);
  }

  var WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwooZnVuY3Rpb24gKCkgewogICd1c2Ugc3RyaWN0JzsKCiAgLyoqCiAgICogQXVkaW9CdWZmZXItYmFzZWQgV2F2ZWZvcm1EYXRhIGdlbmVyYXRvcgogICAqCiAgICogQWRhcHRlZCBmcm9tIEJsb2NrRmlsZTo6Q2FsY1N1bW1hcnkgaW4gQXVkYWNpdHksIHdpdGggcGVybWlzc2lvbi4KICAgKiBTZWUgaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9hdWRhY2l0eS9zb3VyY2UvYnJvd3NlL2F1ZGFjaXR5LXNyYy90cnVuay9zcmMvQmxvY2tGaWxlLmNwcAogICAqLwogIHZhciBJTlQ4X01BWCA9IDEyNzsKICB2YXIgSU5UOF9NSU4gPSAtMTI4OwoKICBmdW5jdGlvbiBjYWxjdWxhdGVXYXZlZm9ybURhdGFMZW5ndGgoYXVkaW9fc2FtcGxlX2NvdW50LCBzY2FsZSkgewogICAgdmFyIGRhdGFfbGVuZ3RoID0gTWF0aC5mbG9vcihhdWRpb19zYW1wbGVfY291bnQgLyBzY2FsZSk7CiAgICB2YXIgc2FtcGxlc19yZW1haW5pbmcgPSBhdWRpb19zYW1wbGVfY291bnQgLSBkYXRhX2xlbmd0aCAqIHNjYWxlOwoKICAgIGlmIChzYW1wbGVzX3JlbWFpbmluZyA+IDApIHsKICAgICAgZGF0YV9sZW5ndGgrKzsKICAgIH0KCiAgICByZXR1cm4gZGF0YV9sZW5ndGg7CiAgfQoKICBmdW5jdGlvbiBnZW5lcmF0ZVdhdmVmb3JtRGF0YShvcHRpb25zKSB7CiAgICB2YXIgc2NhbGUgPSBvcHRpb25zLnNjYWxlOwogICAgdmFyIGFtcGxpdHVkZV9zY2FsZSA9IG9wdGlvbnMuYW1wbGl0dWRlX3NjYWxlOwogICAgdmFyIHNwbGl0X2NoYW5uZWxzID0gb3B0aW9ucy5zcGxpdF9jaGFubmVsczsKICAgIHZhciBsZW5ndGggPSBvcHRpb25zLmxlbmd0aDsKICAgIHZhciBzYW1wbGVfcmF0ZSA9IG9wdGlvbnMuc2FtcGxlX3JhdGU7CiAgICB2YXIgY2hhbm5lbHMgPSBvcHRpb25zLmNoYW5uZWxzLm1hcChmdW5jdGlvbiAoY2hhbm5lbCkgewogICAgICByZXR1cm4gbmV3IEZsb2F0MzJBcnJheShjaGFubmVsKTsKICAgIH0pOwogICAgdmFyIG91dHB1dF9jaGFubmVscyA9IHNwbGl0X2NoYW5uZWxzID8gY2hhbm5lbHMubGVuZ3RoIDogMTsKICAgIHZhciB2ZXJzaW9uID0gb3V0cHV0X2NoYW5uZWxzID09PSAxID8gMSA6IDI7CiAgICB2YXIgaGVhZGVyX3NpemUgPSB2ZXJzaW9uID09PSAxID8gMjAgOiAyNDsKICAgIHZhciBkYXRhX2xlbmd0aCA9IGNhbGN1bGF0ZVdhdmVmb3JtRGF0YUxlbmd0aChsZW5ndGgsIHNjYWxlKTsKICAgIHZhciB0b3RhbF9zaXplID0gaGVhZGVyX3NpemUgKyBkYXRhX2xlbmd0aCAqIDIgKiBvdXRwdXRfY2hhbm5lbHM7CiAgICB2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKHRvdGFsX3NpemUpOwogICAgdmFyIGRhdGFfdmlldyA9IG5ldyBEYXRhVmlldyhidWZmZXIpOwogICAgdmFyIHNjYWxlX2NvdW50ZXIgPSAwOwogICAgdmFyIG9mZnNldCA9IGhlYWRlcl9zaXplOwogICAgdmFyIGNoYW5uZWwsIGk7CiAgICB2YXIgbWluX3ZhbHVlID0gbmV3IEFycmF5KG91dHB1dF9jaGFubmVscyk7CiAgICB2YXIgbWF4X3ZhbHVlID0gbmV3IEFycmF5KG91dHB1dF9jaGFubmVscyk7CgogICAgZm9yIChjaGFubmVsID0gMDsgY2hhbm5lbCA8IG91dHB1dF9jaGFubmVsczsgY2hhbm5lbCsrKSB7CiAgICAgIG1pbl92YWx1ZVtjaGFubmVsXSA9IEluZmluaXR5OwogICAgICBtYXhfdmFsdWVbY2hhbm5lbF0gPSAtSW5maW5pdHk7CiAgICB9CgogICAgZGF0YV92aWV3LnNldEludDMyKDAsIHZlcnNpb24sIHRydWUpOyAvLyBWZXJzaW9uCgogICAgZGF0YV92aWV3LnNldFVpbnQzMig0LCAxLCB0cnVlKTsgLy8gSXMgOCBiaXQ/CgogICAgZGF0YV92aWV3LnNldEludDMyKDgsIHNhbXBsZV9yYXRlLCB0cnVlKTsgLy8gU2FtcGxlIHJhdGUKCiAgICBkYXRhX3ZpZXcuc2V0SW50MzIoMTIsIHNjYWxlLCB0cnVlKTsgLy8gU2NhbGUKCiAgICBkYXRhX3ZpZXcuc2V0SW50MzIoMTYsIGRhdGFfbGVuZ3RoLCB0cnVlKTsgLy8gTGVuZ3RoCgogICAgaWYgKHZlcnNpb24gPT09IDIpIHsKICAgICAgZGF0YV92aWV3LnNldEludDMyKDIwLCBvdXRwdXRfY2hhbm5lbHMsIHRydWUpOwogICAgfQoKICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykgewogICAgICB2YXIgc2FtcGxlID0gMDsKCiAgICAgIGlmIChvdXRwdXRfY2hhbm5lbHMgPT09IDEpIHsKICAgICAgICBmb3IgKGNoYW5uZWwgPSAwOyBjaGFubmVsIDwgY2hhbm5lbHMubGVuZ3RoOyArK2NoYW5uZWwpIHsKICAgICAgICAgIHNhbXBsZSArPSBjaGFubmVsc1tjaGFubmVsXVtpXTsKICAgICAgICB9CgogICAgICAgIHNhbXBsZSA9IE1hdGguZmxvb3IoSU5UOF9NQVggKiBzYW1wbGUgKiBhbXBsaXR1ZGVfc2NhbGUgLyBjaGFubmVscy5sZW5ndGgpOwoKICAgICAgICBpZiAoc2FtcGxlIDwgbWluX3ZhbHVlWzBdKSB7CiAgICAgICAgICBtaW5fdmFsdWVbMF0gPSBzYW1wbGU7CgogICAgICAgICAgaWYgKG1pbl92YWx1ZVswXSA8IElOVDhfTUlOKSB7CiAgICAgICAgICAgIG1pbl92YWx1ZVswXSA9IElOVDhfTUlOOwogICAgICAgICAgfQogICAgICAgIH0KCiAgICAgICAgaWYgKHNhbXBsZSA+IG1heF92YWx1ZVswXSkgewogICAgICAgICAgbWF4X3ZhbHVlWzBdID0gc2FtcGxlOwoKICAgICAgICAgIGlmIChtYXhfdmFsdWVbMF0gPiBJTlQ4X01BWCkgewogICAgICAgICAgICBtYXhfdmFsdWVbMF0gPSBJTlQ4X01BWDsKICAgICAgICAgIH0KICAgICAgICB9CiAgICAgIH0gZWxzZSB7CiAgICAgICAgZm9yIChjaGFubmVsID0gMDsgY2hhbm5lbCA8IG91dHB1dF9jaGFubmVsczsgKytjaGFubmVsKSB7CiAgICAgICAgICBzYW1wbGUgPSBNYXRoLmZsb29yKElOVDhfTUFYICogY2hhbm5lbHNbY2hhbm5lbF1baV0gKiBhbXBsaXR1ZGVfc2NhbGUpOwoKICAgICAgICAgIGlmIChzYW1wbGUgPCBtaW5fdmFsdWVbY2hhbm5lbF0pIHsKICAgICAgICAgICAgbWluX3ZhbHVlW2NoYW5uZWxdID0gc2FtcGxlOwoKICAgICAgICAgICAgaWYgKG1pbl92YWx1ZVtjaGFubmVsXSA8IElOVDhfTUlOKSB7CiAgICAgICAgICAgICAgbWluX3ZhbHVlW2NoYW5uZWxdID0gSU5UOF9NSU47CiAgICAgICAgICAgIH0KICAgICAgICAgIH0KCiAgICAgICAgICBpZiAoc2FtcGxlID4gbWF4X3ZhbHVlW2NoYW5uZWxdKSB7CiAgICAgICAgICAgIG1heF92YWx1ZVtjaGFubmVsXSA9IHNhbXBsZTsKCiAgICAgICAgICAgIGlmIChtYXhfdmFsdWVbY2hhbm5lbF0gPiBJTlQ4X01BWCkgewogICAgICAgICAgICAgIG1heF92YWx1ZVtjaGFubmVsXSA9IElOVDhfTUFYOwogICAgICAgICAgICB9CiAgICAgICAgICB9CiAgICAgICAgfQogICAgICB9CgogICAgICBpZiAoKytzY2FsZV9jb3VudGVyID09PSBzY2FsZSkgewogICAgICAgIGZvciAoY2hhbm5lbCA9IDA7IGNoYW5uZWwgPCBvdXRwdXRfY2hhbm5lbHM7IGNoYW5uZWwrKykgewogICAgICAgICAgZGF0YV92aWV3LnNldEludDgob2Zmc2V0KyssIG1pbl92YWx1ZVtjaGFubmVsXSk7CiAgICAgICAgICBkYXRhX3ZpZXcuc2V0SW50OChvZmZzZXQrKywgbWF4X3ZhbHVlW2NoYW5uZWxdKTsKICAgICAgICAgIG1pbl92YWx1ZVtjaGFubmVsXSA9IEluZmluaXR5OwogICAgICAgICAgbWF4X3ZhbHVlW2NoYW5uZWxdID0gLUluZmluaXR5OwogICAgICAgIH0KCiAgICAgICAgc2NhbGVfY291bnRlciA9IDA7CiAgICAgIH0KICAgIH0KCiAgICBpZiAoc2NhbGVfY291bnRlciA+IDApIHsKICAgICAgZm9yIChjaGFubmVsID0gMDsgY2hhbm5lbCA8IG91dHB1dF9jaGFubmVsczsgY2hhbm5lbCsrKSB7CiAgICAgICAgZGF0YV92aWV3LnNldEludDgob2Zmc2V0KyssIG1pbl92YWx1ZVtjaGFubmVsXSk7CiAgICAgICAgZGF0YV92aWV3LnNldEludDgob2Zmc2V0KyssIG1heF92YWx1ZVtjaGFubmVsXSk7CiAgICAgIH0KICAgIH0KCiAgICByZXR1cm4gYnVmZmVyOwogIH0KCiAgb25tZXNzYWdlID0gZnVuY3Rpb24gb25tZXNzYWdlKGV2dCkgewogICAgdmFyIGJ1ZmZlciA9IGdlbmVyYXRlV2F2ZWZvcm1EYXRhKGV2dC5kYXRhKTsgLy8gVHJhbnNmZXIgYnVmZmVyIHRvIHRoZSBjYWxsaW5nIHRocmVhZAoKICAgIHRoaXMucG9zdE1lc3NhZ2UoYnVmZmVyLCBbYnVmZmVyXSk7CiAgICB0aGlzLmNsb3NlKCk7CiAgfTsKCn0pKCk7Cgo=', null, false);
  /* eslint-enable */

  /**
   * Provides access to waveform data.
   */

  function WaveformData(data) {
    if (isJsonWaveformData(data)) {
      data = convertJsonToBinary(data);
    }

    if (isBinaryWaveformData(data)) {
      this._data = new DataView(data);
      this._offset = this._version() === 2 ? 24 : 20;
      this._channels = [];

      for (var channel = 0; channel < this.channels; channel++) {
        this._channels[channel] = new WaveformDataChannel(this, channel);
      }
    } else {
      throw new TypeError("WaveformData.create(): Unknown data format");
    }
  }

  var defaultOptions = {
    scale: 512,
    amplitude_scale: 1.0,
    split_channels: false,
    disable_worker: false
  };

  function getOptions(options) {
    var opts = {
      scale: options.scale || defaultOptions.scale,
      amplitude_scale: options.amplitude_scale || defaultOptions.amplitude_scale,
      split_channels: options.split_channels || defaultOptions.split_channels,
      disable_worker: options.disable_worker || defaultOptions.disable_worker
    };
    return opts;
  }

  function getChannelData(audio_buffer) {
    var channels = [];

    for (var i = 0; i < audio_buffer.numberOfChannels; ++i) {
      channels.push(audio_buffer.getChannelData(i).buffer);
    }

    return channels;
  }

  function createFromAudioBuffer(audio_buffer, options, callback) {
    var channels = getChannelData(audio_buffer);

    if (options.disable_worker) {
      var buffer = generateWaveformData({
        scale: options.scale,
        amplitude_scale: options.amplitude_scale,
        split_channels: options.split_channels,
        length: audio_buffer.length,
        sample_rate: audio_buffer.sampleRate,
        channels: channels
      });
      callback(null, new WaveformData(buffer), audio_buffer);
    } else {
      var worker = new WorkerFactory();

      worker.onmessage = function (evt) {
        callback(null, new WaveformData(evt.data), audio_buffer);
      };

      worker.postMessage({
        scale: options.scale,
        amplitude_scale: options.amplitude_scale,
        split_channels: options.split_channels,
        length: audio_buffer.length,
        sample_rate: audio_buffer.sampleRate,
        channels: channels
      }, channels);
    }
  }

  function createFromArrayBuffer(audioContext, audioData, options, callback) {
    // The following function is a workaround for a Webkit bug where decodeAudioData
    // invokes the errorCallback with null instead of a DOMException.
    // See https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata
    // and http://stackoverflow.com/q/10365335/103396
    function errorCallback(error) {
      if (!error) {
        error = new DOMException("EncodingError");
      }

      callback(error);
    }

    audioContext.decodeAudioData(audioData, function (audio_buffer) {
      createFromAudioBuffer(audio_buffer, options, callback);
    }, errorCallback);
  }
  /**
   * Creates and returns a WaveformData instance from the given waveform data.
   */


  WaveformData.create = function create(data) {
    return new WaveformData(data);
  };
  /**
   * Creates a WaveformData instance from audio.
   */


  WaveformData.createFromAudio = function (options, callback) {
    var opts = getOptions(options);

    if (options.audio_context && options.array_buffer) {
      return createFromArrayBuffer(options.audio_context, options.array_buffer, opts, callback);
    } else if (options.audio_buffer) {
      return createFromAudioBuffer(options.audio_buffer, opts, callback);
    } else {
      throw new TypeError( // eslint-disable-next-line
      "WaveformData.createFromAudio(): Pass either an AudioContext and ArrayBuffer, or an AudioBuffer object");
    }
  };

  WaveformData.prototype = {
    /**
     * Creates and returns a new WaveformData object with resampled data.
     * Use this method to create waveform data at different zoom levels.
     *
     * Adapted from Sequence::GetWaveDisplay in Audacity, with permission.
     * https://code.google.com/p/audacity/source/browse/audacity-src/trunk/src/Sequence.cpp
     */
    resample: function resample(options) {
      options.scale = typeof options.scale === "number" ? options.scale : null;
      options.width = typeof options.width === "number" ? options.width : null;

      if (options.width != null && options.width <= 0) {
        throw new RangeError("WaveformData.resample(): width should be a positive integer value");
      }

      if (options.scale != null && options.scale <= 0) {
        throw new RangeError("WaveformData.resample(): scale should be a positive integer value");
      }

      if (!options.scale && !options.width) {
        throw new Error("WaveformData.resample(): Missing scale or width option");
      } // Scale we want to reach


      var output_samples_per_pixel = options.scale || Math.floor(this.duration * this.sample_rate / options.width);
      var scale = this.scale; // scale we are coming from
      // The amount of data we want to resample i.e. final zoom want to resample
      // all data but for intermediate zoom we want to resample subset

      var input_buffer_size = this.length;
      var input_buffer_length_samples = input_buffer_size * this.scale;
      var output_buffer_length_samples = Math.ceil(input_buffer_length_samples / output_samples_per_pixel);
      var output_header_size = 24; // version 2

      var bytes_per_sample = this.bits === 8 ? 1 : 2;
      var total_size = output_header_size + output_buffer_length_samples * 2 * this.channels * bytes_per_sample;
      var output_data = new ArrayBuffer(total_size);
      var output_dataview = new DataView(output_data);
      output_dataview.setInt32(0, 2, true); // Version

      output_dataview.setUint32(4, this.bits === 8, true); // Is 8 bit?

      output_dataview.setInt32(8, this.sample_rate, true);
      output_dataview.setInt32(12, output_samples_per_pixel, true);
      output_dataview.setInt32(16, output_buffer_length_samples, true);
      output_dataview.setInt32(20, this.channels, true);
      var waveform_data = new WaveformData(output_data);
      var input_index = 0;
      var output_index = 0;
      var channels = this.channels;
      var min = new Array(channels);
      var max = new Array(channels);
      var channel;

      for (channel = 0; channel < channels; ++channel) {
        if (input_buffer_size > 0) {
          min[channel] = this.channel(channel).min_sample(input_index);
          max[channel] = this.channel(channel).max_sample(input_index);
        } else {
          min[channel] = 0;
          max[channel] = 0;
        }
      }

      var min_value = this.bits === 8 ? -128 : -32768;
      var max_value = this.bits === 8 ? 127 : 32767;

      if (output_samples_per_pixel < scale) {
        throw new Error("WaveformData.resample(): Zoom level " + output_samples_per_pixel + " too low, minimum: " + scale);
      }

      var where, prev_where, stop, value, last_input_index;

      function sample_at_pixel(x) {
        return Math.floor(x * output_samples_per_pixel);
      }

      while (input_index < input_buffer_size) {
        while (Math.floor(sample_at_pixel(output_index) / scale) === input_index) {
          if (output_index > 0) {
            for (channel = 0; channel < channels; ++channel) {
              waveform_data.channel(channel).set_min_sample(output_index - 1, min[channel]);
              waveform_data.channel(channel).set_max_sample(output_index - 1, max[channel]);
            }
          }

          last_input_index = input_index;
          output_index++;
          where = sample_at_pixel(output_index);
          prev_where = sample_at_pixel(output_index - 1);

          if (where !== prev_where) {
            for (channel = 0; channel < channels; ++channel) {
              min[channel] = max_value;
              max[channel] = min_value;
            }
          }
        }

        where = sample_at_pixel(output_index);
        stop = Math.floor(where / scale);

        if (stop > input_buffer_size) {
          stop = input_buffer_size;
        }

        while (input_index < stop) {
          for (channel = 0; channel < channels; ++channel) {
            value = this.channel(channel).min_sample(input_index);

            if (value < min[channel]) {
              min[channel] = value;
            }

            value = this.channel(channel).max_sample(input_index);

            if (value > max[channel]) {
              max[channel] = value;
            }
          }

          input_index++;
        }
      }

      if (input_index !== last_input_index) {
        for (channel = 0; channel < channels; ++channel) {
          waveform_data.channel(channel).set_min_sample(output_index - 1, min[channel]);
          waveform_data.channel(channel).set_max_sample(output_index - 1, max[channel]);
        }
      }

      return waveform_data;
    },

    /**
     * Concatenates with one or more other waveforms, returning a new WaveformData object.
     */
    concat: function concat() {
      var self = this;
      var otherWaveforms = Array.prototype.slice.call(arguments); // Check that all the supplied waveforms are compatible

      otherWaveforms.forEach(function (otherWaveform) {
        if (self.channels !== otherWaveform.channels || self.sample_rate !== otherWaveform.sample_rate || self.bits !== otherWaveform.bits || self.scale !== otherWaveform.scale) {
          throw new Error("WaveformData.concat(): Waveforms are incompatible");
        }
      });

      var combinedBuffer = this._concatBuffers.apply(this, otherWaveforms);

      return WaveformData.create(combinedBuffer);
    },

    /**
     * Returns a new ArrayBuffer with the concatenated waveform.
     * All waveforms must have identical metadata (version, channels, etc)
     */
    _concatBuffers: function _concatBuffers() {
      var otherWaveforms = Array.prototype.slice.call(arguments);
      var headerSize = this._offset;
      var totalSize = headerSize;
      var totalDataLength = 0;
      var bufferCollection = [this].concat(otherWaveforms).map(function (w) {
        return w._data.buffer;
      });
      var i, buffer;

      for (i = 0; i < bufferCollection.length; i++) {
        buffer = bufferCollection[i];
        var dataSize = new DataView(buffer).getInt32(16, true);
        totalSize += buffer.byteLength - headerSize;
        totalDataLength += dataSize;
      }

      var totalBuffer = new ArrayBuffer(totalSize);
      var sourceHeader = new DataView(bufferCollection[0]);
      var totalBufferView = new DataView(totalBuffer); // Copy the header from the first chunk

      for (i = 0; i < headerSize; i++) {
        totalBufferView.setUint8(i, sourceHeader.getUint8(i));
      } // Rewrite the data-length header item to reflect all of the samples concatenated together


      totalBufferView.setInt32(16, totalDataLength, true);
      var offset = 0;
      var dataOfTotalBuffer = new Uint8Array(totalBuffer, headerSize);

      for (i = 0; i < bufferCollection.length; i++) {
        buffer = bufferCollection[i];
        dataOfTotalBuffer.set(new Uint8Array(buffer, headerSize), offset);
        offset += buffer.byteLength - headerSize;
      }

      return totalBuffer;
    },

    /**
     * Return the unpacked values for a particular offset.
     */
    _offsetValues: function getOffsetValues(start, length, correction) {
      var values = [];
      var channels = this.channels;
      correction += start * channels * 2; // offset the positioning query

      for (var i = 0; i < length; i++) {
        values.push(this._at(i * channels * 2 + correction));
      }

      return values;
    },

    /**
     * Returns the data format version number.
     */
    _version: function _version() {
      return this._data.getInt32(0, true);
    },

    /**
     * Returns the length of the waveform, in pixels.
     */
    get length() {
      return this._data.getUint32(16, true);
    },

    /**
     * Returns the number of bits per sample, either 8 or 16.
     */
    get bits() {
      var bits = Boolean(this._data.getUint32(4, true));
      return bits ? 8 : 16;
    },

    /**
     * Returns the (approximate) duration of the audio file, in seconds.
     */
    get duration() {
      return this.length * this.scale / this.sample_rate;
    },

    /**
     * Returns the number of pixels per second.
     */
    get pixels_per_second() {
      return this.sample_rate / this.scale;
    },

    /**
     * Returns the amount of time represented by a single pixel, in seconds.
     */
    get seconds_per_pixel() {
      return this.scale / this.sample_rate;
    },

    /**
     * Returns the number of waveform channels.
     */
    get channels() {
      if (this._version() === 2) {
        return this._data.getInt32(20, true);
      } else {
        return 1;
      }
    },

    /**
     * Returns a waveform channel.
     */
    channel: function channel(index) {
      if (index >= 0 && index < this._channels.length) {
        return this._channels[index];
      } else {
        throw new RangeError("Invalid channel: " + index);
      }
    },

    /**
     * Returns the number of audio samples per second.
     */
    get sample_rate() {
      return this._data.getInt32(8, true);
    },

    /**
     * Returns the number of audio samples per pixel.
     */
    get scale() {
      return this._data.getInt32(12, true);
    },

    /**
     * Returns a waveform data value at a specific offset.
     */
    _at: function at_sample(index) {
      if (this.bits === 8) {
        return this._data.getInt8(this._offset + index);
      } else {
        return this._data.getInt16(this._offset + index * 2, true);
      }
    },

    /**
     * Sets a waveform data value at a specific offset.
     */
    _set_at: function set_at(index, sample) {
      if (this.bits === 8) {
        return this._data.setInt8(this._offset + index, sample);
      } else {
        return this._data.setInt16(this._offset + index * 2, sample, true);
      }
    },

    /**
     * Returns the waveform data index position for a given time.
     */
    at_time: function at_time(time) {
      return Math.floor(time * this.sample_rate / this.scale);
    },

    /**
     * Returns the time in seconds for a given index.
     */
    time: function time(index) {
      return index * this.scale / this.sample_rate;
    },

    /**
     * Returns an object containing the waveform data.
     */
    toJSON: function toJSON() {
      var waveform = {
        version: 2,
        channels: this.channels,
        sample_rate: this.sample_rate,
        samples_per_pixel: this.scale,
        bits: this.bits,
        length: this.length,
        data: []
      };

      for (var i = 0; i < this.length; i++) {
        for (var channel = 0; channel < this.channels; channel++) {
          waveform.data.push(this.channel(channel).min_sample(i));
          waveform.data.push(this.channel(channel).max_sample(i));
        }
      }

      return waveform;
    },

    /**
     * Returns the waveform data in binary format as an ArrayBuffer.
     */
    toArrayBuffer: function toArrayBuffer() {
      return this._data.buffer;
    }
  };

  return WaveformData;

}));
//# sourceMappingURL=waveform-data.js.map
