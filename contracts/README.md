# contracts — FairSwitchRegistry (Foundry)

```bash
forge test                                   # unit + fuzz tests (fork tests skip)
XLAYER_RPC=https://rpc.xlayer.tech forge test --match-contract Fork -vv
FS_PROCESSOR=0x.. FS_CIRCUIT_ID=n XLAYER_RPC=... forge test --match-contract Fork   # after tape-out
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC                              # dry run only
```

Unit tests load the real lockout netlist from `../circuit/build/lockout.json` and run it on
`MockProcessor`, a Solidity TAP-02 NAND evaluator, so `status()` is checked against the same bytes that get taped out.

If `forge` cannot download solc (restricted network), fetch `solc-static-linux` v0.8.24 from the
ethereum/solidity GitHub release and pass `--offline --use <path>`.
