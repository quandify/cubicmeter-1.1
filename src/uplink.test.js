const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert");

const rewire = require("rewire");

const uplink = rewire("./uplink");
const decodeUplink = uplink.__get__("decodeUplink");
const normalizeUplink = uplink.__get__("normalizeUplink");

var base64ToDecArray = function (base64String) {
  const buffer = Buffer.from(base64String, "base64");
  const bufString = buffer.toString("hex");

  return hexToDecArray(bufString);
};

// Convert a hex string to decimal array
var hexToDecArray = function (hexString) {
  const size = 2;
  const length = Math.ceil(hexString.length / size);
  const decimalList = new Array(length);

  for (let i = 0, o = 0; i < length; ++i, o += size) {
    decimalList[i] = parseInt(hexString.substr(o, size), 16);
  }

  return decimalList;
};

describe("decode uplink", async () => {
  describe("ping", async () => {
    var input = {
      fPort: 0,
      bytes: [],
    };

    it("format", async () => {
      var output = decodeUplink(input);

      assert.deepStrictEqual(output, {
        data: {
          fPort: 0,
          length: 0,
          hexBytes: "",
          type: "ping",
          decoded: {},
        },
        errors: [],
        warnings: [],
      });
    });
  });

  describe("status report", async () => {
    let input = {
      fPort: 1,
      bytes: [],
    };

    it("format", async () => {
      input.bytes = hexToDecArray(
        "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455"
      );

      var output = decodeUplink(input);

      assert.deepStrictEqual(output, {
        data: {
          fPort: 1,
          length: 28,
          hexBytes: "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455",
          type: "statusReport",
          decoded: {
            errorCode: 0,
            isSensing: true,
            totalVolume: 5342,
            leakState: 2,
            batteryActive: 3608,
            batteryRecovered: 3640,
            waterTemperatureMin: 21.5,
            waterTemperatureMax: 22,
            ambientTemperature: 22.5,
          },
        },
        warnings: [],
        errors: [],
      });
    });

    describe("leak", async () => {
      it("small", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.leakState, 2);
      });

      it("medium", async () => {
        input.bytes = base64ToDecArray(
          "+k2/AQAA6RUPAAbMGQCT5Y4BmAEAAAPo7GZmVw=="
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.leakState, 3);
      });

      it("large", async () => {
        input.bytes = base64ToDecArray(
          "Ao4JAAAA6QEAAAAAAADUjAkAhhcAAATo6D8/Xg=="
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.leakState, 4);
      });
    });

    describe("errors", async () => {
      it("payload to short", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E65354"
        );

        var output = decodeUplink(input);
        assert.deepStrictEqual(output.errors, [
          "Wrong payload length (27), should be 28 bytes",
        ]);
      });

      it("payload to long", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E653545555"
        );

        var output = decodeUplink(input);
        assert.deepStrictEqual(output.errors, [
          "Wrong payload length (29), should be 28 bytes",
        ]);
      });
    });

    describe("warnings", async () => {
      it("no sensing", async () => {
        input.bytes = hexToDecArray(
          "3C1BE40100809520020010392F00000000000000000000E4E986C461"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.isSensing, false);
        assert.strictEqual(output.data.decoded.errorCode, 0);
        assert.deepStrictEqual(output.warnings, ["Not sensing water"]);
      });

      it("no sensing and reverse flow", async () => {
        input.bytes = hexToDecArray(
          "49FBDF018081DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.isSensing, false);
        assert.strictEqual(output.data.decoded.errorCode, 384);
        assert.deepStrictEqual(output.warnings, [
          "Not sensing water",
          "Reverse flow",
        ]);
      });

      it("reverse flow", async () => {
        input.bytes = hexToDecArray(
          "49FBDF018001DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.isSensing, true);
        assert.strictEqual(output.data.decoded.errorCode, 384);
        assert.deepStrictEqual(output.warnings, ["Reverse flow"]);
      });

      it("low battery", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B07020102535455"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.batteryActive, 1808);
        assert.strictEqual(output.data.decoded.batteryRecovered, 1816);
        assert.deepStrictEqual(output.warnings, ["Low battery"]);
      });

      it("contact support", async () => {
        input.bytes = hexToDecArray(
          "49FBDF01E703DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.errorCode, 999);
        assert.deepStrictEqual(output.warnings, ["Contact support, error 999"]);
      });
    });
  });

  describe("response", async () => {
    let input = {
      fPort: 6,
      bytes: [],
    };

    describe("errors", () => {
      it("invalid response status", async () => {
        input.bytes = hexToDecArray(
          "3209021300001602053F0000000000ED5A413DFC449C2B000001000000000001010000000000"
        );

        var output = decodeUplink(input);
        assert.deepStrictEqual(output.errors, ["Invalid response status: 9"]);
      });

      it("invalid response type", async () => {
        input.bytes = hexToDecArray(
          "3200091300001602053F0000000000ED5A413DFC449C2B000001000000000001010000000000"
        );

        var output = decodeUplink(input);
        assert.deepStrictEqual(output.errors, ["Invalid response type: 9"]);
      });
    });

    describe("no report", async () => {
      it("format", async () => {
        input.bytes = base64ToDecArray("ZgAA=");

        var output = decodeUplink(input);

        assert.deepStrictEqual(output, {
          data: {
            fPort: 6,
            length: 3,
            hexBytes: "660000",
            type: "response",
            decoded: { fPort: 102, status: "ok", type: "none", data: {} },
          },
          errors: [],
          warnings: [],
        });
      });

      it("perform lorarwan reset", async () => {
        input.bytes = base64ToDecArray("ZgAA=");

        var output = decodeUplink(input);
        assert.strictEqual(output.data.decoded.type, "none");
        assert.strictEqual(output.data.decoded.fPort, 102);
      });
    });

    describe("status report", async () => {
      it("format", () => {
        input.bytes = base64ToDecArray(
          "NwABn0LXAQAAd4MAAPMAAAAAAAAAAAAAAADh5D4+Og=="
        );

        var output = decodeUplink(input);

        assert.deepStrictEqual(output, {
          data: {
            fPort: 6,
            length: 31,
            hexBytes:
              "3700019F42D701000077830000F3000000000000000000000000E1E43E3E3A",
            type: "response",
            decoded: {
              fPort: 55,
              status: "ok",
              type: "statusReport",
              data: {
                errorCode: 0,
                isSensing: true,
                totalVolume: 33655,
                leakState: 0,
                batteryActive: 3600,
                batteryRecovered: 3624,
                waterTemperatureMin: 11,
                waterTemperatureMax: 11,
                ambientTemperature: 9,
              },
            },
          },
          errors: [],
          warnings: [],
        });
      });

      it("perform volume reset", () => {
        input.bytes = base64ToDecArray(
          "ZQABtl0BAACAAAAAAAAAAAAAAAAAAAAAAAC/u1RXWg=="
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.fPort, 101);
        assert.strictEqual(output.data.decoded.type, "statusReport");
      });
    });

    describe("hardware report", async () => {
      it("format", () => {
        input.bytes = base64ToDecArray(
          "MgACEwAAFgIFPwAAAAAA7VpBPfxEnCsAAAEAAAAAAAEBAAAAAAA="
        );

        var output = decodeUplink(input);

        assert.deepStrictEqual(output, {
          data: {
            fPort: 6,
            length: 38,
            hexBytes:
              "3200021300001602053F0000000000ED5A413DFC449C2B000001000000000001010000000000",
            type: "response",
            decoded: {
              fPort: 50,
              status: "ok",
              type: "hardwareReport",
              data: {
                appState: "metering",
                firmwareVersion: "22.0.19",
                hardwareVersion: 2,
                pipe: {
                  id: 1,
                  type: "Copper 15 mm",
                },
              },
            },
          },
          errors: [],
          warnings: [],
        });
      });

      describe("errors", async () => {
        it("to short", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602053F0000000000ED5A413DFC449C2B0000010000000000010100000000"
          );

          var output = decodeUplink(input);
          assert.deepStrictEqual(output.errors, [
            "Wrong payload length (34), should be 35 bytes",
          ]);
        });

        it("to long", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602053F0000000000ED5A413DFC449C2B00000100000000000101000000000000"
          );

          var output = decodeUplink(input);
          assert.deepStrictEqual(output.errors, [
            "Wrong payload length (36), should be 35 bytes",
          ]);
        });

        it("invalid app state", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602093F0000000000ED5A413DFC449C2B000001000000000001010000000000"
          );

          var output = decodeUplink(input);
          assert.deepStrictEqual(output.errors, ["Invalid app state (9)"]);
        });

        it("invalid pipe index", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602053F0000000000ED5A413DFC449C2B0000010000000000AA010000000000"
          );

          var output = decodeUplink(input);
          assert.deepStrictEqual(output.errors, ["Invalid pipe index (170)"]);
        });
      });

      it("set pipe index", async () => {
        input.bytes = hexToDecArray(
          "0400021000001602053f0100000300e3ddcbb1bd758732000001000000000000010000000000"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.fPort, 4);
        assert.strictEqual(output.data.decoded.type, "hardwareReport");
      });

      it("set app state", async () => {
        input.bytes = hexToDecArray(
          "0400021000001602053f0100000300e3ddcbb1bd758732000001000000000000010000000000"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.fPort, 4);
        assert.strictEqual(output.data.decoded.type, "hardwareReport");
      });
    });

    describe("settings report", async () => {
      it("format", async () => {
        input.bytes = hexToDecArray(
          "13000401c0a80000580200000000001e00008d27000000000000000000000000000000000000000000"
        );

        var output = decodeUplink(input);

        assert.deepStrictEqual(
          {
            data: {
              decoded: {
                data: {
                  lorawanReportInterval: 600,
                },
                fPort: 19,
                status: "ok",
                type: "settingsReport",
              },
              fPort: 6,
              hexBytes:
                "13000401C0A80000580200000000001E00008D27000000000000000000000000000000000000000000",
              length: 41,
              type: "response",
            },
            errors: [],
            warnings: [],
          },
          output
        );
      });

      describe("errors", () => {
        it("to short", async () => {
          input.bytes = hexToDecArray(
            "13000401c0a80000580200000000001e00008d270000000000000000000000000000000000000000"
          );

          var output = decodeUplink(input);
          assert.deepStrictEqual(output.errors, [
            "Wrong payload length (37), should be 38 bytes",
          ]);
        });

        it("to long", async () => {
          input.bytes = hexToDecArray(
            "13000401c0a80000580200000000001e00008d2700000000000000000000000000000000000000000000"
          );

          var output = decodeUplink(input);
          assert.deepStrictEqual(output.errors, [
            "Wrong payload length (39), should be 38 bytes",
          ]);
        });
      });

      it("set lorawan report interval", async () => {
        input.bytes = hexToDecArray(
          "13000401c0a80000580200000000001e00008d27000000000000000000000000000000000000000000"
        );

        var output = decodeUplink(input);

        assert.strictEqual(output.data.decoded.fPort, 19);
        assert.strictEqual(output.data.decoded.type, "settingsReport");
      });
    });
  });
});

