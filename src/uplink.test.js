import { describe, it, mock } from "node:test";
import assert from "node:assert";
import decodeUplink, { base64ToDecArray, hexToDecArray } from "./uplink.js";

describe("uplink", () => {
  describe("ping", () => {
    var input = {
      fPort: 0,
      bytes: [],
    };

    it("normal", async () => {
      var result = decodeUplink(input);

      assert.deepStrictEqual(result, {
        fPort: 0,
        length: 0,
        hexBytes: "",
        type: "ping",
        payload: {},
      });
    });
  });

  describe("status report", () => {
    let input = {
      fPort: 1,
      bytes: [],
    };

    describe("format", () => {
      it("normal", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var result = decodeUplink(input);

        assert.deepStrictEqual(result, {
          fPort: 1,
          length: 28,
          hexBytes: "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455",
          type: "statusReport",
          payload: {
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
        });
      });

      it("to short", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E65354"
        );

        assert.throws(
          () => decodeUplink(input),
          Error("Wrong payload length (27), should be 28 bytes")
        );
      });

      it("to long", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E653545555"
        );

        assert.throws(
          () => decodeUplink(input),
          Error("Wrong payload length (29), should be 28 bytes")
        );
      });
    });

    describe("leak", () => {
      it("small", async () => {
        input.bytes = hexToDecArray(
          "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.leakState, 2);
      });

      it("medium", async () => {
        input.bytes = base64ToDecArray(
          "+k2/AQAA6RUPAAbMGQCT5Y4BmAEAAAPo7GZmVw=="
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.leakState, 3);
      });

      it("large", async () => {
        input.bytes = base64ToDecArray(
          "Ao4JAAAA6QEAAAAAAADUjAkAhhcAAATo6D8/Xg=="
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.leakState, 4);
      });
    });

    describe("error", () => {
      it("no sensing", async () => {
        input.bytes = hexToDecArray(
          "3C1BE40100809520020010392F00000000000000000000E4E986C461"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.isSensing, false);
        assert.strictEqual(result.payload.errorCode, 0);
      });

      it("no sensing and reverse flow", async () => {
        input.bytes = hexToDecArray(
          "49FBDF018081DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.isSensing, false);
        assert.strictEqual(result.payload.errorCode, 384);
      });

      it("reverse flow", async () => {
        input.bytes = hexToDecArray(
          "49FBDF018001DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.isSensing, true);
        assert.strictEqual(result.payload.errorCode, 384);
      });
    });
  });

  describe("response", () => {
    let input = {
      fPort: 6,
      bytes: [],
    };

    it("invalid response status", async () => {
      input.bytes = hexToDecArray(
        "3209021300001602053F0000000000ED5A413DFC449C2B000001000000000001010000000000"
      );

      assert.throws(
        () => decodeUplink(input),
        Error("Invalid response status: 9")
      );
    });

    it("invalid response type", async () => {
      input.bytes = hexToDecArray(
        "3200091300001602053F0000000000ED5A413DFC449C2B000001000000000001010000000000"
      );

      assert.throws(
        () => decodeUplink(input),
        Error("Invalid response type: 9")
      );
    });

    describe("none", () => {
      it("perform lorarwan reset", () => {
        input.bytes = base64ToDecArray("ZgAA=");

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.type, undefined);
        assert.strictEqual(result.payload.fPort, 102);
      });
    });

    describe("status report", () => {
      it("perform volume reset", () => {
        input.bytes = base64ToDecArray(
          "ZQABtl0BAACAAAAAAAAAAAAAAAAAAAAAAAC/u1RXWg=="
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.fPort, 101);
        assert.strictEqual(result.payload.type, "statusReport");
      });
    });

    describe("hardware report", () => {
      describe("format", () => {
        it("normal", () => {
          input.bytes = base64ToDecArray(
            "MgACEwAAFgIFPwAAAAAA7VpBPfxEnCsAAAEAAAAAAAEBAAAAAAA="
          );

          var result = decodeUplink(input);

          assert.deepStrictEqual(result, {
            fPort: 6,
            length: 38,
            hexBytes:
              "3200021300001602053F0000000000ED5A413DFC449C2B000001000000000001010000000000",
            type: "response",
            payload: {
              fPort: 50,
              status: "ok",
              type: "hardwareReport",
              data: {
                appState: "metering",
                crcFirmware: 1027693293,
                crcParameters: 731661564,
                currentError: 0,
                eventCounter: 0,
                firmwareVersion: "22.0.19",
                hardwareVersion: 2,
                isUssSignal: false,
                pipeId: "copper15",
                ussGain: 63,
              },
            },
          });
        });

        it("to short", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602053F0000000000ED5A413DFC449C2B0000010000000000010100000000"
          );

          assert.throws(
            () => decodeUplink(input),
            Error("Wrong payload length (34), should be 35 bytes")
          );
        });

        it("to long", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602053F0000000000ED5A413DFC449C2B00000100000000000101000000000000"
          );

          assert.throws(
            () => decodeUplink(input),
            Error("Wrong payload length (36), should be 35 bytes")
          );
        });

        it("invalid app state", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602093F0000000000ED5A413DFC449C2B000001000000000001010000000000"
          );

          assert.throws(
            () => decodeUplink(input),
            Error("Invalid app state (9)")
          );
        });

        it("invalid pipe index", async () => {
          input.bytes = hexToDecArray(
            "3200021300001602053F0000000000ED5A413DFC449C2B0000010000000000AA010000000000"
          );

          assert.throws(
            () => decodeUplink(input),
            Error("Invalid pipe index (170)")
          );
        });
      });

      it("set pipe index", () => {
        input.bytes = hexToDecArray(
          "0400021000001602053f0100000300e3ddcbb1bd758732000001000000000000010000000000"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.fPort, 4);
        assert.strictEqual(result.payload.type, "hardwareReport");
      });

      it("set app state", () => {
        input.bytes = hexToDecArray(
          "0400021000001602053f0100000300e3ddcbb1bd758732000001000000000000010000000000"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.fPort, 4);
        assert.strictEqual(result.payload.type, "hardwareReport");
      });
    });

    describe("settings report", () => {
      describe("format", () => {
        it("normal", () => {
          input.bytes = hexToDecArray(
            "13000401c0a80000580200000000001e00008d27000000000000000000000000000000000000000000"
          );

          var result = decodeUplink(input);

          assert.deepStrictEqual(
            {
              payload: {
                data: {
                  lorawanAcknowledgementEnabled: false,
                  lorawanReportInterval: 600,
                  wmBusEnabled: true,
                  wmBusReportInterval: 43200,
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
            result
          );
        });

        it("to short", async () => {
          input.bytes = hexToDecArray(
            "13000401c0a80000580200000000001e00008d270000000000000000000000000000000000000000"
          );

          assert.throws(
            () => decodeUplink(input),
            Error("Wrong payload length (37), should be 38 bytes")
          );
        });

        it("to long", async () => {
          input.bytes = hexToDecArray(
            "13000401c0a80000580200000000001e00008d2700000000000000000000000000000000000000000000"
          );

          assert.throws(
            () => decodeUplink(input),
            Error("Wrong payload length (39), should be 38 bytes")
          );
        });
      });

      it("set lorawan report interval", () => {
        input.bytes = hexToDecArray(
          "13000401c0a80000580200000000001e00008d27000000000000000000000000000000000000000000"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.payload.fPort, 19);
        assert.strictEqual(result.payload.type, "settingsReport");
      });
    });
  });
});

describe("util", () => {
  describe("hex to decimal array", () => {
    it("normal", async () => {
      var result = hexToDecArray(
        "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455"
      );

      assert.deepStrictEqual(
        result,
        [
          73, 251, 223, 1, 0, 0, 222, 20, 0, 0, 0, 0, 0, 0, 70, 237, 223, 1, 6,
          252, 139, 7, 2, 226, 230, 83, 84, 85,
        ]
      );
    });
  });
});
