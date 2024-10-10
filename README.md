# CubicMeter 1.1

The non-invasive CubicMeter 1.1 is a flow meter and leakage detector that communicates over LoRaWAN.
The product comes in two versions, supporting either copper or plastic pipes.

- CubicMeter 1.1 Plastic, CM1.1-P
- CubicMeter 1.1 Copper, CM1.1-C

https://quandify.com/cubicmeter

## Decoder

Use the `uplink.js` file in the `src` folder. It follows the format defined in [Payload Decoder API docs](https://resources.lora-alliance.org/technical-specifications/ts013-1-0-0-payload-codec-api).

If you want to copy the decoder to a javascript runner, remember to remove the `export` block in the bottom of the script.

```
export {
  decodeUplink,
  normalizeUplink,
  base64ToDecArray,
  decArrayToStr,
  hexToDecArray,
};
```

The decoder outputs the status report to the following format

```
{
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
}
```

If you wish to prettify the output from the decoder, the `normalizeOutput` function can be used to transform the data.

```
{
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
}
```

## Uplinks

The device send a status report with a period interval.

| Fport | Decription          |
| ----- | ------------------- |
| 1     | Status report       |
| 6     | Respone to downlink |

## Downlinks

All downlink payloads must be in least significant bit (LSB) hexadecimal format.

### Set lorawan status report interval

Change the interval for the periodic status report.

| Fport | Payload  | Value | Decription |
| ----- | -------- | ----- | ---------- |
| 19    | 58020000 | 600   | 10 minutes |
| 19    | 100E0000 | 3600  | 60 minutes |
| 19    | 60540000 | 21600 | 6 hours    |
| 19    | C0A80000 | 43200 | 12 hours   |
| 19    | 80510100 | 86400 | 24 hours   |

> Default setting: 60 minutes

| Limit | Descripion |
| ----- | ---------- |
| Upper | 30 days    |
| Lower | 10 minutes |

Note that lowering the interval affects the battery life of the product.

### Set pipe index

Change pipe type the device is mounted on. This commands has different allowed downlinks depending on device version.

_CubicMeter 1.1 Copper_

| Fport | Payload | Value | Type         | Description    |
| ----- | ------- | ----- | ------------ | -------------- |
| 4     | 01      | 1     | Copper 15 mm | Copper         |
| 4     | 02      | 2     | Copper 18 mm | Copper         |
| 4     | 03      | 3     | Copper 22 mm | Copper         |
| 4     | 04      | 4     | Chrome 15 mm | Chromed copper |
| 4     | 05      | 5     | Chrome 18 mm | Chromed copper |

_CubicMeter 1.1 Plastic_

| Fport | Payload | Value | Type      | Description           |
| ----- | ------- | ----- | --------- | --------------------- |
| 4     | 07      | 7     | PAL 16 mm | PE-RT/Aluminium/PE-RT |
| 4     | 08      | 8     | PAL 20 mm | PE-RT/Aluminium/PE-RT |
| 4     | 09      | 9     | PAL 25 mm | PE-RT/Aluminium/PE-RT |
| 4     | 0E      | 14    | PEX 16 mm | Plastic, PEX or PE-RT |
| 4     | 0F      | 15    | PEX 20 mm | Plastic, PEX or PE-RT |
| 4     | 10      | 16    | PEX 25 mm | Plastic, PEX or PE-RT |
| 4     | 11      | 17    | Distpipe  | LK Distance pipe 110  |

### Set app state

Force the device into a specific state

| Fport | Payload | Value | Sate       | Description                                                 |
| ----- | ------- | ----- | ---------- | ----------------------------------------------------------- |
| 2     | 03      | 3     | ready      | Reset device to initial mode                                |
| 2     | 04      | 4     | pipeSelect | Pipe selection mode                                         |
| 2     | 05      | 5     | metering   | Force device to metering mode and skip the 1h settling time |

### Perform volume reset

Reset the total volume of the device. Can be used

| Fport | Payload | Value | Description            |
| ----- | ------- | ----- | ---------------------- |
| 101   | 0       | 0     | Reset the total volume |

### Perform lorawan reset

To do a LoRaWAN reset or switch network

| Fport | Payload | Value | Description              |
| ----- | ------- | ----- | ------------------------ |
| 102   | 0       | 0     | Reset lorawan connection |

The device will also automatically reset the network after 54 uplinks without any answer. So it will take by default 54 hours to reset if the network is lost.

## LoRaWAN specifications

LoRaWAN MAC version: 1.0.2

Regional parameter version: 1.0.2 RevB

Supports join: OTAA
