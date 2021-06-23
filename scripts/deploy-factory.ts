import { ethers } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import DAOfiV2Factory from '../build/contracts/DAOfiV2Factory.sol/DAOfiV2Factory.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://rinkeby.infura.io/v3/0287e4e2fe7648888b843e2462ac67ba'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const factory = await deployContract(wallet, DAOfiV2Factory, [], {
    gasLimit: 8000000,
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
  })
  // rinkeby 0x4e628C710f6a76CF695FB01Dc65dc7DE74D461e9
  console.log('Factory deployed at:', factory.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