describe("normalize uplink", async () => {
  var input = {
    data: {},
  };

  it("ping", async () => {
    input.data.type = "ping";
    var output = normalizeUplink(input);
    assert.deepStrictEqual(output, {});
  });

  it("response", async () => {
    input.data.type = "response";
    var output = normalizeUplink(input);
    assert.deepStrictEqual(output, {});
  });

  describe("status report", async () => {
    var input = {};

    beforeEach(() => {
      input = {
        data: {
          fPort: 1,
          hexBytes: "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455",
          length: 28,
          decoded: {
            ambientTemperature: 22.5,
            batteryActive: 3608,
            batteryRecovered: 3640,
            errorCode: 0,
            isSensing: true,
            leakState: 2,
            totalVolume: 5342,
            waterTemperatureMax: 22,
            waterTemperatureMin: 21.5,
          },
          type: "statusReport",
        },
        errors: [],
        warnings: [],
      };
    });

    it("format", async () => {
      var output = normalizeUplink(input);
      assert.deepStrictEqual(output, {
        data: {
          air: {
            temperature: 22.5,
          },
          battery: 3.64,
          metering: {
            water: {
              total: 5342,
            },
          },
          water: {
            leak: "",
            temperature: {
              max: 22,
              min: 21.5,
            },
          },
        },
        errors: [],
        warnings: [],
      });
    });

    it("warnings", async () => {
      input.warnings = ["warning"];
      var output = normalizeUplink(input);
      assert.deepStrictEqual(output.warnings, input.warnings);
    });

    it("errors", async () => {
      input.errors = ["error"];
      var output = normalizeUplink(input);
      assert.deepStrictEqual(output.errors, input.errors);
    });
  });
});

describe("util", async () => {
  describe("hex to decimal array", async () => {
    it("normal", async () => {
      var output = hexToDecArray(
        "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455"
      );

      assert.deepStrictEqual(
        output,
        [
          73, 251, 223, 1, 0, 0, 222, 20, 0, 0, 0, 0, 0, 0, 70, 237, 223, 1, 6,
          252, 139, 7, 2, 226, 230, 83, 84, 85,
        ]
      );
    });
  });
});
