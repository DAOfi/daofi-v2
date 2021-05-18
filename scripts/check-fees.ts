import { ethers } from 'ethers'
import DAOfiV2Pair from '../build/contracts/DAOfiV2Pair.sol/DAOfiV2Pair.json'

const sleep = async (time: number) => new Promise(resolve => setTimeout(resolve, time))

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'https://kovan.poa.network'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const pair = new ethers.Contract(process.env.PAIR || '', DAOfiV2Pair.abi, wallet)
  console.log('Pair:', pair.address)

  const fees = await pair.getPlatformFees()

  await sleep(1000)

  console.log('Fees to. withdraw:', fees)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  });
