import { Contract, ethers } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import DAOfiV2Pair from '../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL ||
      'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const recipient = process.env.OWNER || wallet.address
  const gas = process.env.GAS || '50'
  const proxy =
    process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317' // Default Rinkeby // Mainnet 0xa5409ec958c83c3f309868babaca7c86dcb077c1
  const nonce = await wallet.getTransactionCount()

  console.log('Proxy:', proxy)
  console.log('Recipient:', recipient)
  console.log('Gas:', gas)
  console.log('Nonce:', nonce)

  const pair = await deployContract(
    wallet,
    DAOfiV2Pair,
    [
      'WGD21 NFT',
      'WGD21',
      'ipfs://QmXePXc4BFGsHjQAS3BJvKfgQTdN62x2mQan4aQGUiDXf5/wgd21_metadata/',
      proxy,
      wallet.address,
      367, // tokens
      60000, // start x
      1, // m
      1, // n
      50, // fee
    ],
    {
      gasLimit: 10000000,
      gasPrice: ethers.utils.parseUnits(gas, 'gwei'),
      nonce
    }
  )

  console.log('WGD21 contract:', pair.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
