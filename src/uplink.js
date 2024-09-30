// Cubicmeter 1.1 uplink decoder

var appStates = {
  3: "ready",
  4: "pipeSelection",
  5: "metering",
};

var uplinkTypes = {
  0: "ping",
  1: "statusReport",
  6: "response",
};

var responseStatuses = {
  0: "ok",
  1: "commandError",
  2: "payloadError",
  3: "valueError",
};

// More uplink types only available when using Quandify platform API
var responseTypes = {
  0: "none",
  1: "statusReport",
  2: "hardwareReport",
  4: "settingsReport",
};

/* Smaller water leakages only availble when using Quandify platform API
as it requires cloud analytics */
var leakStates = {
  2: "medium",
  3: "large",
};

var pipeTypes = {
  0: "custom",
  1: "copper15",
  2: "copper18",
  3: "copper22",
  4: "chrome15",
  5: "chrome18",
  6: "chrome22",
  7: "pal16",
  8: "pal20",
  9: "pal25",
  14: "pex16",
  15: "pex20",
  16: "pex25",
  17: "distpipe",
};

export default function decodeUplink(input) {
  var payload = {};

  switch (input.fPort) {
    case 1: // Status report
      payload = statusReportDecoder(input.bytes).data;
      break;
    case 6: // Response
      payload = responseDecoder(input.bytes);
      break;
  }

  return {
    fPort: input.fPort,
    length: input.bytes.length,
    hexBytes: decArrayToStr(input.bytes),
    type: uplinkTypes[input.fPort],
    payload: payload,
  };
}

var statusReportDecoder = function (bytes) {
  if (bytes.length != 28) {
    throw new Error(
      `Wrong payload length (${bytes.length}), should be 28 bytes`
    );
  }

  const data = Buffer.from(bytes);

  const error = data.readUInt16LE(4);

  // The is sensing value is a bit flag of the error field
  const isSensing = !(error & 0x8000);
  const errorCode = error & 0x7fff;

  return {
    type: "statusReport",
    data: {
      errorCode: errorCode, // current error code
      isSensing: isSensing, // is the ultrasonic sensor sensing water
      totalVolume: data.readUInt32LE(6), // All-time aggregated water usage in litres
      leakState: data.readUInt8(22), // current water leakage state
      batteryActive: decodeBatteryLevel(data.readUInt8(23)), // battery mV active
      batteryRecovered: decodeBatteryLevel(data.readUInt8(24)), // battery mV recovered
      waterTemperatureMin: decodeTemperature(data.readUInt8(25)), // min water temperature since last statusReport
      waterTemperatureMax: decodeTemperature(data.readUInt8(26)), // max water temperature since last statusReport
      ambientTemperature: decodeTemperature(data.readUInt8(27)), // current ambient temperature
    },
  };
};

var responseDecoder = function (bytes) {
  const data = Buffer.from(bytes);

  const responseStatus = responseStatuses[data.readUInt8(1)];
  if (responseStatus === undefined) {
    throw new Error(`Invalid response status: ${data.readUInt8(1)}`);
  }

  const responseType = responseTypes[data.readUInt8(2)];
  if (responseType === undefined) {
    throw new Error(`Invalid response type: ${data.readUInt8(2)}`);
  }

  const dataPayload = data.slice(3);

  var responseData = {
    type: undefined,
    data: {},
  };

  switch (responseType) {
    case "statusReport":
      responseData = statusReportDecoder(dataPayload);
      break;
    case "hardwareReport":
      responseData = hardwareReportDecoder(dataPayload);
      break;
    case "settingsReport":
      responseData = settingsReportDecoder(dataPayload);
      break;
  }

  return {
    fPort: data.readUInt8(0),
    status: responseStatus,
    type: responseData.type,
    data: responseData.data,
  };
};

var hardwareReportDecoder = function (data) {
  if (data.length != 35) {
    throw new Error(
      `Wrong payload length (${data.length}), should be 35 bytes`
    );
  }

  const appState = appStates[data.readUInt8(5)];
  if (appState === undefined) {
    throw new Error(`Invalid app state (${data.readUInt8(5)})`);
  }

  const pipeIndex = pipeTypes[data.readUInt8(28)];
  if (pipeIndex === undefined) {
    throw new Error(`Invalid pipe index (${data.readUInt8(28)})`);
  }

  const firmwareVersion = intToSemver(data.readUInt32LE(0));

  return {
    type: "hardwareReport",
    data: {
      firmwareVersion,
      hardwareVersion: data.readUInt8(4),
      appState: appState,
      ussGain: data.readUInt8(6),
      isUssSignal: !!data.readUInt8(7),
      currentError: data.readUInt16LE(8),
      eventCounter: data.readUInt16LE(10),
      crcFirmware: data.readUInt32LE(12),
      crcParameters: data.readUInt32LE(16),
      pipeId: pipeIndex,
    },
  };
};

var settingsReportDecoder = function (data) {
  if (data.length != 38) {
    throw new Error(
      `Wrong payload length (${data.length}), should be 38 bytes`
    );
  }

  return {
    type: "settingsReport",
    data: {
      wmBusEnabled: !!data.readUInt8(0),
      wmBusReportInterval: data.readUInt32LE(1),
      lorawanReportInterval: data.readUInt32LE(5),
      lorawanAcknowledgementEnabled: !!data.readUInt8(9),
    },
  };
};

var decodeBatteryLevel = function (input) {
  return 1800 + (input << 3); // convert to milliVolt
};

var decodeTemperature = function (input) {
  return parseFloat(input) * 0.5 - 20.0; // to °C
};

var parseBatteryStatus = function (input) {
  if (input <= 3100) {
    return "Low battery";
  }

  return undefined;
};

var parseErrorCode = function (errorCode) {
  switch (errorCode) {
    case 0:
      return undefined;
    case 384:
      return "Reverse flow";
    default:
      return `Contact support, error ${errorCode}`;
  }
};

export var normalizeUplink = function (input) {
  return {
    data: {
      air: {
        temperature: input.data.decoded.ambientTemperature, // °C
      },
      water: {
        temperature: {
          min: input.data.decoded.waterTemperatureMin, // °C
          max: input.data.decoded.waterTemperatureMax, // °C
        },
        leak: leakStates[input.data.decoded.leak_state], // String
      },
      metering: {
        water: {
          total: input.data.decoded.totalVolume, // L
        },
      },
      battery: input.data.decoded.batteryRecovered / 1000, // V
    },
    warnings: [
      parseErrorCode(input.data.decoded.errorCode),
      parseBatteryStatus(input.data.decoded.batteryRecovered),
    ].filter((item) => item),
  };
};

// Convert a hex string to decimal array
export var hexToDecArray = function (hexString) {
  const size = 2;
  const length = Math.ceil(hexString.length / size);
  const decimalList = new Array(length);

  for (let i = 0, o = 0; i < length; ++i, o += size) {
    decimalList[i] = parseInt(hexString.substr(o, size), 16);
  }

  return decimalList;
};

export var base64ToDecArray = function (base64String) {
  const buffer = Buffer.from(base64String, "base64");
  const bufString = buffer.toString("hex");

  return hexToDecArray(bufString);
};

export var decArrayToStr = function (byteArray) {
  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2).toUpperCase();
  }).join("");
};

export var intToSemver = function (version) {
  const major = (version >> 24) & 0xff;
  const minor = (version >> 16) & 0xff;
  const patch = version & 0xffff;
  return `${major}.${minor}.${patch}`;
};
