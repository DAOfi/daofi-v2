/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-waffle"

export default {
  paths: {
    artifacts: "./build",
  },
  solidity: "0.7.4",
  settings: {
    evmVersion: "istanbul",
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  outputType: "all",
  compilerOptions: {
    outputSelection: {
      "*": {
        "*": [
          "evm.bytecode.object",
          "evm.deployedBytecode.object",
          "abi",
          "evm.bytecode.sourceMap",
          "evm.deployedBytecode.sourceMap",
          "metadata"
        ],
        "": ["ast"]
      }
    }
  }
}
