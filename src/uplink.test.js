import { describe, it } from "node:test";
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
        data: {
          fPort: 0,
          length: 0,
          hexBytes: "",
          type: "ping",
          decoded: {},
        },
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
          data: {
            fPort: 1,
            length: 28,
            hexBytes:
              "49FBDF010000DE1400000000000046EDDF0106FC8B0702E2E6535455",
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

        assert.strictEqual(result.data.decoded.leakState, 2);
      });

      it("medium", async () => {
        input.bytes = base64ToDecArray(
          "+k2/AQAA6RUPAAbMGQCT5Y4BmAEAAAPo7GZmVw=="
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.data.decoded.leakState, 3);
      });

      it.only("large", async () => {
        input.bytes = base64ToDecArray(
          "Ao4JAAAA6QEAAAAAAADUjAkAhhcAAATo6D8/Xg=="
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.data.decoded.leakState, 4);
      });
    });

    describe("error", () => {
      it("no sensing", async () => {
        input.bytes = hexToDecArray(
          "3C1BE40100809520020010392F00000000000000000000E4E986C461"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.data.decoded.isSensing, false);
        assert.strictEqual(result.data.decoded.errorCode, 0);
      });

      it("no sensing and reverse flow", async () => {
        input.bytes = hexToDecArray(
          "49FBDF018081DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.data.decoded.isSensing, false);
        assert.strictEqual(result.data.decoded.errorCode, 384);
      });

      it("reverse flow", async () => {
        input.bytes = hexToDecArray(
          "49FBDF018001DE1400000000000046EDDF0106FC8B0702E2E6535455"
        );

        var result = decodeUplink(input);

        assert.strictEqual(result.data.decoded.isSensing, true);
        assert.strictEqual(result.data.decoded.errorCode, 384);
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
