# CubicMeter 1.1

<img src="images/cubicmeter-1-1-plastic.png" alt="drawing" width="75"/><img src="images/cubicmeter-1-1-copper.png" alt="drawing" width="75"/>

Clamp-on water flow meter and leak sensor.

The CubicMeter communicates over LoRaWAN.

The product comes in two versions, supporting either plastic or copper pipes.

- CubicMeter 1.1 Plastic (Black)
- CubicMeter 1.1 Copper (White)

https://quandify.com/cubicmeter

## LoRaWAN specifications

- LoRaWAN MAC version: 1.0.2
- Regional parameter version: 1.0.2 RevB
- Supports join: OTAA

## Decoder

The decoder defined in `src/uplink.js` parses the payload of an uplink and converts it into human readible text.

### Format

The format of the decoder complies with the [LoRa Alliance Payload Decoder API](https://resources.lora-alliance.org/technical-specifications/ts013-1-0-0-payload-codec-api).

### Output

Example of a decoded status report.

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

The output can be prettified using the use the `normalizeOutput` function.

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

| FPort | Decription        |
| ----- | ----------------- |
| 1     | Status report     |
| 6     | Downlink response |

## Downlinks

> [!IMPORTANT]
> All downlink payloads must use least significant bit (LSB) hexadecimal format.

---

### Set status report interval

Set the interval for the periodic status reports.

> [!NOTE]
> Changing the interval affects the battery life of the device.

| FPort | Payload  | Value | Decription           |
| ----- | -------- | ----- | -------------------- |
| 19    | 58020000 | 600   | 10 minutes           |
| 19    | 100E0000 | 3600  | 60 minutes (default) |

| Limit | Descripion |
| ----- | ---------- |
| Upper | 60 minutes |
| Lower | 10 minutes |

---

### Set pipe index

Change the type of pipe the device is mounted on.

#### Supported pipes

_CubicMeter 1.1 Copper_
| FPort | Payload | Value | Type | Description |
| ----- | ------- | ----- | ------------ | -------------- |
| 4 | 01 | 1 | Copper 15 mm | Copper |
| 4 | 02 | 2 | Copper 18 mm | Copper |
| 4 | 03 | 3 | Copper 22 mm | Copper |
| 4 | 04 | 4 | Chrome 15 mm | Chromed copper |
| 4 | 05 | 5 | Chrome 18 mm | Chromed copper |

_CubicMeter 1.1 Plastic_
| FPort | Payload | Value | Type | Description |
| ----- | ------- | ----- | --------- | --------------------- |
| 4 | 07 | 7 | PAL 16 mm | PE-RT/Aluminium/PE-RT |
| 4 | 08 | 8 | PAL 20 mm | PE-RT/Aluminium/PE-RT |
| 4 | 09 | 9 | PAL 25 mm | PE-RT/Aluminium/PE-RT |
| 4 | 0E | 14 | PEX 16 mm | Plastic, PEX or PE-RT |
| 4 | 0F | 15 | PEX 20 mm | Plastic, PEX or PE-RT |
| 4 | 10 | 16 | PEX 25 mm | Plastic, PEX or PE-RT |
| 4 | 11 | 17 | Distpipe | LK Distance pipe 110 |

---

### Set app state

Sets the device into a specific state/mode.

| FPort | Payload | Value | Sate       | Description                              |
| ----- | ------- | ----- | ---------- | ---------------------------------------- |
| 2     | 03      | 3     | ready      | Reset device to initial state            |
| 2     | 04      | 4     | pipeSelect | Pipe selection mode                      |
| 2     | 05      | 5     | metering   | Metering mode (without 1h settling time) |

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

## Imlpementations

[The Things Network](https://github.com/TheThingsNetwork/lorawan-devices/tree/master/vendor/quandify)

[Akenza.io](https://github.com/akenza-io/device-type-library/tree/main/types/quandify)
