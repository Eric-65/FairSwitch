# firmware (ESP32): later prompt

Plan: PlatformIO/Arduino (C++). Port `packages/evaluator/src/netlist.js` (decode + beat) and `keccak.js` 1:1. Both are written with flat arrays and plain loops for this. Flow: fetch `netlist()` once over Wi-Fi → check its keccak256 against the pinned hash → store it in flash → evaluate offline every tick → drive the relay from `RELAY_ON` → set-only `OWNED` in NVS.
