import { ethers } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import DAOfiV2Factory from '../build/contracts/DAOfiV2Factory.sol/DAOfiV2Factory.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const factory = await deployContract(
    wallet,
    DAOfiV2Factory,
    [],
    {
      gasLimit: 8000000,
      gasPrice: ethers.utils.parseUnits('200', 'gwei')
    }
  )
  // rinkeby 0x839A389790f7A89981b2f98456566583F468d386
  console.log('Factory deployed at:', factory.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  });
