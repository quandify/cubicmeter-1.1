# CubicMeter 1.1

![PACKSHOT CubicMeter White ISO ver1 0](https://github.com/user-attachments/assets/1830cac6-92f5-4906-88db-6e7eee7ec28e)

<img src="drawing.jpg" alt="drawing" width="200"/>

The CubicMeter 1.1 is a non-invasive water flow meter with leakage detection capabilities that communicates over LoRaWAN.
The product comes in two versions, supporting either copper or plastic pipes.

- CubicMeter 1.1 Copper, CM1.1-C
- CubicMeter 1.1 Plastic, CM1.1-P

https://quandify.com/cubicmeter

## LoRaWAN specifications

- LoRaWAN MAC version: 1.0.2
- Regional parameter version: 1.0.2 RevB
- Supports join: OTAA

## Decoder

### Source
Use the `uplink.js` file in the `src` folder.

### Format
The decoder follows the format defined by the LoRa Alliance ([Payload Decoder API docs](https://resources.lora-alliance.org/technical-specifications/ts013-1-0-0-payload-codec-api)).

### Output
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

### Prettify
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

> [!NOTE]
> If you want to copy the decoder to a javascript runner, remember to remove the `export` block in the bottom of the script.

```
export {
  decodeUplink,
  normalizeUplink,
  base64ToDecArray,
  decArrayToStr,
  hexToDecArray,
};
```

## Uplinks

### Status report
A device will send status reports with periodic intervals.

| FPort | Decription          |
| ----- | ------------------- |
| 1     | Status report       |
| 6     | Respone to downlink |

## Downlinks

### Format
All downlink payloads must use least significant bit (LSB) hexadecimal format.

### Set status report interval
Set the interval for the periodic status report.
> [!IMPORTANT]
> Changing the interval affects the battery life of the device.

| FPort | Payload  | Value | Decription |
| ----- | -------- | ----- | ---------- |
| 19    | 58020000 | 600   | 10 minutes |
| 19    | 100E0000 | 3600  | 60 minutes (default) |
| 19    | 60540000 | 21600 | 6 hours    |
| 19    | C0A80000 | 43200 | 12 hours   |
| 19    | 80510100 | 86400 | 24 hours   |

| Limit | Descripion |
| ----- | ---------- |
| Upper | 30 days    |
| Lower | 10 minutes |

---
### Set pipe index

Change the type of pipe the device is mounted on.

#### Supported pipes

_CubicMeter 1.1 Copper, CM1.1-C_
| FPort | Payload | Value | Type         | Description    |
| ----- | ------- | ----- | ------------ | -------------- |
| 4     | 01      | 1     | Copper 15 mm | Copper         |
| 4     | 02      | 2     | Copper 18 mm | Copper         |
| 4     | 03      | 3     | Copper 22 mm | Copper         |
| 4     | 04      | 4     | Chrome 15 mm | Chromed copper |
| 4     | 05      | 5     | Chrome 18 mm | Chromed copper |

_CubicMeter 1.1 Plastic, CM1.1-P_
| FPort | Payload | Value | Type      | Description           |
| ----- | ------- | ----- | --------- | --------------------- |
| 4     | 07      | 7     | PAL 16 mm | PE-RT/Aluminium/PE-RT |
| 4     | 08      | 8     | PAL 20 mm | PE-RT/Aluminium/PE-RT |
| 4     | 09      | 9     | PAL 25 mm | PE-RT/Aluminium/PE-RT |
| 4     | 0E      | 14    | PEX 16 mm | Plastic, PEX or PE-RT |
| 4     | 0F      | 15    | PEX 20 mm | Plastic, PEX or PE-RT |
| 4     | 10      | 16    | PEX 25 mm | Plastic, PEX or PE-RT |
| 4     | 11      | 17    | Distpipe  | LK Distance pipe 110  |

---

### Set app state

Sets the device into a specific state/mode.

| FPort | Payload | Value | Sate       | Description                               |
| ----- | ------- | ----- | ---------- | ------------------------------------------|
| 2     | 03      | 3     | ready      | Reset device to initial state             |
| 2     | 04      | 4     | pipeSelect | Pipe selection mode                       |
| 2     | 05      | 5     | metering   | Metering mode (without 1h settling time)  |

---

### Perform volume reset

Reset the total volume of the device.

| FPort | Payload | Value |
| ----- | ------- | ----- |
| 101   | 0       | 0     |

---

### Perform lorawan reset

Reset LoRaWAN connection (e.g. for switch network)

| Fport | Payload | Value |
| ----- | ------- | ----- | 
| 102   | 0       | 0     |

---
