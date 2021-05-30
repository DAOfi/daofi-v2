import { ethers } from 'ethers'
import DAOfiV2Factory from '../build/contracts/DAOfiV2Factory.sol/DAOfiV2Factory.json'

const sleep = async (time: number) => new Promise((resolve) => setTimeout(resolve, time))

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const factory = new ethers.Contract(
    process.env.FACTORY || '0x839A389790f7A89981b2f98456566583F468d386',
    DAOfiV2Factory.abi,
    wallet
  )
  console.log('Factory:', factory.address)

  const pairTx = await factory.createPair(
    'Test NFT',
    'TNFT',
    'https://api.hodlink.io/4_20_21/',
    process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317',
    wallet.address,
    10, // tokens
    1, // start x
    1, // m
    1, // n
    100, // fee
    {
      gasLimit: 8000000,
      gasPrice: ethers.utils.parseUnits('200', 'gwei'),
    }
  )

  const pair = await pairTx.wait()

  console.log('Pair created:', pair)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
