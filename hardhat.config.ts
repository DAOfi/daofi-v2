/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import "@nomiclabs/hardhat-waffle"

export default {
  networks: {
    hardhat: {
      blockGasLimit: 15e6
    }
  },
  paths: {
    artifacts: "./build",
  },
  solidity: "0.7.6",
  settings: {
    evmVersion: "berlin",
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
