import { ethers } from 'ethers'
import DAOfiV2Factory from '../build/contracts/DAOfiV2Factory.sol/DAOfiV2Factory.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const factory = new ethers.Contract(process.env.FACTORY || '0x839A389790f7A89981b2f98456566583F468d386', DAOfiV2Factory.abi, wallet)
  console.log('Factory:', factory.address)

  const pair = await factory.getPair(
    wallet.address,
    'TNFT',
  )
  console.log('Pair found:', pair)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  });
