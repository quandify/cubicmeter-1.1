// Cubicmeter 1.1 uplink decoder

export default function decodeUplink(input) {
  var decoded = {};

  switch (input.fPort) {
    case 1: // Status report
      decoded = statusReportDecoder(input.bytes);
      break;
  }

  return {
    data: {
      fPort: input.fPort,
      length: input.bytes.length,
      hexBytes: decArrayToStr(input.bytes),
      type: getPacketType(input.fPort),
      decoded: decoded,
    },
  };
}
var LSB = true;

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
    errorCode: errorCode, // current error code
    isSensing: isSensing, // is the ultrasonic sensor sensing water
    totalVolume: data.readUInt32LE(6), // All-time aggregated water usage in litres
    leakState: data.readUInt8(22), // current water leakage state
    batteryActive: decodeBatteryLevel(data.readUInt8(23)), // battery mV active
    batteryRecovered: decodeBatteryLevel(data.readUInt8(24)), // battery mV recovered
    waterTemperatureMin: decodeTemperature(data.readUInt8(25)), // min water temperature since last statusReport
    waterTemperatureMax: decodeTemperature(data.readUInt8(26)), // max water temperature since last statusReport
    ambientTemperature: decodeTemperature(data.readUInt8(27)), // current ambient temperature
  };
};

function decodeBatteryLevel(input) {
  return 1800 + (input << 3); // convert to milliVolt
}

function parseBatteryStatus(input) {
  if (input <= 3100) {
    return "Low battery";
  }

  return "";
}

function decodeTemperature(input) {
  return parseFloat(input) * 0.5 - 20.0; // to °C
}

// More packet types only available when using Quandify platform API
var getPacketType = function (type) {
  switch (type) {
    case 0:
      return "ping"; // empty ping message
    case 1:
      return "statusReport"; // status message
  }

  return "Unknown";
};

/* Smaller water leakages only availble when using Quandify platform API
as it requires cloud analytics */
var parseLeakState = function (input) {
  switch (input) {
    case 3:
      return "Medium";
    case 4:
      return "Large";
    default:
      return "";
  }
};

function parseErrorCode(errorCode) {
  switch (errorCode) {
    case 0:
      return "";
    case 384:
      return "Reverse flow";
    default:
      return `Contact support, error ${errorCode}`;
  }
}

function normalizeUplink(input) {
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
        leak: parseLeakState(input.data.decoded.leak_state), // String
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
}

// Convert a hex string to decimal array
export function hexToDecArray(hexString) {
  const size = 2;
  const length = Math.ceil(hexString.length / size);
  const decimalList = new Array(length);

  for (let i = 0, o = 0; i < length; ++i, o += size) {
    decimalList[i] = parseInt(hexString.substr(o, size), 16);
  }

  return decimalList;
}

export function base64ToDecArray(base64String) {
  const buffer = Buffer.from(base64String, "base64");
  const bufString = buffer.toString("hex");

  return hexToDecArray(bufString);
}

export function decArrayToStr(byteArray) {
  return Array.from(byteArray, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2).toUpperCase();
  }).join("");
}
